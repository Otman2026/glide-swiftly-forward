
ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS customer_id uuid REFERENCES public.customers(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS driver_id uuid REFERENCES public.drivers(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS idx_profiles_customer ON public.profiles(customer_id);
CREATE INDEX IF NOT EXISTS idx_profiles_driver ON public.profiles(driver_id);

CREATE OR REPLACE FUNCTION public.get_user_customer(_user_id uuid)
RETURNS uuid LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT customer_id FROM public.profiles WHERE id = _user_id
$$;

CREATE OR REPLACE FUNCTION public.get_user_driver(_user_id uuid)
RETURNS uuid LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT driver_id FROM public.profiles WHERE id = _user_id
$$;

-- Customer portal
CREATE POLICY "portal_customer_self_read" ON public.customers FOR SELECT TO authenticated
  USING (id = public.get_user_customer(auth.uid()));

CREATE POLICY "portal_orders_read" ON public.transport_orders FOR SELECT TO authenticated
  USING (customer_id = public.get_user_customer(auth.uid()));

CREATE POLICY "portal_shipments_read" ON public.shipments FOR SELECT TO authenticated
  USING (EXISTS (SELECT 1 FROM public.transport_orders o
    WHERE o.id = shipments.order_id AND o.customer_id = public.get_user_customer(auth.uid())));

CREATE POLICY "portal_trips_read" ON public.trips FOR SELECT TO authenticated
  USING (customer_id = public.get_user_customer(auth.uid()));

CREATE POLICY "portal_invoices_read" ON public.invoices FOR SELECT TO authenticated
  USING (customer_id = public.get_user_customer(auth.uid()));

CREATE POLICY "portal_invoice_items_read" ON public.invoice_items FOR SELECT TO authenticated
  USING (EXISTS (SELECT 1 FROM public.invoices i
    WHERE i.id = invoice_items.invoice_id AND i.customer_id = public.get_user_customer(auth.uid())));

CREATE POLICY "portal_orders_insert" ON public.transport_orders FOR INSERT TO authenticated
  WITH CHECK (customer_id = public.get_user_customer(auth.uid())
    AND tenant_id = (SELECT tenant_id FROM public.customers WHERE id = customer_id));

-- Driver
CREATE POLICY "driver_trips_read" ON public.trips FOR SELECT TO authenticated
  USING (driver_id = public.get_user_driver(auth.uid()));

CREATE POLICY "driver_trips_update" ON public.trips FOR UPDATE TO authenticated
  USING (driver_id = public.get_user_driver(auth.uid()))
  WITH CHECK (driver_id = public.get_user_driver(auth.uid()));

CREATE POLICY "driver_shipments_read" ON public.shipments FOR SELECT TO authenticated
  USING (driver_id = public.get_user_driver(auth.uid()));

CREATE POLICY "driver_shipments_update" ON public.shipments FOR UPDATE TO authenticated
  USING (driver_id = public.get_user_driver(auth.uid()))
  WITH CHECK (driver_id = public.get_user_driver(auth.uid()));
