import { createFileRoute } from "@tanstack/react-router";

type NewNotif = {
  tenant_id: string;
  type: string;
  severity: "info" | "warning" | "error" | "success";
  title: string;
  message: string;
  link: string;
};

export const Route = createFileRoute("/api/public/hooks/scan-alerts")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        const auth = request.headers.get("apikey") ?? request.headers.get("authorization")?.replace("Bearer ", "");
        if (!auth || auth !== process.env.SUPABASE_PUBLISHABLE_KEY) {
          return new Response("Unauthorized", { status: 401 });
        }

        const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

        const now = new Date();
        const in30 = new Date(now.getTime() + 30 * 864e5).toISOString();
        const nowIso = now.toISOString();
        const last7 = new Date(now.getTime() - 7 * 864e5).toISOString();

        const [docs, maints, invs, incs, existing] = await Promise.all([
          supabaseAdmin.from("documents").select("tenant_id,name,expiry_date").not("expiry_date", "is", null).lte("expiry_date", in30),
          supabaseAdmin.from("maintenance_records").select("tenant_id,description,next_service_date").not("next_service_date", "is", null).lte("next_service_date", in30),
          supabaseAdmin.from("invoices").select("tenant_id,invoice_number,due_date,total").in("status", ["sent", "draft"]).not("due_date", "is", null).lt("due_date", nowIso),
          supabaseAdmin.from("incidents").select("tenant_id,description,incident_date").gte("incident_date", last7),
          supabaseAdmin.from("notifications").select("tenant_id,type,title").eq("is_read", false),
        ]);

        const alerts: NewNotif[] = [];

        (docs.data ?? []).forEach((d: any) => {
          const expired = new Date(d.expiry_date) < now;
          alerts.push({
            tenant_id: d.tenant_id,
            type: "document_expiry",
            severity: expired ? "error" : "warning",
            title: expired ? `وثيقة منتهية: ${d.name}` : `وثيقة تنتهي قريباً: ${d.name}`,
            message: `تاريخ الانتهاء: ${new Date(d.expiry_date).toLocaleDateString("ar")}`,
            link: "/app/documents",
          });
        });

        (maints.data ?? []).forEach((m: any) => {
          const overdue = new Date(m.next_service_date) < now;
          alerts.push({
            tenant_id: m.tenant_id,
            type: "maintenance_due",
            severity: overdue ? "error" : "warning",
            title: overdue ? "صيانة متأخرة" : "صيانة مستحقة قريباً",
            message: `${m.description ?? "صيانة"} — ${new Date(m.next_service_date).toLocaleDateString("ar")}`,
            link: "/app/maintenance",
          });
        });

        (invs.data ?? []).forEach((i: any) => {
          alerts.push({
            tenant_id: i.tenant_id,
            type: "invoice_overdue",
            severity: "error",
            title: `فاتورة متأخرة: ${i.invoice_number}`,
            message: `المبلغ: ${Number(i.total ?? 0).toFixed(2)} MAD — استحقت في ${new Date(i.due_date).toLocaleDateString("ar")}`,
            link: "/app/invoices",
          });
        });

        (incs.data ?? []).forEach((i: any) => {
          alerts.push({
            tenant_id: i.tenant_id,
            type: "incident_recent",
            severity: "warning",
            title: "حادث جديد مسجّل",
            message: `${i.description ?? "حادث"} — ${new Date(i.incident_date).toLocaleDateString("ar")}`,
            link: "/app/accidents",
          });
        });

        const seen = new Set((existing.data ?? []).map((e: any) => `${e.tenant_id}::${e.type}::${e.title}`));
        const toInsert = alerts.filter((a) => !seen.has(`${a.tenant_id}::${a.type}::${a.title}`));

        if (toInsert.length) {
          const { error } = await supabaseAdmin.from("notifications").insert(toInsert);
          if (error) return Response.json({ error: error.message }, { status: 500 });
        }

        return Response.json({ scanned: alerts.length, inserted: toInsert.length });
      },
    },
  },
});
