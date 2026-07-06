
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_tenant_id UUID;
  v_company_name TEXT;
  v_full_name TEXT;
  v_slug TEXT;
BEGIN
  v_full_name := COALESCE(NEW.raw_user_meta_data ->> 'full_name', NEW.email);
  v_company_name := NULLIF(TRIM(NEW.raw_user_meta_data ->> 'company_name'), '');

  IF v_company_name IS NOT NULL THEN
    v_slug := lower(regexp_replace(v_company_name, '[^a-zA-Z0-9]+', '-', 'g'))
              || '-' || substr(NEW.id::text, 1, 8);

    INSERT INTO public.tenants (name, slug, status, contact_email)
    VALUES (v_company_name, v_slug, 'trial', NEW.email)
    RETURNING id INTO v_tenant_id;

    INSERT INTO public.subscriptions (tenant_id, plan, status, starts_at, ends_at, max_users, max_vehicles)
    VALUES (v_tenant_id, 'trial', 'active', now(), now() + interval '14 days', 5, 10);

    INSERT INTO public.user_roles (user_id, tenant_id, role)
    VALUES (NEW.id, v_tenant_id, 'company_admin');
  END IF;

  INSERT INTO public.profiles (id, email, full_name, tenant_id)
  VALUES (NEW.id, NEW.email, v_full_name, v_tenant_id);

  RETURN NEW;
END;
$$;

-- Recreate trigger (previous migration created it but linter shows none)
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
AFTER INSERT ON auth.users
FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();
