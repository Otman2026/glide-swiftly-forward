
CREATE TYPE public.order_status AS ENUM ('pending', 'confirmed', 'assigned', 'in_transit', 'delivered', 'cancelled');
CREATE TYPE public.shipment_status AS ENUM ('planned', 'loading', 'in_transit', 'delivered', 'cancelled');
CREATE TYPE public.transport_type AS ENUM ('national', 'international', 'own_account', 'third_party');

-- ============================================================
-- TRANSPORT ORDERS
-- ============================================================
CREATE TABLE public.transport_orders (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
  customer_id UUID NOT NULL REFERENCES public.customers(id) ON DELETE RESTRICT,
  contract_id UUID REFERENCES public.contracts(id) ON DELETE SET NULL,
  order_number TEXT NOT NULL,
  transport_type public.transport_type NOT NULL DEFAULT 'national',
  origin TEXT NOT NULL,
  destination TEXT NOT NULL,
  goods_description TEXT,
  weight_tons NUMERIC(10,2),
  pickup_date DATE,
  delivery_date DATE,
  price NUMERIC(14,2),
  currency TEXT DEFAULT 'MAD',
  status public.order_status NOT NULL DEFAULT 'pending',
  notes TEXT,
  created_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.transport_orders TO authenticated;
GRANT ALL ON public.transport_orders TO service_role;
ALTER TABLE public.transport_orders ENABLE ROW LEVEL SECURITY;

CREATE INDEX idx_orders_tenant ON public.transport_orders(tenant_id);
CREATE INDEX idx_orders_customer ON public.transport_orders(customer_id);

CREATE TRIGGER trg_orders_updated_at BEFORE UPDATE ON public.transport_orders
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE POLICY "Tenant view orders" ON public.transport_orders FOR SELECT TO authenticated
USING (tenant_id = public.get_user_tenant(auth.uid()) OR public.is_system_owner(auth.uid()));
CREATE POLICY "Tenant insert orders" ON public.transport_orders FOR INSERT TO authenticated
WITH CHECK (tenant_id = public.get_user_tenant(auth.uid()));
CREATE POLICY "Tenant update orders" ON public.transport_orders FOR UPDATE TO authenticated
USING (tenant_id = public.get_user_tenant(auth.uid()));
CREATE POLICY "Tenant delete orders" ON public.transport_orders FOR DELETE TO authenticated
USING (tenant_id = public.get_user_tenant(auth.uid()));

-- ============================================================
-- SHIPMENTS
-- ============================================================
CREATE TABLE public.shipments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
  order_id UUID REFERENCES public.transport_orders(id) ON DELETE SET NULL,
  vehicle_id UUID REFERENCES public.vehicles(id) ON DELETE SET NULL,
  driver_id UUID REFERENCES public.drivers(id) ON DELETE SET NULL,
  shipment_number TEXT NOT NULL,
  origin TEXT NOT NULL,
  destination TEXT NOT NULL,
  loaded_at TIMESTAMPTZ,
  delivered_at TIMESTAMPTZ,
  distance_km NUMERIC(10,2),
  status public.shipment_status NOT NULL DEFAULT 'planned',
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.shipments TO authenticated;
GRANT ALL ON public.shipments TO service_role;
ALTER TABLE public.shipments ENABLE ROW LEVEL SECURITY;

CREATE INDEX idx_shipments_tenant ON public.shipments(tenant_id);
CREATE INDEX idx_shipments_order ON public.shipments(order_id);

CREATE TRIGGER trg_shipments_updated_at BEFORE UPDATE ON public.shipments
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE POLICY "Tenant view shipments" ON public.shipments FOR SELECT TO authenticated
USING (tenant_id = public.get_user_tenant(auth.uid()) OR public.is_system_owner(auth.uid()));
CREATE POLICY "Tenant insert shipments" ON public.shipments FOR INSERT TO authenticated
WITH CHECK (tenant_id = public.get_user_tenant(auth.uid()));
CREATE POLICY "Tenant update shipments" ON public.shipments FOR UPDATE TO authenticated
USING (tenant_id = public.get_user_tenant(auth.uid()));
CREATE POLICY "Tenant delete shipments" ON public.shipments FOR DELETE TO authenticated
USING (tenant_id = public.get_user_tenant(auth.uid()));
