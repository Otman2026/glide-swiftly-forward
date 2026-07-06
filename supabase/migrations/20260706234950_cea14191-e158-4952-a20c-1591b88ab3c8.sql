
-- ============================================================
-- ENUMS
-- ============================================================
CREATE TYPE public.app_role AS ENUM (
  'system_owner',
  'company_admin',
  'ops_manager',
  'fleet_manager',
  'maintenance',
  'accountant',
  'receptionist',
  'driver'
);

CREATE TYPE public.tenant_status AS ENUM ('trial', 'active', 'suspended', 'cancelled');
CREATE TYPE public.subscription_plan AS ENUM ('trial', 'starter', 'professional', 'enterprise');
CREATE TYPE public.vehicle_status AS ENUM ('available', 'in_use', 'maintenance', 'out_of_service');
CREATE TYPE public.driver_status AS ENUM ('active', 'on_leave', 'inactive');
CREATE TYPE public.contract_status AS ENUM ('draft', 'active', 'expired', 'cancelled');

-- ============================================================
-- UPDATED_AT TRIGGER FUNCTION
-- ============================================================
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER
LANGUAGE plpgsql
SET search_path = public
AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

-- ============================================================
-- TENANTS
-- ============================================================
CREATE TABLE public.tenants (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  slug TEXT UNIQUE NOT NULL,
  logo_url TEXT,
  status public.tenant_status NOT NULL DEFAULT 'trial',
  contact_email TEXT,
  contact_phone TEXT,
  country TEXT,
  city TEXT,
  address TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.tenants TO authenticated;
GRANT ALL ON public.tenants TO service_role;
ALTER TABLE public.tenants ENABLE ROW LEVEL SECURITY;

CREATE TRIGGER trg_tenants_updated_at
BEFORE UPDATE ON public.tenants
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- ============================================================
-- PROFILES (linked to auth.users)
-- ============================================================
CREATE TABLE public.profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  tenant_id UUID REFERENCES public.tenants(id) ON DELETE SET NULL,
  full_name TEXT,
  email TEXT,
  phone TEXT,
  avatar_url TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.profiles TO authenticated;
GRANT ALL ON public.profiles TO service_role;
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

CREATE TRIGGER trg_profiles_updated_at
BEFORE UPDATE ON public.profiles
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- ============================================================
-- USER ROLES (separate table — never on profiles!)
-- ============================================================
CREATE TABLE public.user_roles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  tenant_id UUID REFERENCES public.tenants(id) ON DELETE CASCADE,
  role public.app_role NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (user_id, tenant_id, role)
);

GRANT SELECT ON public.user_roles TO authenticated;
GRANT ALL ON public.user_roles TO service_role;
ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;

-- ============================================================
-- SECURITY DEFINER HELPERS
-- ============================================================
CREATE OR REPLACE FUNCTION public.has_role(_user_id UUID, _role public.app_role)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.user_roles
    WHERE user_id = _user_id AND role = _role
  )
$$;

CREATE OR REPLACE FUNCTION public.is_system_owner(_user_id UUID)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.user_roles
    WHERE user_id = _user_id AND role = 'system_owner'
  )
$$;

CREATE OR REPLACE FUNCTION public.get_user_tenant(_user_id UUID)
RETURNS UUID
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT tenant_id FROM public.profiles WHERE id = _user_id
$$;

CREATE OR REPLACE FUNCTION public.has_tenant_role(_user_id UUID, _tenant_id UUID, _role public.app_role)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.user_roles
    WHERE user_id = _user_id AND tenant_id = _tenant_id AND role = _role
  )
$$;

-- ============================================================
-- RLS POLICIES: tenants
-- ============================================================
CREATE POLICY "System owner can view all tenants"
ON public.tenants FOR SELECT TO authenticated
USING (public.is_system_owner(auth.uid()));

CREATE POLICY "Users can view their own tenant"
ON public.tenants FOR SELECT TO authenticated
USING (id = public.get_user_tenant(auth.uid()));

CREATE POLICY "System owner can insert tenants"
ON public.tenants FOR INSERT TO authenticated
WITH CHECK (public.is_system_owner(auth.uid()));

CREATE POLICY "System owner can update tenants"
ON public.tenants FOR UPDATE TO authenticated
USING (public.is_system_owner(auth.uid()));

CREATE POLICY "Company admin can update own tenant"
ON public.tenants FOR UPDATE TO authenticated
USING (public.has_tenant_role(auth.uid(), id, 'company_admin'));

CREATE POLICY "System owner can delete tenants"
ON public.tenants FOR DELETE TO authenticated
USING (public.is_system_owner(auth.uid()));

-- ============================================================
-- RLS POLICIES: profiles
-- ============================================================
CREATE POLICY "Users can view own profile"
ON public.profiles FOR SELECT TO authenticated
USING (id = auth.uid());

CREATE POLICY "Users can view profiles in same tenant"
ON public.profiles FOR SELECT TO authenticated
USING (tenant_id IS NOT NULL AND tenant_id = public.get_user_tenant(auth.uid()));

CREATE POLICY "System owner can view all profiles"
ON public.profiles FOR SELECT TO authenticated
USING (public.is_system_owner(auth.uid()));

CREATE POLICY "Users can update own profile"
ON public.profiles FOR UPDATE TO authenticated
USING (id = auth.uid());

CREATE POLICY "Users can insert own profile"
ON public.profiles FOR INSERT TO authenticated
WITH CHECK (id = auth.uid());

-- ============================================================
-- RLS POLICIES: user_roles
-- ============================================================
CREATE POLICY "Users can view their own roles"
ON public.user_roles FOR SELECT TO authenticated
USING (user_id = auth.uid());

CREATE POLICY "System owner can view all roles"
ON public.user_roles FOR SELECT TO authenticated
USING (public.is_system_owner(auth.uid()));

CREATE POLICY "Company admin can view tenant roles"
ON public.user_roles FOR SELECT TO authenticated
USING (tenant_id IS NOT NULL AND public.has_tenant_role(auth.uid(), tenant_id, 'company_admin'));

-- ============================================================
-- SUBSCRIPTIONS
-- ============================================================
CREATE TABLE public.subscriptions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
  plan public.subscription_plan NOT NULL DEFAULT 'trial',
  status TEXT NOT NULL DEFAULT 'active',
  starts_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  ends_at TIMESTAMPTZ,
  max_users INT DEFAULT 5,
  max_vehicles INT DEFAULT 10,
  price_monthly NUMERIC(12,2),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.subscriptions TO authenticated;
GRANT ALL ON public.subscriptions TO service_role;
ALTER TABLE public.subscriptions ENABLE ROW LEVEL SECURITY;

CREATE TRIGGER trg_subscriptions_updated_at
BEFORE UPDATE ON public.subscriptions
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE POLICY "System owner manages all subscriptions"
ON public.subscriptions FOR ALL TO authenticated
USING (public.is_system_owner(auth.uid()))
WITH CHECK (public.is_system_owner(auth.uid()));

CREATE POLICY "Tenant users view their subscription"
ON public.subscriptions FOR SELECT TO authenticated
USING (tenant_id = public.get_user_tenant(auth.uid()));

-- ============================================================
-- CUSTOMERS
-- ============================================================
CREATE TABLE public.customers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  type TEXT DEFAULT 'company',
  email TEXT,
  phone TEXT,
  tax_id TEXT,
  address TEXT,
  city TEXT,
  country TEXT,
  notes TEXT,
  created_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.customers TO authenticated;
GRANT ALL ON public.customers TO service_role;
ALTER TABLE public.customers ENABLE ROW LEVEL SECURITY;

CREATE INDEX idx_customers_tenant ON public.customers(tenant_id);

CREATE TRIGGER trg_customers_updated_at
BEFORE UPDATE ON public.customers
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE POLICY "Tenant users view customers"
ON public.customers FOR SELECT TO authenticated
USING (tenant_id = public.get_user_tenant(auth.uid()) OR public.is_system_owner(auth.uid()));

CREATE POLICY "Tenant users insert customers"
ON public.customers FOR INSERT TO authenticated
WITH CHECK (tenant_id = public.get_user_tenant(auth.uid()));

CREATE POLICY "Tenant users update customers"
ON public.customers FOR UPDATE TO authenticated
USING (tenant_id = public.get_user_tenant(auth.uid()));

CREATE POLICY "Tenant users delete customers"
ON public.customers FOR DELETE TO authenticated
USING (tenant_id = public.get_user_tenant(auth.uid()));

-- ============================================================
-- CONTRACTS
-- ============================================================
CREATE TABLE public.contracts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
  customer_id UUID NOT NULL REFERENCES public.customers(id) ON DELETE CASCADE,
  contract_number TEXT NOT NULL,
  title TEXT NOT NULL,
  description TEXT,
  status public.contract_status NOT NULL DEFAULT 'draft',
  start_date DATE,
  end_date DATE,
  value NUMERIC(14,2),
  currency TEXT DEFAULT 'MAD',
  created_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.contracts TO authenticated;
GRANT ALL ON public.contracts TO service_role;
ALTER TABLE public.contracts ENABLE ROW LEVEL SECURITY;

CREATE INDEX idx_contracts_tenant ON public.contracts(tenant_id);
CREATE INDEX idx_contracts_customer ON public.contracts(customer_id);

CREATE TRIGGER trg_contracts_updated_at
BEFORE UPDATE ON public.contracts
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE POLICY "Tenant users view contracts"
ON public.contracts FOR SELECT TO authenticated
USING (tenant_id = public.get_user_tenant(auth.uid()) OR public.is_system_owner(auth.uid()));

CREATE POLICY "Tenant users insert contracts"
ON public.contracts FOR INSERT TO authenticated
WITH CHECK (tenant_id = public.get_user_tenant(auth.uid()));

CREATE POLICY "Tenant users update contracts"
ON public.contracts FOR UPDATE TO authenticated
USING (tenant_id = public.get_user_tenant(auth.uid()));

CREATE POLICY "Tenant users delete contracts"
ON public.contracts FOR DELETE TO authenticated
USING (tenant_id = public.get_user_tenant(auth.uid()));

-- ============================================================
-- VEHICLES
-- ============================================================
CREATE TABLE public.vehicles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
  plate_number TEXT NOT NULL,
  brand TEXT,
  model TEXT,
  year INT,
  vin TEXT,
  type TEXT,
  capacity_tons NUMERIC(8,2),
  status public.vehicle_status NOT NULL DEFAULT 'available',
  insurance_expiry DATE,
  inspection_expiry DATE,
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.vehicles TO authenticated;
GRANT ALL ON public.vehicles TO service_role;
ALTER TABLE public.vehicles ENABLE ROW LEVEL SECURITY;

CREATE INDEX idx_vehicles_tenant ON public.vehicles(tenant_id);

CREATE TRIGGER trg_vehicles_updated_at
BEFORE UPDATE ON public.vehicles
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE POLICY "Tenant users view vehicles"
ON public.vehicles FOR SELECT TO authenticated
USING (tenant_id = public.get_user_tenant(auth.uid()) OR public.is_system_owner(auth.uid()));

CREATE POLICY "Tenant users insert vehicles"
ON public.vehicles FOR INSERT TO authenticated
WITH CHECK (tenant_id = public.get_user_tenant(auth.uid()));

CREATE POLICY "Tenant users update vehicles"
ON public.vehicles FOR UPDATE TO authenticated
USING (tenant_id = public.get_user_tenant(auth.uid()));

CREATE POLICY "Tenant users delete vehicles"
ON public.vehicles FOR DELETE TO authenticated
USING (tenant_id = public.get_user_tenant(auth.uid()));

-- ============================================================
-- DRIVERS
-- ============================================================
CREATE TABLE public.drivers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
  user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  full_name TEXT NOT NULL,
  national_id TEXT,
  license_number TEXT,
  license_expiry DATE,
  phone TEXT,
  email TEXT,
  hire_date DATE,
  status public.driver_status NOT NULL DEFAULT 'active',
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.drivers TO authenticated;
GRANT ALL ON public.drivers TO service_role;
ALTER TABLE public.drivers ENABLE ROW LEVEL SECURITY;

CREATE INDEX idx_drivers_tenant ON public.drivers(tenant_id);

CREATE TRIGGER trg_drivers_updated_at
BEFORE UPDATE ON public.drivers
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE POLICY "Tenant users view drivers"
ON public.drivers FOR SELECT TO authenticated
USING (tenant_id = public.get_user_tenant(auth.uid()) OR public.is_system_owner(auth.uid()));

CREATE POLICY "Tenant users insert drivers"
ON public.drivers FOR INSERT TO authenticated
WITH CHECK (tenant_id = public.get_user_tenant(auth.uid()));

CREATE POLICY "Tenant users update drivers"
ON public.drivers FOR UPDATE TO authenticated
USING (tenant_id = public.get_user_tenant(auth.uid()));

CREATE POLICY "Tenant users delete drivers"
ON public.drivers FOR DELETE TO authenticated
USING (tenant_id = public.get_user_tenant(auth.uid()));

-- ============================================================
-- AUDIT LOG
-- ============================================================
CREATE TABLE public.audit_log (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID REFERENCES public.tenants(id) ON DELETE CASCADE,
  user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  action TEXT NOT NULL,
  entity_type TEXT NOT NULL,
  entity_id UUID,
  old_data JSONB,
  new_data JSONB,
  ip_address TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT ON public.audit_log TO authenticated;
GRANT ALL ON public.audit_log TO service_role;
ALTER TABLE public.audit_log ENABLE ROW LEVEL SECURITY;

CREATE INDEX idx_audit_tenant ON public.audit_log(tenant_id);
CREATE INDEX idx_audit_user ON public.audit_log(user_id);

CREATE POLICY "System owner views all audit"
ON public.audit_log FOR SELECT TO authenticated
USING (public.is_system_owner(auth.uid()));

CREATE POLICY "Company admin views tenant audit"
ON public.audit_log FOR SELECT TO authenticated
USING (tenant_id IS NOT NULL AND public.has_tenant_role(auth.uid(), tenant_id, 'company_admin'));

CREATE POLICY "Authenticated can insert audit"
ON public.audit_log FOR INSERT TO authenticated
WITH CHECK (user_id = auth.uid());

-- ============================================================
-- AUTO-CREATE PROFILE ON SIGNUP
-- ============================================================
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.profiles (id, email, full_name)
  VALUES (
    NEW.id,
    NEW.email,
    COALESCE(NEW.raw_user_meta_data ->> 'full_name', NEW.email)
  );
  RETURN NEW;
END;
$$;

CREATE TRIGGER on_auth_user_created
AFTER INSERT ON auth.users
FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();
