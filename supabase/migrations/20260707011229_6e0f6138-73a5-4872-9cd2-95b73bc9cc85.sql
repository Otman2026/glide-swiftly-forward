CREATE TABLE public.billing_requests (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  tenant_id UUID NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
  requested_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  current_plan public.subscription_plan NOT NULL DEFAULT 'trial',
  requested_plan public.subscription_plan NOT NULL,
  billing_cycle TEXT NOT NULL DEFAULT 'monthly' CHECK (billing_cycle IN ('monthly', 'yearly')),
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'rejected', 'cancelled')),
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.billing_requests TO authenticated;
GRANT ALL ON public.billing_requests TO service_role;

ALTER TABLE public.billing_requests ENABLE ROW LEVEL SECURITY;

CREATE TRIGGER trg_billing_requests_updated_at
BEFORE UPDATE ON public.billing_requests
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE INDEX idx_billing_requests_tenant_created
ON public.billing_requests(tenant_id, created_at DESC);

CREATE INDEX idx_billing_requests_pending
ON public.billing_requests(status, created_at DESC)
WHERE status = 'pending';

CREATE POLICY "system owner manages billing requests"
  ON public.billing_requests FOR ALL TO authenticated
  USING (public.is_system_owner(auth.uid()))
  WITH CHECK (public.is_system_owner(auth.uid()));

CREATE POLICY "tenant members view billing requests"
  ON public.billing_requests FOR SELECT TO authenticated
  USING (
    tenant_id = public.get_user_tenant(auth.uid())
    OR public.is_system_owner(auth.uid())
  );

CREATE POLICY "tenant admins create billing requests"
  ON public.billing_requests FOR INSERT TO authenticated
  WITH CHECK (
    tenant_id = public.get_user_tenant(auth.uid())
    AND (
      public.has_tenant_role(auth.uid(), tenant_id, 'company_admin')
      OR public.is_system_owner(auth.uid())
    )
  );

CREATE POLICY "tenant admins cancel pending billing requests"
  ON public.billing_requests FOR UPDATE TO authenticated
  USING (
    tenant_id = public.get_user_tenant(auth.uid())
    AND status = 'pending'
    AND public.has_tenant_role(auth.uid(), tenant_id, 'company_admin')
  )
  WITH CHECK (
    tenant_id = public.get_user_tenant(auth.uid())
    AND status IN ('pending', 'cancelled')
    AND public.has_tenant_role(auth.uid(), tenant_id, 'company_admin')
  );