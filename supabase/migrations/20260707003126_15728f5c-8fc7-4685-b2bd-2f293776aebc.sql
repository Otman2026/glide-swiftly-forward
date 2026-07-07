
CREATE TABLE public.documents (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
  doc_type TEXT NOT NULL,
  title TEXT NOT NULL,
  file_path TEXT NOT NULL,
  file_size BIGINT,
  mime_type TEXT,
  reference_number TEXT,
  issue_date DATE,
  expiry_date DATE,
  vehicle_id UUID REFERENCES public.vehicles(id) ON DELETE SET NULL,
  driver_id UUID REFERENCES public.drivers(id) ON DELETE SET NULL,
  customer_id UUID REFERENCES public.customers(id) ON DELETE SET NULL,
  trip_id UUID REFERENCES public.trips(id) ON DELETE SET NULL,
  notes TEXT,
  uploaded_by UUID,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.documents TO authenticated;
GRANT ALL ON public.documents TO service_role;
ALTER TABLE public.documents ENABLE ROW LEVEL SECURITY;
CREATE POLICY "tenant read documents" ON public.documents FOR SELECT TO authenticated USING (tenant_id = public.get_user_tenant(auth.uid()));
CREATE POLICY "tenant write documents" ON public.documents FOR ALL TO authenticated USING (tenant_id = public.get_user_tenant(auth.uid())) WITH CHECK (tenant_id = public.get_user_tenant(auth.uid()));
CREATE TRIGGER update_documents_updated_at BEFORE UPDATE ON public.documents FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE INDEX idx_documents_tenant ON public.documents(tenant_id);
CREATE INDEX idx_documents_expiry ON public.documents(expiry_date) WHERE expiry_date IS NOT NULL;

-- Storage RLS: files scoped by tenant_id folder (path format: <tenant_id>/<uuid>-<filename>)
CREATE POLICY "tenant read own documents storage" ON storage.objects FOR SELECT TO authenticated
USING (bucket_id = 'documents' AND (storage.foldername(name))[1]::uuid = public.get_user_tenant(auth.uid()));
CREATE POLICY "tenant upload own documents storage" ON storage.objects FOR INSERT TO authenticated
WITH CHECK (bucket_id = 'documents' AND (storage.foldername(name))[1]::uuid = public.get_user_tenant(auth.uid()));
CREATE POLICY "tenant update own documents storage" ON storage.objects FOR UPDATE TO authenticated
USING (bucket_id = 'documents' AND (storage.foldername(name))[1]::uuid = public.get_user_tenant(auth.uid()));
CREATE POLICY "tenant delete own documents storage" ON storage.objects FOR DELETE TO authenticated
USING (bucket_id = 'documents' AND (storage.foldername(name))[1]::uuid = public.get_user_tenant(auth.uid()));
