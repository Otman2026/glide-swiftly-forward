ALTER TABLE public.subscriptions
  ADD COLUMN IF NOT EXISTS stripe_customer_id TEXT,
  ADD COLUMN IF NOT EXISTS stripe_subscription_id TEXT,
  ADD COLUMN IF NOT EXISTS stripe_price_id TEXT,
  ADD COLUMN IF NOT EXISTS billing_cycle TEXT CHECK (billing_cycle IS NULL OR billing_cycle IN ('monthly', 'yearly')),
  ADD COLUMN IF NOT EXISTS current_period_end TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS cancel_at_period_end BOOLEAN NOT NULL DEFAULT false;

CREATE INDEX IF NOT EXISTS idx_subscriptions_stripe_subscription
ON public.subscriptions(stripe_subscription_id)
WHERE stripe_subscription_id IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_subscriptions_stripe_customer
ON public.subscriptions(stripe_customer_id)
WHERE stripe_customer_id IS NOT NULL;

CREATE TABLE public.stripe_checkout_sessions (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  tenant_id UUID NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
  requested_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  plan public.subscription_plan NOT NULL,
  billing_cycle TEXT NOT NULL CHECK (billing_cycle IN ('monthly', 'yearly')),
  stripe_checkout_session_id TEXT UNIQUE,
  stripe_customer_id TEXT,
  stripe_subscription_id TEXT,
  amount_total BIGINT,
  currency TEXT NOT NULL DEFAULT 'mad',
  status TEXT NOT NULL DEFAULT 'created' CHECK (status IN ('created', 'open', 'completed', 'expired', 'cancelled', 'failed')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT, UPDATE ON public.stripe_checkout_sessions TO authenticated;
GRANT ALL ON public.stripe_checkout_sessions TO service_role;

ALTER TABLE public.stripe_checkout_sessions ENABLE ROW LEVEL SECURITY;

CREATE TRIGGER trg_stripe_checkout_sessions_updated_at
BEFORE UPDATE ON public.stripe_checkout_sessions
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE INDEX idx_stripe_checkout_sessions_tenant_created
ON public.stripe_checkout_sessions(tenant_id, created_at DESC);

CREATE POLICY "system owner manages stripe checkout sessions"
  ON public.stripe_checkout_sessions FOR ALL TO authenticated
  USING (public.is_system_owner(auth.uid()))
  WITH CHECK (public.is_system_owner(auth.uid()));

CREATE POLICY "tenant members view stripe checkout sessions"
  ON public.stripe_checkout_sessions FOR SELECT TO authenticated
  USING (tenant_id = public.get_user_tenant(auth.uid()));

CREATE POLICY "tenant admins create stripe checkout sessions"
  ON public.stripe_checkout_sessions FOR INSERT TO authenticated
  WITH CHECK (
    tenant_id = public.get_user_tenant(auth.uid())
    AND public.has_tenant_role(auth.uid(), tenant_id, 'company_admin')
  );

CREATE TABLE public.stripe_webhook_events (
  id TEXT PRIMARY KEY,
  event_type TEXT NOT NULL,
  processed_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  payload JSONB NOT NULL DEFAULT '{}'::jsonb
);

GRANT ALL ON public.stripe_webhook_events TO service_role;

ALTER TABLE public.stripe_webhook_events ENABLE ROW LEVEL SECURITY;