import { createFileRoute, Link } from "@tanstack/react-router";

export const Route = createFileRoute("/privacy")({
  component: PrivacyPage,
  head: () => ({
    meta: [
      { title: "سياسة الخصوصية — SAIFO TRANSPORT ERP" },
      {
        name: "description",
        content:
          "سياسة الخصوصية لمنصة SAIFO TRANSPORT ERP: كيف نجمع بياناتك ونستخدمها ونحميها.",
      },
      { property: "og:title", content: "سياسة الخصوصية — SAIFO TRANSPORT ERP" },
      { property: "og:url", content: "/privacy" },
    ],
    links: [{ rel: "canonical", href: "/privacy" }],
  }),
});

function PrivacyPage() {
  return (
    <div className="min-h-screen bg-background px-4 py-12" dir="rtl">
      <div className="mx-auto max-w-3xl">
        <Link to="/" className="text-sm text-primary hover:underline">
          ← العودة للرئيسية
        </Link>
        <h1 className="mt-6 text-3xl font-bold text-foreground">سياسة الخصوصية</h1>
        <p className="mt-2 text-sm text-muted-foreground">
          آخر تحديث: {new Date().toLocaleDateString("ar")}
        </p>

        <div className="prose prose-slate mt-8 max-w-none space-y-6 text-foreground">
          <section>
            <h2 className="text-xl font-semibold">1. مقدمة</h2>
            <p>
              يوضح هذا المستند سياسة الخصوصية الخاصة بتطبيق{" "}
              <strong>SAIFO TRANSPORT ERP</strong> وكيفية تعاملنا مع بيانات المستخدمين
              والشركات المشتركة في المنصة.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold">2. البيانات التي نجمعها</h2>
            <ul className="list-disc pr-6 space-y-1">
              <li>بيانات الحساب: الاسم، البريد الإلكتروني، اسم الشركة.</li>
              <li>بيانات التشغيل: العملاء، المركبات، السائقون، الرحلات، الفواتير.</li>
              <li>بيانات الجهاز والاستخدام: نوع المتصفح، عنوان IP لأغراض الأمان.</li>
              <li>بيانات الموقع: فقط عند تفعيل خدمات GPS/التتبع من قبل المستخدم.</li>
            </ul>
          </section>

          <section>
            <h2 className="text-xl font-semibold">3. كيف نستخدم بياناتك</h2>
            <ul className="list-disc pr-6 space-y-1">
              <li>تشغيل خدمات إدارة النقل واللوجستيك.</li>
              <li>حماية الحسابات وكشف الاستخدام غير المشروع.</li>
              <li>تحسين أداء المنصة وإصلاح المشاكل.</li>
              <li>التواصل بشأن التحديثات والاشتراكات.</li>
            </ul>
          </section>

          <section>
            <h2 className="text-xl font-semibold">4. عزل بيانات الشركات (Multi-Tenant)</h2>
            <p>
              كل شركة تمتلك بيئة معزولة تماماً عن بيئات باقي الشركات عبر سياسات أمان
              مستوى الصف (RLS). لا يمكن لأي مستخدم الوصول إلى بيانات شركة أخرى.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold">5. مشاركة البيانات</h2>
            <p>
              لا نبيع بياناتك ولا نشاركها مع أطراف ثالثة إلا:
            </p>
            <ul className="list-disc pr-6 space-y-1">
              <li>مزودو البنية التحتية (استضافة قاعدة البيانات والتخزين).</li>
              <li>مزود الدفع (Stripe) لمعالجة الاشتراكات فقط.</li>
              <li>عند وجود التزام قانوني.</li>
            </ul>
          </section>

          <section>
            <h2 className="text-xl font-semibold">6. الاحتفاظ بالبيانات</h2>
            <p>
              نحتفظ ببياناتك طوال فترة اشتراكك النشط. عند إلغاء الاشتراك يمكنك طلب
              حذف بياناتك خلال 30 يوماً.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold">7. حقوقك</h2>
            <ul className="list-disc pr-6 space-y-1">
              <li>الوصول إلى بياناتك وتصديرها.</li>
              <li>تصحيح البيانات غير الصحيحة.</li>
              <li>طلب حذف حسابك وبياناتك.</li>
              <li>سحب موافقتك في أي وقت.</li>
            </ul>
          </section>

          <section>
            <h2 className="text-xl font-semibold">8. الأمان</h2>
            <p>
              نستخدم التشفير أثناء النقل (HTTPS/TLS) وأثناء التخزين، مع سياسات RLS
              ومراجعات أمنية دورية.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold">9. التواصل معنا</h2>
            <p>
              لأي استفسار بخصوص الخصوصية:{" "}
              <a href="mailto:privacy@saifo-transport.com" className="text-primary hover:underline">
                privacy@saifo-transport.com
              </a>
            </p>
          </section>

          <section>
            <p className="text-sm text-muted-foreground">
              يُدار هذا المستند من قبل SAIFO TRANSPORT وقد يُحدَّث دورياً. الاستخدام
              المستمر للخدمة يعتبر موافقة على النسخة الأحدث.
            </p>
          </section>
        </div>
      </div>
    </div>
  );
}
