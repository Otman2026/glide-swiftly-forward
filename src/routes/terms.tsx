import { createFileRoute, Link } from "@tanstack/react-router";

export const Route = createFileRoute("/terms")({
  component: TermsPage,
  head: () => ({
    meta: [
      { title: "شروط الاستخدام — SAIFO TRANSPORT ERP" },
      {
        name: "description",
        content:
          "شروط استخدام منصة SAIFO TRANSPORT ERP: الاشتراكات، الحقوق، الالتزامات، وسياسات الاستخدام المقبول.",
      },
      { property: "og:title", content: "شروط الاستخدام — SAIFO TRANSPORT ERP" },
      { property: "og:url", content: "/terms" },
    ],
    links: [{ rel: "canonical", href: "/terms" }],
  }),
});

function TermsPage() {
  return (
    <div className="min-h-screen bg-background px-4 py-12" dir="rtl">
      <div className="mx-auto max-w-3xl">
        <Link to="/" className="text-sm text-primary hover:underline">
          ← العودة للرئيسية
        </Link>
        <h1 className="mt-6 text-3xl font-bold text-foreground">شروط الاستخدام</h1>
        <p className="mt-2 text-sm text-muted-foreground">
          آخر تحديث: {new Date().toLocaleDateString("ar")}
        </p>

        <div className="prose prose-slate mt-8 max-w-none space-y-6 text-foreground">
          <section>
            <h2 className="text-xl font-semibold">1. القبول بالشروط</h2>
            <p>
              باستخدامك لمنصة <strong>SAIFO TRANSPORT ERP</strong> فإنك توافق على هذه
              الشروط. إذا كنت لا توافق، يُرجى عدم استخدام الخدمة.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold">2. الحساب والاشتراك</h2>
            <ul className="list-disc pr-6 space-y-1">
              <li>يجب أن تكون البيانات المُقدَّمة عند التسجيل صحيحة وحديثة.</li>
              <li>أنت مسؤول عن الحفاظ على سرية كلمة المرور.</li>
              <li>الحساب الواحد لشركة واحدة، ولا يجوز مشاركته دون تصريح.</li>
              <li>
                الفترة التجريبية 14 يوماً، بعدها يلزم اشتراك نشط لمواصلة الاستخدام.
              </li>
            </ul>
          </section>

          <section>
            <h2 className="text-xl font-semibold">3. الاستخدام المقبول</h2>
            <p>يُمنع منعاً باتاً:</p>
            <ul className="list-disc pr-6 space-y-1">
              <li>محاولة اختراق النظام أو تجاوز صلاحيات الحساب.</li>
              <li>استخدام المنصة لأي نشاط غير قانوني.</li>
              <li>إعادة بيع الخدمة أو الوصول إليها لأطراف ثالثة دون ترخيص.</li>
              <li>رفع محتوى ينتهك حقوق الملكية الفكرية.</li>
              <li>إساءة استخدام واجهات API أو تجاوز الحدود المسموحة.</li>
            </ul>
          </section>

          <section>
            <h2 className="text-xl font-semibold">4. التراخيص والاشتراكات</h2>
            <ul className="list-disc pr-6 space-y-1">
              <li>الرسوم غير قابلة للاسترداد إلا وفق القانون المعمول به.</li>
              <li>يحق لنا تعديل الأسعار مع إشعار مسبق 30 يوماً.</li>
              <li>عند انتهاء الاشتراك يتحول الحساب إلى وضع القراءة فقط.</li>
              <li>مفاتيح التراخيص شخصية وغير قابلة للتحويل.</li>
            </ul>
          </section>

          <section>
            <h2 className="text-xl font-semibold">5. ملكية البيانات</h2>
            <p>
              أنت تحتفظ بالملكية الكاملة لبيانات شركتك. تُمنح المنصة ترخيصاً محدوداً
              لاستضافة ومعالجة هذه البيانات لتقديم الخدمة فقط.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold">6. توفر الخدمة</h2>
            <p>
              نبذل قصارى جهدنا لضمان توفر الخدمة، لكن قد نُجري صيانة مجدولة أو نواجه
              انقطاعات طارئة. لا نضمن توفراً بنسبة 100%.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold">7. إخلاء المسؤولية</h2>
            <p>
              تُقدَّم الخدمة "كما هي". لا نتحمل مسؤولية أي خسائر تجارية غير مباشرة
              ناتجة عن استخدام أو انقطاع الخدمة، بحد أقصى قيمة الاشتراك المدفوعة خلال
              آخر 12 شهراً.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold">8. إنهاء الحساب</h2>
            <p>
              يحق لنا تعليق أو إنهاء أي حساب يخالف هذه الشروط، مع إشعار مسبق ما لم
              يكن هناك خرق أمني جسيم.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold">9. تعديل الشروط</h2>
            <p>
              قد نُحدّث هذه الشروط، والاستخدام المستمر بعد التحديث يُعدّ موافقة على
              النسخة الجديدة.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold">10. التواصل</h2>
            <p>
              لأي استفسار قانوني:{" "}
              <a href="mailto:legal@saifo-transport.com" className="text-primary hover:underline">
                legal@saifo-transport.com
              </a>
            </p>
          </section>
        </div>
      </div>
    </div>
  );
}
