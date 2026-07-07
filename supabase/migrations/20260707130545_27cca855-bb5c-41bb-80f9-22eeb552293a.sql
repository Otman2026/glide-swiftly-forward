
-- 1) archived_at on operational tables
ALTER TABLE public.customers          ADD COLUMN IF NOT EXISTS archived_at TIMESTAMPTZ, ADD COLUMN IF NOT EXISTS archived_reason TEXT;
ALTER TABLE public.vehicles           ADD COLUMN IF NOT EXISTS archived_at TIMESTAMPTZ, ADD COLUMN IF NOT EXISTS archived_reason TEXT;
ALTER TABLE public.drivers            ADD COLUMN IF NOT EXISTS archived_at TIMESTAMPTZ, ADD COLUMN IF NOT EXISTS archived_reason TEXT;
ALTER TABLE public.trips              ADD COLUMN IF NOT EXISTS archived_at TIMESTAMPTZ, ADD COLUMN IF NOT EXISTS archived_reason TEXT;
ALTER TABLE public.shipments          ADD COLUMN IF NOT EXISTS archived_at TIMESTAMPTZ, ADD COLUMN IF NOT EXISTS archived_reason TEXT;
ALTER TABLE public.transport_orders   ADD COLUMN IF NOT EXISTS archived_at TIMESTAMPTZ, ADD COLUMN IF NOT EXISTS archived_reason TEXT;
ALTER TABLE public.invoices           ADD COLUMN IF NOT EXISTS archived_at TIMESTAMPTZ, ADD COLUMN IF NOT EXISTS archived_reason TEXT;
ALTER TABLE public.contracts          ADD COLUMN IF NOT EXISTS archived_at TIMESTAMPTZ, ADD COLUMN IF NOT EXISTS archived_reason TEXT;
ALTER TABLE public.employees          ADD COLUMN IF NOT EXISTS archived_at TIMESTAMPTZ, ADD COLUMN IF NOT EXISTS archived_reason TEXT;
ALTER TABLE public.maintenance_records ADD COLUMN IF NOT EXISTS archived_at TIMESTAMPTZ, ADD COLUMN IF NOT EXISTS archived_reason TEXT;

CREATE INDEX IF NOT EXISTS idx_customers_active        ON public.customers(tenant_id)         WHERE archived_at IS NULL;
CREATE INDEX IF NOT EXISTS idx_vehicles_active         ON public.vehicles(tenant_id)          WHERE archived_at IS NULL;
CREATE INDEX IF NOT EXISTS idx_drivers_active          ON public.drivers(tenant_id)           WHERE archived_at IS NULL;
CREATE INDEX IF NOT EXISTS idx_trips_active            ON public.trips(tenant_id)             WHERE archived_at IS NULL;
CREATE INDEX IF NOT EXISTS idx_shipments_active        ON public.shipments(tenant_id)         WHERE archived_at IS NULL;
CREATE INDEX IF NOT EXISTS idx_transport_orders_active ON public.transport_orders(tenant_id)  WHERE archived_at IS NULL;
CREATE INDEX IF NOT EXISTS idx_invoices_active         ON public.invoices(tenant_id)          WHERE archived_at IS NULL;
CREATE INDEX IF NOT EXISTS idx_contracts_active        ON public.contracts(tenant_id)         WHERE archived_at IS NULL;
CREATE INDEX IF NOT EXISTS idx_employees_active        ON public.employees(tenant_id)         WHERE archived_at IS NULL;

-- 2) gps_devices
CREATE TABLE IF NOT EXISTS public.gps_devices (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
  device_serial TEXT NOT NULL,
  device_model TEXT,
  sim_number TEXT,
  vehicle_id UUID REFERENCES public.vehicles(id) ON DELETE SET NULL,
  status TEXT NOT NULL DEFAULT 'active',
  last_seen_at TIMESTAMPTZ,
  last_latitude NUMERIC,
  last_longitude NUMERIC,
  notes TEXT,
  archived_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (tenant_id, device_serial)
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.gps_devices TO authenticated;
GRANT ALL ON public.gps_devices TO service_role;
ALTER TABLE public.gps_devices ENABLE ROW LEVEL SECURITY;

CREATE POLICY "tenant members can view gps devices" ON public.gps_devices
  FOR SELECT TO authenticated USING (tenant_id = public.get_user_tenant(auth.uid()));
CREATE POLICY "tenant admins manage gps devices" ON public.gps_devices
  FOR ALL TO authenticated
  USING (tenant_id = public.get_user_tenant(auth.uid())
         AND (public.has_tenant_role(auth.uid(), tenant_id, 'company_admin')
              OR public.has_tenant_role(auth.uid(), tenant_id, 'fleet_manager')))
  WITH CHECK (tenant_id = public.get_user_tenant(auth.uid())
         AND (public.has_tenant_role(auth.uid(), tenant_id, 'company_admin')
              OR public.has_tenant_role(auth.uid(), tenant_id, 'fleet_manager')));

CREATE INDEX IF NOT EXISTS idx_gps_devices_tenant  ON public.gps_devices(tenant_id) WHERE archived_at IS NULL;
CREATE INDEX IF NOT EXISTS idx_gps_devices_vehicle ON public.gps_devices(vehicle_id) WHERE vehicle_id IS NOT NULL;

CREATE TRIGGER trg_gps_devices_updated
  BEFORE UPDATE ON public.gps_devices
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- 3) Expiry-notification helper (called by cron or on-demand from a server fn)
CREATE OR REPLACE FUNCTION public.generate_expiry_notifications()
RETURNS INTEGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_count INTEGER := 0;
  r RECORD;
BEGIN
  -- Driver license expiry (30 / 15 / 7 days)
  FOR r IN
    SELECT d.id, d.tenant_id, d.full_name, d.license_expiry,
           (d.license_expiry - CURRENT_DATE) AS days_left
    FROM public.drivers d
    WHERE d.archived_at IS NULL
      AND d.license_expiry IS NOT NULL
      AND (d.license_expiry - CURRENT_DATE) IN (30, 15, 7, 1, 0)
  LOOP
    INSERT INTO public.notifications (tenant_id, title, message, type, entity_type, entity_id)
    SELECT r.tenant_id,
           'انتهاء رخصة سائق',
           'رخصة السائق ' || r.full_name || ' تنتهي خلال ' || r.days_left || ' يوم',
           CASE WHEN r.days_left <= 7 THEN 'error' ELSE 'warning' END,
           'driver', r.id
    WHERE NOT EXISTS (
      SELECT 1 FROM public.notifications n
      WHERE n.entity_type = 'driver' AND n.entity_id = r.id
        AND n.created_at::date = CURRENT_DATE
        AND n.title = 'انتهاء رخصة سائق'
    );
    v_count := v_count + 1;
  END LOOP;

  -- Vehicle insurance
  FOR r IN
    SELECT v.id, v.tenant_id, v.plate_number, v.insurance_expiry,
           (v.insurance_expiry - CURRENT_DATE) AS days_left
    FROM public.vehicles v
    WHERE v.archived_at IS NULL
      AND v.insurance_expiry IS NOT NULL
      AND (v.insurance_expiry - CURRENT_DATE) IN (30, 15, 7, 1, 0)
  LOOP
    INSERT INTO public.notifications (tenant_id, title, message, type, entity_type, entity_id)
    SELECT r.tenant_id,
           'انتهاء تأمين مركبة',
           'تأمين المركبة ' || r.plate_number || ' ينتهي خلال ' || r.days_left || ' يوم',
           CASE WHEN r.days_left <= 7 THEN 'error' ELSE 'warning' END,
           'vehicle', r.id
    WHERE NOT EXISTS (
      SELECT 1 FROM public.notifications n
      WHERE n.entity_type = 'vehicle' AND n.entity_id = r.id
        AND n.created_at::date = CURRENT_DATE
        AND n.title = 'انتهاء تأمين مركبة'
    );
    v_count := v_count + 1;
  END LOOP;

  -- Vehicle inspection
  FOR r IN
    SELECT v.id, v.tenant_id, v.plate_number, v.inspection_expiry,
           (v.inspection_expiry - CURRENT_DATE) AS days_left
    FROM public.vehicles v
    WHERE v.archived_at IS NULL
      AND v.inspection_expiry IS NOT NULL
      AND (v.inspection_expiry - CURRENT_DATE) IN (30, 15, 7, 1, 0)
  LOOP
    INSERT INTO public.notifications (tenant_id, title, message, type, entity_type, entity_id)
    SELECT r.tenant_id,
           'انتهاء فحص مركبة',
           'فحص المركبة ' || r.plate_number || ' ينتهي خلال ' || r.days_left || ' يوم',
           CASE WHEN r.days_left <= 7 THEN 'error' ELSE 'warning' END,
           'vehicle', r.id
    WHERE NOT EXISTS (
      SELECT 1 FROM public.notifications n
      WHERE n.entity_type = 'vehicle' AND n.entity_id = r.id
        AND n.created_at::date = CURRENT_DATE
        AND n.title = 'انتهاء فحص مركبة'
    );
    v_count := v_count + 1;
  END LOOP;

  -- Contract expiry
  FOR r IN
    SELECT c.id, c.tenant_id, c.end_date,
           (c.end_date - CURRENT_DATE) AS days_left
    FROM public.contracts c
    WHERE c.archived_at IS NULL
      AND c.end_date IS NOT NULL
      AND c.status = 'active'
      AND (c.end_date - CURRENT_DATE) IN (30, 15, 7, 1, 0)
  LOOP
    INSERT INTO public.notifications (tenant_id, title, message, type, entity_type, entity_id)
    SELECT r.tenant_id,
           'انتهاء عقد عميل',
           'عقد سينتهي خلال ' || r.days_left || ' يوم',
           CASE WHEN r.days_left <= 7 THEN 'error' ELSE 'warning' END,
           'contract', r.id
    WHERE NOT EXISTS (
      SELECT 1 FROM public.notifications n
      WHERE n.entity_type = 'contract' AND n.entity_id = r.id
        AND n.created_at::date = CURRENT_DATE
        AND n.title = 'انتهاء عقد عميل'
    );
    v_count := v_count + 1;
  END LOOP;

  RETURN v_count;
END;
$$;

REVOKE EXECUTE ON FUNCTION public.generate_expiry_notifications() FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.generate_expiry_notifications() TO authenticated, service_role;

-- 4) Auto-invoice trigger when a trip completes
CREATE OR REPLACE FUNCTION public.auto_invoice_on_trip_complete()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_invoice_number TEXT;
BEGIN
  IF NEW.status = 'completed'
     AND (OLD.status IS DISTINCT FROM 'completed')
     AND NEW.customer_id IS NOT NULL
     AND COALESCE(NEW.revenue, 0) > 0
     AND NOT EXISTS (
       SELECT 1 FROM public.invoices
       WHERE tenant_id = NEW.tenant_id
         AND notes LIKE '%TRIP:' || NEW.id::text || '%'
     )
  THEN
    v_invoice_number := 'INV-' || to_char(now(), 'YYMMDD') || '-' || substr(NEW.id::text, 1, 6);
    INSERT INTO public.invoices (
      tenant_id, customer_id, invoice_number, status,
      subtotal, tax_amount, total_amount, notes, issue_date, due_date
    ) VALUES (
      NEW.tenant_id, NEW.customer_id, v_invoice_number, 'draft',
      NEW.revenue, 0, NEW.revenue,
      'TRIP:' || NEW.id::text || ' — فاتورة تلقائية من الرحلة ' || COALESCE(NEW.trip_number, ''),
      CURRENT_DATE, CURRENT_DATE + INTERVAL '30 days'
    );
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_auto_invoice_on_trip_complete ON public.trips;
CREATE TRIGGER trg_auto_invoice_on_trip_complete
  AFTER UPDATE ON public.trips
  FOR EACH ROW EXECUTE FUNCTION public.auto_invoice_on_trip_complete();
