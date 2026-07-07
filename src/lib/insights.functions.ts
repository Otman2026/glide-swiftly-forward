import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

export const generateInsights = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: { question?: string }) => input)
  .handler(async ({ data, context }) => {
    const { supabase } = context;

    // Aggregate compact summary of the tenant's data
    const [orders, expenses, fuel, maint, incidents, vehicles, customers] = await Promise.all([
      supabase.from("transport_orders").select("total_amount,status,created_at"),
      supabase.from("expenses").select("amount,category"),
      supabase.from("fuel_logs").select("liters,cost"),
      supabase.from("maintenance_records").select("cost"),
      supabase.from("incidents").select("repair_cost"),
      supabase.from("vehicles").select("id,status"),
      supabase.from("customers").select("id"),
    ]);

    const sum = (arr: any[] | null, k: string) => (arr ?? []).reduce((a, b) => a + Number(b[k] ?? 0), 0);
    const summary = {
      orders_total: orders.data?.length ?? 0,
      orders_delivered: orders.data?.filter((o: any) => o.status === "delivered").length ?? 0,
      revenue_mad: sum(orders.data?.filter((o: any) => o.status === "delivered") ?? [], "total_amount"),
      expenses_mad: sum(expenses.data, "amount"),
      fuel_liters: sum(fuel.data, "liters"),
      fuel_cost_mad: sum(fuel.data, "cost"),
      maintenance_cost_mad: sum(maint.data, "cost"),
      incidents_count: incidents.data?.length ?? 0,
      incidents_cost_mad: sum(incidents.data, "repair_cost"),
      vehicles_total: vehicles.data?.length ?? 0,
      vehicles_in_use: vehicles.data?.filter((v: any) => v.status === "in_use").length ?? 0,
      customers_total: customers.data?.length ?? 0,
    };

    const apiKey = process.env.LOVABLE_API_KEY;
    if (!apiKey) throw new Error("LOVABLE_API_KEY not configured");

    const userQ = data.question?.trim() || "قدّم تحليلاً شاملاً لأداء الأسطول وتوصيات عملية للتحسين.";

    const res = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${apiKey}` },
      body: JSON.stringify({
        model: "google/gemini-2.5-flash",
        messages: [
          {
            role: "system",
            content:
              "أنت خبير في إدارة شركات النقل واللوجستيك (SAIFO TRANSPORT ERP). قدّم إجابات بالعربية، موجزة ومنظمة بعناوين ونقاط، مع أرقام محددة عند الإمكان. ركّز على الربحية، استغلال الأسطول، تكلفة/كم، وفرص التوفير.",
          },
          {
            role: "user",
            content: `بيانات الشركة (MAD = درهم مغربي):\n${JSON.stringify(summary, null, 2)}\n\nالسؤال: ${userQ}`,
          },
        ],
      }),
    });

    if (res.status === 429) throw new Error("تم تجاوز حد الاستخدام. حاول لاحقاً.");
    if (res.status === 402) throw new Error("رصيد الذكاء الاصطناعي غير كافٍ.");
    if (!res.ok) throw new Error(`AI error: ${res.status}`);

    const json = await res.json();
    const answer = json?.choices?.[0]?.message?.content ?? "لا توجد نتيجة";
    return { answer, summary };
  });
