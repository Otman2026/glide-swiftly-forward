import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { SignJWT, jwtVerify } from "jose";

const encoder = new TextEncoder();
const getSecret = () => {
  const s = process.env.LICENSE_SIGNING_SECRET;
  if (!s) throw new Error("LICENSE_SIGNING_SECRET غير مُعرَّف");
  return encoder.encode(s);
};

async function signOfflineToken(payload: Record<string, unknown>, expSec: number) {
  return await new SignJWT(payload)
    .setProtectedHeader({ alg: "HS256", typ: "JWT" })
    .setIssuedAt()
    .setIssuer("saifo-erp")
    .setExpirationTime(expSec)
    .sign(getSecret());
}

export const activateLicense = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => d as { license_key: string })
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context;
    const key = data.license_key.trim().toUpperCase();
    if (!key) throw new Error("مفتاح الترخيص مطلوب");

    const { data: profile } = await supabase
      .from("profiles")
      .select("tenant_id")
      .eq("id", userId)
      .maybeSingle();
    const tenantId = profile?.tenant_id;
    if (!tenantId) throw new Error("لا توجد شركة مرتبطة");

    const { data: role } = await supabase
      .from("user_roles")
      .select("role")
      .eq("user_id", userId)
      .eq("tenant_id", tenantId)
      .eq("role", "company_admin")
      .maybeSingle();
    if (!role) throw new Error("مدير الشركة فقط يمكنه تفعيل الترخيص");

    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { data: lic, error } = await supabaseAdmin
      .from("license_keys")
      .select("*")
      .eq("license_key", key)
      .maybeSingle();
    if (error || !lic) throw new Error("مفتاح ترخيص غير صالح");
    if (lic.revoked_at) throw new Error("هذا الترخيص مُلغى");
    if (lic.tenant_id && lic.tenant_id !== tenantId) throw new Error("هذا الترخيص مرتبط بشركة أخرى");
    if (lic.expires_at && new Date(lic.expires_at).getTime() < Date.now())
      throw new Error("انتهت صلاحية هذا الترخيص");

    const now = new Date().toISOString();
    await supabaseAdmin
      .from("license_keys")
      .update({
        tenant_id: tenantId,
        activated_at: lic.activated_at ?? now,
      })
      .eq("id", lic.id);

    await supabaseAdmin
      .from("tenants")
      .update({ status: "active" })
      .eq("id", tenantId);

    const expiresAtMs = lic.expires_at
      ? new Date(lic.expires_at).getTime()
      : Date.now() + 365 * 24 * 3600 * 1000;
    const expSec = Math.floor(expiresAtMs / 1000);

    const offline_token = await signOfflineToken(
      {
        tid: tenantId,
        plan: lic.plan_key,
        max_users: lic.max_users,
        max_vehicles: lic.max_vehicles,
        lic_id: lic.id,
      },
      expSec,
    );

    return {
      ok: true,
      plan_key: lic.plan_key,
      expires_at: lic.expires_at,
      max_users: lic.max_users,
      max_vehicles: lic.max_vehicles,
      offline_token,
    };
  });

export const refreshOfflineToken = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { supabase, userId } = context;
    const { data: profile } = await supabase
      .from("profiles")
      .select("tenant_id")
      .eq("id", userId)
      .maybeSingle();
    const tenantId = profile?.tenant_id;
    if (!tenantId) throw new Error("لا توجد شركة");

    const { data: lic } = await supabase
      .from("license_keys")
      .select("*")
      .eq("tenant_id", tenantId)
      .is("revoked_at", null)
      .order("activated_at", { ascending: false })
      .limit(1)
      .maybeSingle();
    if (!lic) throw new Error("لا يوجد ترخيص فعّال");

    const expiresAtMs = lic.expires_at
      ? new Date(lic.expires_at).getTime()
      : Date.now() + 30 * 24 * 3600 * 1000;
    const offline_token = await signOfflineToken(
      {
        tid: tenantId,
        plan: lic.plan_key,
        max_users: lic.max_users,
        max_vehicles: lic.max_vehicles,
        lic_id: lic.id,
      },
      Math.floor(expiresAtMs / 1000),
    );
    return { offline_token, plan_key: lic.plan_key, expires_at: lic.expires_at };
  });

export const verifyOfflineToken = createServerFn({ method: "POST" })
  .inputValidator((d: unknown) => d as { token: string })
  .handler(async ({ data }) => {
    const { payload } = await jwtVerify(data.token, getSecret(), { issuer: "saifo-erp" });
    return {
      valid: true,
      tid: (payload.tid as string) ?? null,
      plan: (payload.plan as string) ?? null,
      max_users: (payload.max_users as number | null) ?? null,
      max_vehicles: (payload.max_vehicles as number | null) ?? null,
      exp: (payload.exp as number | null) ?? null,
    };
  });


