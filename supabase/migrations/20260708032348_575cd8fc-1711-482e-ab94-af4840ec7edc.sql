
-- 1) Fix storage SELECT policy on tenant-assets to enforce tenant folder
DROP POLICY IF EXISTS "tenant assets read" ON storage.objects;
DROP POLICY IF EXISTS "tenant_assets_read" ON storage.objects;

CREATE POLICY "tenant assets read own tenant"
ON storage.objects FOR SELECT
TO authenticated
USING (
  bucket_id = 'tenant-assets'
  AND (storage.foldername(name))[1] = public.get_user_tenant(auth.uid())::text
);

-- 2) Add write policies to user_roles (currently only SELECT policies exist)
-- Allow system_owner full control, and company_admin to manage roles inside their tenant only.
-- The protect_system_owner() trigger still guards the system_owner role itself.

CREATE POLICY "System owner manages all roles insert"
ON public.user_roles FOR INSERT
TO authenticated
WITH CHECK (
  public.is_system_owner(auth.uid())
  OR (
    tenant_id IS NOT NULL
    AND public.has_tenant_role(auth.uid(), tenant_id, 'company_admin')
    AND role <> 'system_owner'
  )
);

CREATE POLICY "System owner manages all roles update"
ON public.user_roles FOR UPDATE
TO authenticated
USING (
  public.is_system_owner(auth.uid())
  OR (
    tenant_id IS NOT NULL
    AND public.has_tenant_role(auth.uid(), tenant_id, 'company_admin')
    AND role <> 'system_owner'
  )
)
WITH CHECK (
  public.is_system_owner(auth.uid())
  OR (
    tenant_id IS NOT NULL
    AND public.has_tenant_role(auth.uid(), tenant_id, 'company_admin')
    AND role <> 'system_owner'
  )
);

CREATE POLICY "System owner manages all roles delete"
ON public.user_roles FOR DELETE
TO authenticated
USING (
  public.is_system_owner(auth.uid())
  OR (
    tenant_id IS NOT NULL
    AND public.has_tenant_role(auth.uid(), tenant_id, 'company_admin')
    AND role <> 'system_owner'
  )
);
