import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

type NewNotif = {
  tenant_id: string;
  type: string;
  severity: "info" | "warning" | "error" | "success";
  title: string;
  message: string;
  link?: string | null;
};

export const generateAlerts = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { supabase, userId } = context;

    // Get tenant
    const { data: profile } = await supabase
      .from("profiles")
      .select("tenant_id")
      .eq("id", userId)
      .maybeSingle();
    const tenantId = profile?.tenant_id;
    if (!tenantId) return { created: 0 };

    const now = new Date();
    const in30 = new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000).toISOString();
    const nowIso = now.toISOString();

    const alerts: NewNotif[] = [];

    // 1. Documents expiring in <=30 days
    const { data: docs } = await supabase
      .from("documents")
      .select("id,name,expiry_date")
      .not("expiry_date", "is", null)
      .lte("expiry_date", in30);
    (docs ?? []).forEach((d: any) => {
      const expired = new Date(d.expiry_date) < now;
      alerts.push({
        tenant_id: tenantId,
        type: "document_expiry",
        severity: expired ? "error" : "warning",
        title: expired ? `وثيقة منتهية: ${d.name}` : `وثيقة تنتهي قريباً: ${d.name}`,
        message: `تاريخ الانتهاء: ${new Date(d.expiry_date).toLocaleDateString("ar")}`,
        link: "/app/documents",
      });
    });

    // 2. Maintenance due
    const { data: maints } = await supabase
      .from("maintenance_records")
      .select("id,description,next_service_date,vehicle_id")
      .not("next_service_date", "is", null)
      .lte("next_service_date", in30);
    (maints ?? []).forEach((m: any) => {
      const overdue = new Date(m.next_service_date) < now;
      alerts.push({
        tenant_id: tenantId,
        type: "maintenance_due",
        severity: overdue ? "error" : "warning",
        title: overdue ? "صيانة متأخرة" : "صيانة مستحقة قريباً",
        message: `${m.description ?? "صيانة"} — ${new Date(m.next_service_date).toLocaleDateString("ar")}`,
        link: "/app/maintenance",
      });
    });

    // 3. Overdue invoices
    const { data: invs } = await supabase
      .from("invoices")
      .select("id,invoice_number,due_date,total_amount,status")
      .in("status", ["sent", "draft"])
      .not("due_date", "is", null)
      .lt("due_date", nowIso);
    (invs ?? []).forEach((i: any) => {
      alerts.push({
        tenant_id: tenantId,
        type: "invoice_overdue",
        severity: "error",
        title: `فاتورة متأخرة: ${i.invoice_number}`,
        message: `المبلغ: ${Number(i.total_amount ?? 0).toFixed(2)} MAD — استحقت في ${new Date(i.due_date).toLocaleDateString("ar")}`,
        link: "/app/invoices",
      });
    });

    // 4. Recent incidents (last 7 days)
    const last7 = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000).toISOString();
    const { data: incs } = await supabase
      .from("incidents")
      .select("id,description,incident_date")
      .gte("incident_date", last7);
    (incs ?? []).forEach((i: any) => {
      alerts.push({
        tenant_id: tenantId,
        type: "incident_recent",
        severity: "warning",
        title: "حادث جديد مسجّل",
        message: `${i.description ?? "حادث"} — ${new Date(i.incident_date).toLocaleDateString("ar")}`,
        link: "/app/accidents",
      });
    });

    if (!alerts.length) return { created: 0 };

    // Deduplicate: skip if same (type + title) already exists unread
    const { data: existing } = await supabase
      .from("notifications")
      .select("type,title")
      .eq("is_read", false);
    const seen = new Set((existing ?? []).map((e: any) => `${e.type}::${e.title}`));
    const toInsert = alerts.filter((a) => !seen.has(`${a.type}::${a.title}`));
    if (!toInsert.length) return { created: 0 };

    const { error } = await supabase.from("notifications").insert(toInsert);
    if (error) throw new Error(error.message);
    return { created: toInsert.length };
  });
