
-- Archive columns for soft-delete
ALTER TABLE public.vehicles ADD COLUMN IF NOT EXISTS archived_at TIMESTAMPTZ;
ALTER TABLE public.drivers  ADD COLUMN IF NOT EXISTS archived_at TIMESTAMPTZ;

-- Link documents to incidents (for photos/reports)
ALTER TABLE public.documents ADD COLUMN IF NOT EXISTS incident_id UUID REFERENCES public.incidents(id) ON DELETE CASCADE;

-- Violations / traffic fines table
CREATE TABLE IF NOT EXISTS public.violations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
  driver_id UUID REFERENCES public.drivers(id) ON DELETE SET NULL,
  vehicle_id UUID REFERENCES public.vehicles(id) ON DELETE SET NULL,
  violation_date DATE NOT NULL DEFAULT CURRENT_DATE,
  violation_type TEXT NOT NULL,
  location TEXT,
  fine_amount NUMERIC(12,2) NOT NULL DEFAULT 0,
  reference_number TEXT,
  status TEXT NOT NULL DEFAULT 'pending',
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.violations TO authenticated;
GRANT ALL ON public.violations TO service_role;

ALTER TABLE public.violations ENABLE ROW LEVEL SECURITY;

CREATE POLICY "tenant members read violations"
  ON public.violations FOR SELECT TO authenticated
  USING (tenant_id = public.get_user_tenant(auth.uid()));

CREATE POLICY "tenant members insert violations"
  ON public.violations FOR INSERT TO authenticated
  WITH CHECK (tenant_id = public.get_user_tenant(auth.uid()));

CREATE POLICY "tenant members update violations"
  ON public.violations FOR UPDATE TO authenticated
  USING (tenant_id = public.get_user_tenant(auth.uid()));

CREATE POLICY "tenant members delete violations"
  ON public.violations FOR DELETE TO authenticated
  USING (tenant_id = public.get_user_tenant(auth.uid()));

CREATE TRIGGER violations_updated_at
  BEFORE UPDATE ON public.violations
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
