import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

type ChatMsg = { role: "user" | "assistant"; content: string };

const MODULES_CONTEXT = `
وحدات نظام SAIFO TRANSPORT ERP الرئيسية:
- الرئيسية (/app): لوحة قيادة عامة مع مؤشرات سريعة.
- KPI (/app/kpi): مؤشرات الأداء الرئيسية.
- التقارير (/app/reports): تقارير قابلة للتصدير PDF/Excel.
- تحليلات AI (/app/insights): تحليل ذكي للأداء.
- الإشعارات (/app/notifications): تنبيهات النظام.
- العملاء (/app/customers) والعقود (/app/contracts): إدارة CRM.
- أوامر النقل (/app/orders)، دورة الطلب (/app/pipeline)، الشحنات (/app/shipments)، الرحلات (/app/trips).
- التتبع الحي GPS (/app/tracking) وأجهزة GPS (/app/gps).
- المركبات (/app/vehicles)، السائقون (/app/drivers)، الوقود (/app/fuel)، الصيانة (/app/maintenance)، الحوادث (/app/accidents)، المخالفات (/app/violations).
- المستودعات (/app/warehouses)، المخزون (/app/inventory)، الوثائق (/app/documents).
- الفواتير (/app/invoices)، المالية (/app/finance)، مراكز التكلفة (/app/cost-centers)، الاشتراكات (/app/billing).
- الموارد البشرية (/app/hr): الموظفون والرواتب.
- الإعدادات (/app/settings)، المستخدمون (/app/users)، الأدوار (/app/roles)، التراخيص (/app/license)، سجل التدقيق (/app/audit)، الأرشيف (/app/archive).
- إدارة النظام (/app/system-owner): مالك النظام فقط.

تعليمات عامة:
- كل صفحة تحوي أزرار إضافة/تعديل/حذف حسب الصلاحيات.
- الفواتير ترتبط بأوامر النقل والعقود.
- الرحلات ترتبط بالسائقين والمركبات والأوامر.
- التتبع GPS يتطلب ربط جهاز في /app/gps.
`;

export const askHelp = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: { messages: ChatMsg[] }) => input)
  .handler(async ({ data }) => {
    const apiKey = process.env.LOVABLE_API_KEY;
    if (!apiKey) throw new Error("LOVABLE_API_KEY غير مهيأ");

    const res = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${apiKey}` },
      body: JSON.stringify({
        model: "google/gemini-2.5-flash",
        messages: [
          {
            role: "system",
            content:
              "أنت مساعد مستخدمي تطبيق SAIFO TRANSPORT ERP. أجب بالعربية بشكل موجز وواضح مع خطوات مرقّمة عند الحاجة. اشرح كيفية استخدام الوحدات ووظائف التطبيق فقط. إذا كان السؤال خارج نطاق التطبيق، أرشد المستخدم بلطف لطرح سؤال متعلق بالتطبيق.\n\n" +
              MODULES_CONTEXT,
          },
          ...data.messages,
        ],
      }),
    });

    if (res.status === 429) throw new Error("تم تجاوز حد الاستخدام. حاول لاحقاً.");
    if (res.status === 402) throw new Error("رصيد الذكاء الاصطناعي غير كافٍ.");
    if (!res.ok) throw new Error(`AI error: ${res.status}`);

    const json = await res.json();
    const answer = json?.choices?.[0]?.message?.content ?? "لا توجد نتيجة";
    return { answer };
  });
