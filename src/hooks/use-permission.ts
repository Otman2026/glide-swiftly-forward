import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";

type Level = "none" | "read" | "write" | "full";
const RANK: Record<Level, number> = { none: 0, read: 1, write: 2, full: 3 };

type Row = { role: string; module: string; level: Level };

let cache: {
  tenantId: string | null;
  isCompanyAdmin: boolean;
  rowsByModule: Map<string, Level>;
} | null = null;
let loading: Promise<void> | null = null;

async function loadPermissions() {
  if (loading) return loading;
  loading = (async () => {
    const { data: userData } = await supabase.auth.getUser();
    const uid = userData.user?.id;
    if (!uid) {
      cache = { tenantId: null, isCompanyAdmin: false, rowsByModule: new Map() };
      return;
    }
    const [{ data: profile }, { data: roles }] = await Promise.all([
      supabase.from("profiles").select("tenant_id").eq("id", uid).maybeSingle(),
      supabase.from("user_roles").select("role,tenant_id").eq("user_id", uid),
    ]);
    const tenantId = profile?.tenant_id ?? null;
    const isCompanyAdmin = (roles ?? []).some(
      (r: any) => r.tenant_id === tenantId && r.role === "company_admin",
    );
    const myRoles = new Set((roles ?? []).filter((r: any) => r.tenant_id === tenantId).map((r: any) => r.role));
    const map = new Map<string, Level>();
    if (tenantId && myRoles.size) {
      const { data } = await supabase
        .from("tenant_role_permissions")
        .select("role,module,level")
        .eq("tenant_id", tenantId);
      (data ?? []).forEach((r: any) => {
        if (!myRoles.has(r.role)) return;
        const lvl = r.level as Level;
        const cur = map.get(r.module) ?? "none";
        if (RANK[lvl] > RANK[cur]) map.set(r.module, lvl);
      });

    }
    cache = { tenantId, isCompanyAdmin, rowsByModule: map };
  })();
  await loading;
  loading = null;
}

export function invalidatePermissionsCache() {
  cache = null;
}

export function usePermission(module: string, required: Level = "read") {
  const [ready, setReady] = useState(!!cache);
  useEffect(() => {
    if (!cache) loadPermissions().then(() => setReady(true));
  }, []);
  if (!ready || !cache) return { loading: true, allowed: false };
  if (cache.isCompanyAdmin) return { loading: false, allowed: true };
  const lvl = cache.rowsByModule.get(module) ?? "none";
  return { loading: false, allowed: RANK[lvl] >= RANK[required] };
}
