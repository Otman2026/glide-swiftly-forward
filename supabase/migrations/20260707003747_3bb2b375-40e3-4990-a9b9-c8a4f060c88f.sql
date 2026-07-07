
CREATE TABLE public.invoices (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  tenant_id uuid NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
  invoice_number text NOT NULL,
  customer_id uuid REFERENCES public.customers(id) ON DELETE SET NULL,
  transport_order_id uuid REFERENCES public.transport_orders(id) ON DELETE SET NULL,
  issue_date date NOT NULL DEFAULT CURRENT_DATE,
  due_date date,
  status text NOT NULL DEFAULT 'draft',
  subtotal numeric(14,2) NOT NULL DEFAULT 0,
  tax_rate numeric(5,2) NOT NULL DEFAULT 19,
  tax_amount numeric(14,2) NOT NULL DEFAULT 0,
  total numeric(14,2) NOT NULL DEFAULT 0,
  paid_amount numeric(14,2) NOT NULL DEFAULT 0,
  notes text,
  created_by uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(tenant_id, invoice_number)
);

CREATE TABLE public.invoice_items (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  invoice_id uuid NOT NULL REFERENCES public.invoices(id) ON DELETE CASCADE,
  description text NOT NULL,
  quantity numeric(12,2) NOT NULL DEFAULT 1,
  unit_price numeric(14,2) NOT NULL DEFAULT 0,
  amount numeric(14,2) NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.invoices TO authenticated;
GRANT ALL ON public.invoices TO service_role;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.invoice_items TO authenticated;
GRANT ALL ON public.invoice_items TO service_role;

ALTER TABLE public.invoices ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.invoice_items ENABLE ROW LEVEL SECURITY;

CREATE POLICY "invoices_tenant_select" ON public.invoices FOR SELECT TO authenticated
  USING (tenant_id = public.get_user_tenant(auth.uid()) OR public.is_system_owner(auth.uid()));
CREATE POLICY "invoices_tenant_insert" ON public.invoices FOR INSERT TO authenticated
  WITH CHECK (tenant_id = public.get_user_tenant(auth.uid()));
CREATE POLICY "invoices_tenant_update" ON public.invoices FOR UPDATE TO authenticated
  USING (tenant_id = public.get_user_tenant(auth.uid()))
  WITH CHECK (tenant_id = public.get_user_tenant(auth.uid()));
CREATE POLICY "invoices_tenant_delete" ON public.invoices FOR DELETE TO authenticated
  USING (
    tenant_id = public.get_user_tenant(auth.uid())
    AND (
      public.has_tenant_role(auth.uid(), tenant_id, 'company_admin')
      OR public.has_tenant_role(auth.uid(), tenant_id, 'accountant')
      OR public.is_system_owner(auth.uid())
    )
  );

CREATE POLICY "invoice_items_select" ON public.invoice_items FOR SELECT TO authenticated
  USING (EXISTS (SELECT 1 FROM public.invoices i WHERE i.id = invoice_id
    AND (i.tenant_id = public.get_user_tenant(auth.uid()) OR public.is_system_owner(auth.uid()))));
CREATE POLICY "invoice_items_insert" ON public.invoice_items FOR INSERT TO authenticated
  WITH CHECK (EXISTS (SELECT 1 FROM public.invoices i WHERE i.id = invoice_id
    AND i.tenant_id = public.get_user_tenant(auth.uid())));
CREATE POLICY "invoice_items_update" ON public.invoice_items FOR UPDATE TO authenticated
  USING (EXISTS (SELECT 1 FROM public.invoices i WHERE i.id = invoice_id
    AND i.tenant_id = public.get_user_tenant(auth.uid())));
CREATE POLICY "invoice_items_delete" ON public.invoice_items FOR DELETE TO authenticated
  USING (EXISTS (SELECT 1 FROM public.invoices i WHERE i.id = invoice_id
    AND i.tenant_id = public.get_user_tenant(auth.uid())));

CREATE TRIGGER update_invoices_updated_at BEFORE UPDATE ON public.invoices
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE INDEX idx_invoices_tenant ON public.invoices(tenant_id);
CREATE INDEX idx_invoices_customer ON public.invoices(customer_id);
CREATE INDEX idx_invoice_items_invoice ON public.invoice_items(invoice_id);
