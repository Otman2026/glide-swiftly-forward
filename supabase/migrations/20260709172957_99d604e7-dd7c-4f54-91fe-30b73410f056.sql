
ALTER TABLE public.gps_devices
  ADD COLUMN IF NOT EXISTS traccar_device_id TEXT;

CREATE INDEX IF NOT EXISTS idx_gps_devices_traccar
  ON public.gps_devices(tenant_id, traccar_device_id)
  WHERE traccar_device_id IS NOT NULL;

CREATE TABLE IF NOT EXISTS public.traccar_configs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL UNIQUE REFERENCES public.tenants(id) ON DELETE CASCADE,
  base_url TEXT NOT NULL,
  username TEXT,
  password TEXT,
  enabled BOOLEAN NOT NULL DEFAULT true,
  last_sync_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.traccar_configs TO authenticated;
GRANT ALL ON public.traccar_configs TO service_role;

ALTER TABLE public.traccar_configs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "tenant members view traccar config" ON public.traccar_configs
  FOR SELECT TO authenticated
  USING (tenant_id = public.get_user_tenant(auth.uid()));

CREATE POLICY "tenant admins manage traccar config" ON public.traccar_configs
  FOR ALL TO authenticated
  USING (tenant_id = public.get_user_tenant(auth.uid())
         AND (public.has_tenant_role(auth.uid(), tenant_id, 'company_admin')
              OR public.has_tenant_role(auth.uid(), tenant_id, 'fleet_manager')))
  WITH CHECK (tenant_id = public.get_user_tenant(auth.uid())
         AND (public.has_tenant_role(auth.uid(), tenant_id, 'company_admin')
              OR public.has_tenant_role(auth.uid(), tenant_id, 'fleet_manager')));

CREATE TRIGGER trg_traccar_configs_updated
  BEFORE UPDATE ON public.traccar_configs
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
