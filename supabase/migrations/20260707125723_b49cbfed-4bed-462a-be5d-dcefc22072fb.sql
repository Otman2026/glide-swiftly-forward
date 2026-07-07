
ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS disabled_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS disabled_reason TEXT;

CREATE INDEX IF NOT EXISTS idx_profiles_disabled ON public.profiles(disabled_at) WHERE disabled_at IS NOT NULL;

CREATE OR REPLACE FUNCTION public.is_user_active(_user_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path = public
AS $$
  SELECT COALESCE(
    (SELECT disabled_at IS NULL FROM public.profiles WHERE id = _user_id),
    false
  )
$$;

REVOKE EXECUTE ON FUNCTION public.is_user_active(uuid) FROM anon, PUBLIC;
GRANT EXECUTE ON FUNCTION public.is_user_active(uuid) TO authenticated;

-- سياسة: مدير الشركة يستطيع تعديل ملفات أعضاء شركته (لتعطيل/تفعيل)
DROP POLICY IF EXISTS "Company admin manages tenant profiles" ON public.profiles;
CREATE POLICY "Company admin manages tenant profiles"
  ON public.profiles
  FOR UPDATE
  TO authenticated
  USING (
    tenant_id IS NOT NULL
    AND public.has_tenant_role(auth.uid(), tenant_id, 'company_admin'::app_role)
  )
  WITH CHECK (
    tenant_id IS NOT NULL
    AND public.has_tenant_role(auth.uid(), tenant_id, 'company_admin'::app_role)
  );
