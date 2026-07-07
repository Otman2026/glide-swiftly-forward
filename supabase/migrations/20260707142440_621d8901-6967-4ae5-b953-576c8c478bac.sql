
-- 1. Add cost_center_id to fuel & maintenance
ALTER TABLE public.fuel_logs ADD COLUMN IF NOT EXISTS cost_center_id UUID REFERENCES public.cost_centers(id) ON DELETE SET NULL;
ALTER TABLE public.maintenance_records ADD COLUMN IF NOT EXISTS cost_center_id UUID REFERENCES public.cost_centers(id) ON DELETE SET NULL;

-- 2. Auto-number contracts
CREATE OR REPLACE FUNCTION public.set_contract_number()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE n INT;
BEGIN
  IF NEW.contract_number IS NULL OR NEW.contract_number = '' THEN
    SELECT COUNT(*) + 1 INTO n FROM public.contracts
      WHERE tenant_id = NEW.tenant_id AND date_part('year', created_at) = date_part('year', now());
    NEW.contract_number := 'CTR-' || to_char(now(), 'YYYY') || '-' || lpad(n::text, 4, '0');
  END IF;
  RETURN NEW;
END; $$;
DROP TRIGGER IF EXISTS trg_contract_number ON public.contracts;
CREATE TRIGGER trg_contract_number BEFORE INSERT ON public.contracts
  FOR EACH ROW EXECUTE FUNCTION public.set_contract_number();

-- 3. Auto-number transport_orders
CREATE OR REPLACE FUNCTION public.set_order_number()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE n INT;
BEGIN
  IF NEW.order_number IS NULL OR NEW.order_number = '' THEN
    SELECT COUNT(*) + 1 INTO n FROM public.transport_orders
      WHERE tenant_id = NEW.tenant_id AND date_part('year', created_at) = date_part('year', now());
    NEW.order_number := 'ORD-' || to_char(now(), 'YYYY') || '-' || lpad(n::text, 4, '0');
  END IF;
  RETURN NEW;
END; $$;
DROP TRIGGER IF EXISTS trg_order_number ON public.transport_orders;
CREATE TRIGGER trg_order_number BEFORE INSERT ON public.transport_orders
  FOR EACH ROW EXECUTE FUNCTION public.set_order_number();

-- 4. Auto-number trips
CREATE OR REPLACE FUNCTION public.set_trip_number()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE n INT;
BEGIN
  IF NEW.trip_number IS NULL OR NEW.trip_number = '' THEN
    SELECT COUNT(*) + 1 INTO n FROM public.trips
      WHERE tenant_id = NEW.tenant_id AND created_at::date = CURRENT_DATE;
    NEW.trip_number := 'TRP-' || to_char(now(), 'YYYYMMDD') || '-' || lpad(n::text, 3, '0');
  END IF;
  RETURN NEW;
END; $$;
DROP TRIGGER IF EXISTS trg_trip_number ON public.trips;
CREATE TRIGGER trg_trip_number BEFORE INSERT ON public.trips
  FOR EACH ROW EXECUTE FUNCTION public.set_trip_number();

-- 5. Inherit cost_center from vehicle
CREATE OR REPLACE FUNCTION public.inherit_cost_center_from_vehicle()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF NEW.cost_center_id IS NULL AND NEW.vehicle_id IS NOT NULL THEN
    SELECT cost_center_id INTO NEW.cost_center_id FROM public.vehicles WHERE id = NEW.vehicle_id;
  END IF;
  RETURN NEW;
END; $$;

DROP TRIGGER IF EXISTS trg_expenses_cc ON public.expenses;
CREATE TRIGGER trg_expenses_cc BEFORE INSERT ON public.expenses
  FOR EACH ROW EXECUTE FUNCTION public.inherit_cost_center_from_vehicle();

DROP TRIGGER IF EXISTS trg_fuel_cc ON public.fuel_logs;
CREATE TRIGGER trg_fuel_cc BEFORE INSERT ON public.fuel_logs
  FOR EACH ROW EXECUTE FUNCTION public.inherit_cost_center_from_vehicle();

DROP TRIGGER IF EXISTS trg_maint_cc ON public.maintenance_records;
CREATE TRIGGER trg_maint_cc BEFORE INSERT ON public.maintenance_records
  FOR EACH ROW EXECUTE FUNCTION public.inherit_cost_center_from_vehicle();

DROP TRIGGER IF EXISTS trg_trips_cc ON public.trips;
CREATE TRIGGER trg_trips_cc BEFORE INSERT ON public.trips
  FOR EACH ROW EXECUTE FUNCTION public.inherit_cost_center_from_vehicle();

-- 6. Generic audit trigger
CREATE OR REPLACE FUNCTION public.audit_row_change()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  v_tenant UUID;
  v_id UUID;
BEGIN
  IF TG_OP = 'DELETE' THEN
    v_tenant := (row_to_json(OLD)::jsonb ->> 'tenant_id')::uuid;
    v_id := (row_to_json(OLD)::jsonb ->> 'id')::uuid;
    INSERT INTO public.audit_log (tenant_id, user_id, action, entity_type, entity_id, old_data)
      VALUES (v_tenant, auth.uid(), 'DELETE', TG_TABLE_NAME, v_id, row_to_json(OLD)::jsonb);
    RETURN OLD;
  ELSIF TG_OP = 'UPDATE' THEN
    v_tenant := (row_to_json(NEW)::jsonb ->> 'tenant_id')::uuid;
    v_id := (row_to_json(NEW)::jsonb ->> 'id')::uuid;
    INSERT INTO public.audit_log (tenant_id, user_id, action, entity_type, entity_id, old_data, new_data)
      VALUES (v_tenant, auth.uid(), 'UPDATE', TG_TABLE_NAME, v_id, row_to_json(OLD)::jsonb, row_to_json(NEW)::jsonb);
    RETURN NEW;
  ELSE
    v_tenant := (row_to_json(NEW)::jsonb ->> 'tenant_id')::uuid;
    v_id := (row_to_json(NEW)::jsonb ->> 'id')::uuid;
    INSERT INTO public.audit_log (tenant_id, user_id, action, entity_type, entity_id, new_data)
      VALUES (v_tenant, auth.uid(), 'INSERT', TG_TABLE_NAME, v_id, row_to_json(NEW)::jsonb);
    RETURN NEW;
  END IF;
END; $$;

DO $$
DECLARE t TEXT; tables TEXT[] := ARRAY['customers','contracts','invoices','invoice_items','expenses','cost_centers','user_roles','tenants'];
BEGIN
  FOREACH t IN ARRAY tables LOOP
    EXECUTE format('DROP TRIGGER IF EXISTS trg_audit_%1$s ON public.%1$s', t);
    EXECUTE format('CREATE TRIGGER trg_audit_%1$s AFTER INSERT OR UPDATE OR DELETE ON public.%1$s FOR EACH ROW EXECUTE FUNCTION public.audit_row_change()', t);
  END LOOP;
END $$;

-- 7. Schedule daily expiry alerts
DO $$
BEGIN
  PERFORM cron.unschedule('daily-expiry-alerts');
EXCEPTION WHEN OTHERS THEN NULL;
END $$;

SELECT cron.schedule(
  'daily-expiry-alerts',
  '0 6 * * *',
  $$ SELECT public.generate_expiry_notifications(); $$
);
