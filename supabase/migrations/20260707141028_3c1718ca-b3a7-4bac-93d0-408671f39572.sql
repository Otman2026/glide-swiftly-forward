
DROP POLICY IF EXISTS "tenant assets read"   ON storage.objects;
DROP POLICY IF EXISTS "tenant assets insert" ON storage.objects;
DROP POLICY IF EXISTS "tenant assets update" ON storage.objects;
DROP POLICY IF EXISTS "tenant assets delete" ON storage.objects;

CREATE POLICY "tenant assets read"
  ON storage.objects FOR SELECT TO authenticated
  USING (bucket_id = 'tenant-assets');

CREATE POLICY "tenant assets insert"
  ON storage.objects FOR INSERT TO authenticated
  WITH CHECK (
    bucket_id = 'tenant-assets'
    AND (storage.foldername(name))[1] = (
      SELECT tenant_id::text FROM public.profiles WHERE id = auth.uid()
    )
  );

CREATE POLICY "tenant assets update"
  ON storage.objects FOR UPDATE TO authenticated
  USING (
    bucket_id = 'tenant-assets'
    AND (storage.foldername(name))[1] = (
      SELECT tenant_id::text FROM public.profiles WHERE id = auth.uid()
    )
  );

CREATE POLICY "tenant assets delete"
  ON storage.objects FOR DELETE TO authenticated
  USING (
    bucket_id = 'tenant-assets'
    AND (storage.foldername(name))[1] = (
      SELECT tenant_id::text FROM public.profiles WHERE id = auth.uid()
    )
  );
