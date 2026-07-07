
CREATE TABLE public.notifications (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  tenant_id UUID NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  type TEXT NOT NULL,
  severity TEXT NOT NULL DEFAULT 'info',
  title TEXT NOT NULL,
  message TEXT,
  link TEXT,
  is_read BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.notifications TO authenticated;
GRANT ALL ON public.notifications TO service_role;

ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;

CREATE POLICY "tenant members can view their notifications"
  ON public.notifications FOR SELECT TO authenticated
  USING (
    tenant_id = public.get_user_tenant(auth.uid())
    AND (user_id IS NULL OR user_id = auth.uid())
  );

CREATE POLICY "tenant members can insert notifications"
  ON public.notifications FOR INSERT TO authenticated
  WITH CHECK (tenant_id = public.get_user_tenant(auth.uid()));

CREATE POLICY "tenant members can mark read"
  ON public.notifications FOR UPDATE TO authenticated
  USING (
    tenant_id = public.get_user_tenant(auth.uid())
    AND (user_id IS NULL OR user_id = auth.uid())
  );

CREATE POLICY "tenant admins can delete notifications"
  ON public.notifications FOR DELETE TO authenticated
  USING (
    tenant_id = public.get_user_tenant(auth.uid())
    AND (user_id IS NULL OR user_id = auth.uid())
  );

CREATE INDEX idx_notifications_tenant_created ON public.notifications(tenant_id, created_at DESC);
CREATE INDEX idx_notifications_user_unread ON public.notifications(user_id, is_read) WHERE is_read = false;
