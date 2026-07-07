
CREATE EXTENSION IF NOT EXISTS pgcrypto;

-- ================= 1) PLANS =================
CREATE TABLE IF NOT EXISTS public.plans (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  key TEXT UNIQUE NOT NULL,
  name TEXT NOT NULL,
  price_monthly NUMERIC(12,2),
  price_yearly NUMERIC(12,2),
  max_users INTEGER,
  max_vehicles INTEGER,
  features JSONB NOT NULL DEFAULT '[]'::jsonb,
  is_active BOOLEAN NOT NULL DEFAULT true,
  sort_order INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT ON public.plans TO anon, authenticated;
GRANT INSERT, UPDATE, DELETE ON public.plans TO authenticated;
GRANT ALL ON public.plans TO service_role;
ALTER TABLE public.plans ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "plans_read_all" ON public.plans;
CREATE POLICY "plans_read_all" ON public.plans FOR SELECT USING (true);
DROP POLICY IF EXISTS "plans_write_owner" ON public.plans;
CREATE POLICY "plans_write_owner" ON public.plans FOR ALL TO authenticated
  USING (public.is_system_owner(auth.uid()))
  WITH CHECK (public.is_system_owner(auth.uid()));

DROP TRIGGER IF EXISTS plans_updated_at ON public.plans;
CREATE TRIGGER plans_updated_at BEFORE UPDATE ON public.plans
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

INSERT INTO public.plans (key, name, price_monthly, price_yearly, max_users, max_vehicles, features, sort_order) VALUES
('trial', 'Trial', 0, 0, 5, 10, '["CRM + TMS","إدارة الأسطول","فواتير أساسية"]'::jsonb, 1),
('starter', 'Starter', 490, 4900, 10, 20, '["كل أدوات التجربة","تنبيهات الوثائق","تقارير تشغيلية"]'::jsonb, 2),
('professional', 'Professional', 990, 9900, 35, 80, '["التتبع الحي","تحليلات ذكية","أتمتة التنبيهات"]'::jsonb, 3),
('enterprise', 'Enterprise', NULL, NULL, NULL, NULL, '["حدود مخصصة","صلاحيات متقدمة","دعم مخصص"]'::jsonb, 4)
ON CONFLICT (key) DO NOTHING;

-- ================= 2) LICENSE KEYS =================
CREATE TABLE IF NOT EXISTS public.license_keys (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  license_key TEXT UNIQUE NOT NULL,
  tenant_id UUID REFERENCES public.tenants(id) ON DELETE SET NULL,
  plan_key TEXT NOT NULL REFERENCES public.plans(key),
  max_users INTEGER,
  max_vehicles INTEGER,
  issued_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  expires_at TIMESTAMPTZ,
  activated_at TIMESTAMPTZ,
  revoked_at TIMESTAMPTZ,
  revoked_reason TEXT,
  notes TEXT,
  issued_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.license_keys TO authenticated;
GRANT ALL ON public.license_keys TO service_role;
ALTER TABLE public.license_keys ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "license_keys_owner_all" ON public.license_keys;
CREATE POLICY "license_keys_owner_all" ON public.license_keys FOR ALL TO authenticated
  USING (public.is_system_owner(auth.uid()))
  WITH CHECK (public.is_system_owner(auth.uid()));
DROP POLICY IF EXISTS "license_keys_tenant_read" ON public.license_keys;
CREATE POLICY "license_keys_tenant_read" ON public.license_keys FOR SELECT TO authenticated
  USING (tenant_id IS NOT NULL AND tenant_id = public.get_user_tenant(auth.uid()));

DROP TRIGGER IF EXISTS license_keys_updated_at ON public.license_keys;
CREATE TRIGGER license_keys_updated_at BEFORE UPDATE ON public.license_keys
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE OR REPLACE FUNCTION public.gen_license_key()
RETURNS TEXT LANGUAGE plpgsql AS $$
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
END; $$;

CREATE OR REPLACE FUNCTION public.set_license_key()
RETURNS TRIGGER LANGUAGE plpgsql SET search_path = public AS $$
BEGIN
  IF NEW.license_key IS NULL OR NEW.license_key = '' THEN
    LOOP
      NEW.license_key := public.gen_license_key();
      EXIT WHEN NOT EXISTS (SELECT 1 FROM public.license_keys WHERE license_key = NEW.license_key);
    END LOOP;
  END IF;
  RETURN NEW;
END; $$;

DROP TRIGGER IF EXISTS trg_set_license_key ON public.license_keys;
CREATE TRIGGER trg_set_license_key BEFORE INSERT ON public.license_keys
  FOR EACH ROW EXECUTE FUNCTION public.set_license_key();

-- ================= 3) USERNAME =================
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS username TEXT;
CREATE UNIQUE INDEX IF NOT EXISTS uq_profiles_username ON public.profiles (lower(username)) WHERE username IS NOT NULL;

-- ================= 4) PROTECT SYSTEM OWNER =================
CREATE OR REPLACE FUNCTION public.protect_system_owner()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  owner_email TEXT := 'otnaj.2017@gmail.com';
  owner_uid UUID;
BEGIN
  SELECT id INTO owner_uid FROM auth.users WHERE lower(email) = owner_email LIMIT 1;

  IF TG_OP = 'INSERT' AND NEW.role = 'system_owner' THEN
    IF owner_uid IS NULL OR NEW.user_id <> owner_uid THEN
      RAISE EXCEPTION 'دور مالك النظام محجوز ولا يمكن إسناده لأي مستخدم آخر';
    END IF;
    RETURN NEW;
  ELSIF TG_OP = 'UPDATE' THEN
    IF OLD.role = 'system_owner' OR NEW.role = 'system_owner' THEN
      RAISE EXCEPTION 'دور مالك النظام غير قابل للتعديل';
    END IF;
    RETURN NEW;
  ELSIF TG_OP = 'DELETE' AND OLD.role = 'system_owner' THEN
    RAISE EXCEPTION 'دور مالك النظام غير قابل للحذف';
  END IF;

  IF TG_OP = 'DELETE' THEN RETURN OLD; END IF;
  RETURN NEW;
END; $$;

DROP TRIGGER IF EXISTS trg_protect_system_owner ON public.user_roles;
CREATE TRIGGER trg_protect_system_owner
  BEFORE INSERT OR UPDATE OR DELETE ON public.user_roles
  FOR EACH ROW EXECUTE FUNCTION public.protect_system_owner();

-- ================= 5) SEED SYSTEM OWNER ACCOUNT =================
DO $$
DECLARE
  owner_uid UUID;
  owner_email TEXT := 'otnaj.2017@gmail.com';
BEGIN
  SELECT id INTO owner_uid FROM auth.users WHERE lower(email) = owner_email LIMIT 1;

  IF owner_uid IS NULL THEN
    owner_uid := gen_random_uuid();
    INSERT INTO auth.users (
      id, instance_id, aud, role, email, encrypted_password,
      email_confirmed_at, raw_app_meta_data, raw_user_meta_data,
      created_at, updated_at,
      confirmation_token, email_change, email_change_token_new, recovery_token
    ) VALUES (
      owner_uid, '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated',
      owner_email, crypt('SaifoOwner2026!', gen_salt('bf')),
      now(), '{"provider":"email","providers":["email"]}'::jsonb,
      '{"full_name":"SAIFO TRANSPORT System Owner"}'::jsonb,
      now(), now(), '', '', '', ''
    );
    INSERT INTO auth.identities (
      id, user_id, identity_data, provider, provider_id,
      last_sign_in_at, created_at, updated_at
    ) VALUES (
      gen_random_uuid(), owner_uid,
      jsonb_build_object('sub', owner_uid::text, 'email', owner_email),
      'email', owner_uid::text, now(), now(), now()
    );
  END IF;

  INSERT INTO public.profiles (id, email, full_name, username)
  VALUES (owner_uid, owner_email, 'SAIFO TRANSPORT System Owner', 'system_owner')
  ON CONFLICT (id) DO UPDATE
    SET username = COALESCE(public.profiles.username, 'system_owner'),
        full_name = COALESCE(public.profiles.full_name, 'SAIFO TRANSPORT System Owner');

  INSERT INTO public.user_roles (user_id, tenant_id, role)
  VALUES (owner_uid, NULL, 'system_owner')
  ON CONFLICT DO NOTHING;
END $$;

-- ================= 6) UPDATE handle_new_user to accept username =================
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  v_tenant_id UUID;
  v_company_name TEXT;
  v_full_name TEXT;
  v_username TEXT;
  v_slug TEXT;
BEGIN
  v_full_name := COALESCE(NEW.raw_user_meta_data ->> 'full_name', NEW.email);
  v_company_name := NULLIF(TRIM(NEW.raw_user_meta_data ->> 'company_name'), '');
  v_username := NULLIF(TRIM(NEW.raw_user_meta_data ->> 'username'), '');

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

  INSERT INTO public.profiles (id, email, full_name, tenant_id, username)
  VALUES (NEW.id, NEW.email, v_full_name, v_tenant_id, v_username)
  ON CONFLICT (id) DO NOTHING;

  RETURN NEW;
END; $$;
