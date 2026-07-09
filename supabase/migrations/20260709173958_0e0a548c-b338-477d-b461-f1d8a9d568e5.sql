
CREATE TABLE IF NOT EXISTS public.tenant_role_permissions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
  role public.app_role NOT NULL,
  module TEXT NOT NULL,
  level TEXT NOT NULL DEFAULT 'none' CHECK (level IN ('none','read','write','full')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (tenant_id, role, module)
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.tenant_role_permissions TO authenticated;
GRANT ALL ON public.tenant_role_permissions TO service_role;

ALTER TABLE public.tenant_role_permissions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "members view role permissions" ON public.tenant_role_permissions
  FOR SELECT TO authenticated
  USING (tenant_id = public.get_user_tenant(auth.uid()));

CREATE POLICY "company_admin manages role permissions" ON public.tenant_role_permissions
  FOR ALL TO authenticated
  USING (tenant_id = public.get_user_tenant(auth.uid())
         AND public.has_tenant_role(auth.uid(), tenant_id, 'company_admin'))
  WITH CHECK (tenant_id = public.get_user_tenant(auth.uid())
         AND public.has_tenant_role(auth.uid(), tenant_id, 'company_admin'));

CREATE TRIGGER trg_tenant_role_permissions_updated
  BEFORE UPDATE ON public.tenant_role_permissions
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE INDEX IF NOT EXISTS idx_trp_lookup ON public.tenant_role_permissions(tenant_id, role, module);

-- Helper function: does the current user have >= required level on a module in their tenant?
CREATE OR REPLACE FUNCTION public.has_module_permission(
  _user_id UUID,
  _module TEXT,
  _required TEXT DEFAULT 'read'
)
RETURNS BOOLEAN
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path = public
AS $$
  WITH ranks AS (
    SELECT 'none'::text  AS lvl, 0 AS rnk UNION ALL
    SELECT 'read',  1 UNION ALL
    SELECT 'write', 2 UNION ALL
    SELECT 'full',  3
  ),
  my_tenant AS (
    SELECT public.get_user_tenant(_user_id) AS tid
  ),
  my_roles AS (
    SELECT ur.role
      FROM public.user_roles ur, my_tenant t
     WHERE ur.user_id = _user_id AND ur.tenant_id = t.tid
  ),
  eff AS (
    SELECT COALESCE(MAX(r.rnk), 0) AS max_rnk
      FROM public.tenant_role_permissions p, my_tenant t, ranks r
     WHERE p.tenant_id = t.tid
       AND p.module = _module
       AND p.role IN (SELECT role FROM my_roles)
       AND r.lvl = p.level
  )
  SELECT EXISTS (
    SELECT 1 FROM my_roles WHERE role = 'company_admin'
  )
  OR (SELECT max_rnk FROM eff) >= (SELECT rnk FROM ranks WHERE lvl = _required);
$$;

REVOKE ALL ON FUNCTION public.has_module_permission(UUID, TEXT, TEXT) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.has_module_permission(UUID, TEXT, TEXT) TO authenticated, service_role;
