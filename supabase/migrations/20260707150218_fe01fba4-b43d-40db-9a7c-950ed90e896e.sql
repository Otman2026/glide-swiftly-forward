
-- 1) Fix gen_license_key: set search_path
CREATE OR REPLACE FUNCTION public.gen_license_key()
RETURNS text
LANGUAGE plpgsql
SET search_path = public
AS $function$
DECLARE
  chars TEXT := 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  seg TEXT; result TEXT := 'SAIFO'; i INT; j INT;
BEGIN
  FOR i IN 1..4 LOOP
    seg := '';
    FOR j IN 1..4 LOOP
      seg := seg || substr(chars, 1 + floor(random() * length(chars))::int, 1);
    END LOOP;
    result := result || '-' || seg;
  END LOOP;
  RETURN result;
END; $function$;

-- 2) Revoke public/anon EXECUTE on trigger-only SECURITY DEFINER functions
REVOKE EXECUTE ON FUNCTION public.audit_row_change() FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.auto_invoice_on_trip_complete() FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.handle_new_user() FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.inherit_cost_center_from_vehicle() FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.protect_system_owner() FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.set_contract_number() FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.set_order_number() FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.set_trip_number() FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.set_license_key() FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.update_updated_at_column() FROM PUBLIC, anon, authenticated;

-- 3) Restrict privileged functions to authenticated only (remove anon)
REVOKE EXECUTE ON FUNCTION public.next_invoice_number(uuid) FROM PUBLIC, anon;
REVOKE EXECUTE ON FUNCTION public.generate_expiry_notifications() FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.gen_license_key() FROM PUBLIC, anon, authenticated;

-- 4) Helper role functions: keep executable by authenticated (needed for RLS), revoke anon
REVOKE EXECUTE ON FUNCTION public.has_role(uuid, app_role) FROM PUBLIC, anon;
REVOKE EXECUTE ON FUNCTION public.has_tenant_role(uuid, uuid, app_role) FROM PUBLIC, anon;
REVOKE EXECUTE ON FUNCTION public.is_system_owner(uuid) FROM PUBLIC, anon;
REVOKE EXECUTE ON FUNCTION public.is_user_active(uuid) FROM PUBLIC, anon;
REVOKE EXECUTE ON FUNCTION public.get_user_tenant(uuid) FROM PUBLIC, anon;
REVOKE EXECUTE ON FUNCTION public.get_user_customer(uuid) FROM PUBLIC, anon;
REVOKE EXECUTE ON FUNCTION public.get_user_driver(uuid) FROM PUBLIC, anon;

-- 5) stripe_webhook_events: explicit deny-all policy (only service_role via BYPASSRLS writes)
REVOKE ALL ON public.stripe_webhook_events FROM PUBLIC, anon, authenticated;
GRANT ALL ON public.stripe_webhook_events TO service_role;
CREATE POLICY "Deny all access to webhook events"
  ON public.stripe_webhook_events
  FOR ALL
  TO anon, authenticated
  USING (false)
  WITH CHECK (false);
