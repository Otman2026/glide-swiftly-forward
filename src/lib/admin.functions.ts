import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

// Send password recovery email to a user in the same tenant
export const sendPasswordReset = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data: { targetUserId: string }) => data)
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context;

    // Caller must be company_admin in the same tenant as target
    const { data: me } = await supabase
      .from("profiles")
      .select("tenant_id")
      .eq("id", userId)
      .maybeSingle();
    if (!me?.tenant_id) throw new Error("لا توجد شركة");

    const { data: isAdmin } = await supabase.rpc("has_tenant_role", {
      _user_id: userId,
      _tenant_id: me.tenant_id,
      _role: "company_admin",
    });
    if (!isAdmin) throw new Error("غير مصرح");

    const { data: target } = await supabase
      .from("profiles")
      .select("id,email,tenant_id")
      .eq("id", data.targetUserId)
      .maybeSingle();
    if (!target || target.tenant_id !== me.tenant_id)
      throw new Error("المستخدم غير موجود في شركتك");
    if (!target.email) throw new Error("لا يوجد بريد للمستخدم");

    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { error } = await supabaseAdmin.auth.admin.generateLink({
      type: "recovery",
      email: target.email,
    });
    if (error) throw new Error(error.message);

    return { ok: true, email: target.email };
  });

// Manually trigger expiry-notification scan for this tenant
export const runExpiryScan = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { data, error } = await context.supabase.rpc(
      "generate_expiry_notifications",
    );
    if (error) throw new Error(error.message);
    return { created: (data as number) ?? 0 };
  });
