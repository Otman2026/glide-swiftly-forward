
-- Warehouses table
CREATE TABLE public.warehouses (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  code TEXT,
  address TEXT,
  city TEXT,
  country TEXT DEFAULT 'MA',
  capacity_m3 NUMERIC,
  manager_name TEXT,
  phone TEXT,
  status TEXT NOT NULL DEFAULT 'active',
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.warehouses TO authenticated;
GRANT ALL ON public.warehouses TO service_role;
ALTER TABLE public.warehouses ENABLE ROW LEVEL SECURITY;
CREATE POLICY "tenant read warehouses" ON public.warehouses FOR SELECT TO authenticated USING (tenant_id = public.get_user_tenant(auth.uid()));
CREATE POLICY "tenant write warehouses" ON public.warehouses FOR ALL TO authenticated USING (tenant_id = public.get_user_tenant(auth.uid())) WITH CHECK (tenant_id = public.get_user_tenant(auth.uid()));
CREATE TRIGGER update_warehouses_updated_at BEFORE UPDATE ON public.warehouses FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Trips table
CREATE TABLE public.trips (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
  trip_number TEXT NOT NULL,
  vehicle_id UUID REFERENCES public.vehicles(id) ON DELETE SET NULL,
  driver_id UUID REFERENCES public.drivers(id) ON DELETE SET NULL,
  customer_id UUID REFERENCES public.customers(id) ON DELETE SET NULL,
  origin TEXT,
  destination TEXT,
  distance_km NUMERIC,
  start_date TIMESTAMPTZ,
  end_date TIMESTAMPTZ,
  revenue NUMERIC DEFAULT 0,
  cost NUMERIC DEFAULT 0,
  status TEXT NOT NULL DEFAULT 'planned',
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.trips TO authenticated;
GRANT ALL ON public.trips TO service_role;
ALTER TABLE public.trips ENABLE ROW LEVEL SECURITY;
CREATE POLICY "tenant read trips" ON public.trips FOR SELECT TO authenticated USING (tenant_id = public.get_user_tenant(auth.uid()));
CREATE POLICY "tenant write trips" ON public.trips FOR ALL TO authenticated USING (tenant_id = public.get_user_tenant(auth.uid())) WITH CHECK (tenant_id = public.get_user_tenant(auth.uid()));
CREATE TRIGGER update_trips_updated_at BEFORE UPDATE ON public.trips FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
