import { createFileRoute, Link } from "@tanstack/react-router";
import {
  Truck,
  Container,
  Warehouse,
  MapPin,
  BarChart3,
  Users,
  FileText,
  Shield,
  Zap,
  Globe,
  CheckCircle2,
  ArrowLeft,
  Snowflake,
  Route as RouteIcon,
} from "lucide-react";
import { Button } from "@/components/ui/button";

export const Route = createFileRoute("/")({
  component: Landing,
});

function Landing() {
  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="sticky top-0 z-50 border-b border-border/50 bg-background/80 backdrop-blur-xl">
        <div className="mx-auto flex max-w-7xl items-center justify-between px-6 py-4">
          <div className="flex items-center gap-3">
            <div className="flex h-11 w-11 items-center justify-center rounded-xl gradient-brand shadow-elegant">
              <Truck className="h-6 w-6 text-white" strokeWidth={2.5} />
            </div>
            <div>
              <div className="text-lg font-black leading-tight text-primary">SAIFO</div>
              <div className="-mt-1 text-[10px] font-bold tracking-widest text-accent">
                TRANSPORT ERP
              </div>
            </div>
          </div>
          <nav className="hidden items-center gap-8 md:flex">
            <a href="#features" className="text-sm font-medium text-muted-foreground hover:text-foreground">
              المميزات
            </a>
            <a href="#modules" className="text-sm font-medium text-muted-foreground hover:text-foreground">
              الوحدات
            </a>
            <a href="#pricing" className="text-sm font-medium text-muted-foreground hover:text-foreground">
              الأسعار
            </a>
          </nav>
          <div className="flex items-center gap-3">
            <Button asChild variant="ghost" size="sm">
              <Link to="/app">تسجيل الدخول</Link>
            </Button>
            <Button asChild size="sm" className="bg-accent text-accent-foreground hover:bg-accent/90">
              <Link to="/app">تجربة مجانية</Link>
            </Button>
          </div>
        </div>
      </header>

      {/* Hero */}
      <section className="relative overflow-hidden">
        <div className="absolute inset-0 gradient-brand opacity-[0.03]" />
        <div className="relative mx-auto max-w-7xl px-6 py-24 md:py-32">
          <div className="mx-auto max-w-4xl text-center">
            <div className="mb-6 inline-flex items-center gap-2 rounded-full border border-accent/30 bg-accent/10 px-4 py-1.5">
              <span className="h-2 w-2 rounded-full bg-accent animate-pulse" />
              <span className="text-xs font-semibold text-accent">النسخة الاحترافية 2026</span>
            </div>
            <h1 className="text-5xl font-black leading-tight tracking-tight text-primary md:text-7xl">
              منصة إدارة النقل واللوجستيك
              <br />
              <span className="bg-gradient-to-l from-accent to-accent-glow bg-clip-text text-transparent">
                الأكثر احترافية
              </span>
            </h1>
            <p className="mx-auto mt-6 max-w-2xl text-lg text-muted-foreground md:text-xl">
              نظام ERP + TMS + FMS + CRM متكامل لشركات النقل الصغيرة والمتوسطة والكبيرة.
              يدعم النقل الوطني والدولي، النقل المبرد، الحاويات، والتخزين اللوجستي.
            </p>
            <div className="mt-10 flex flex-wrap items-center justify-center gap-4">
              <Button asChild size="lg" className="h-14 gap-2 bg-accent px-8 text-base text-accent-foreground shadow-glow hover:bg-accent/90">
                <Link to="/app">
                  ابدأ تجربة مجانية 14 يوم
                  <ArrowLeft className="h-5 w-5" />
                </Link>
              </Button>
              <Button asChild size="lg" variant="outline" className="h-14 px-8 text-base">
                <a href="#modules">استكشف الوحدات</a>
              </Button>
            </div>
            <div className="mt-12 flex flex-wrap items-center justify-center gap-6 text-sm text-muted-foreground">
              <div className="flex items-center gap-2">
                <CheckCircle2 className="h-4 w-4 text-success" />
                <span>Multi-Tenant آمن</span>
              </div>
              <div className="flex items-center gap-2">
                <CheckCircle2 className="h-4 w-4 text-success" />
                <span>بدون رسوم إعداد</span>
              </div>
              <div className="flex items-center gap-2">
                <CheckCircle2 className="h-4 w-4 text-success" />
                <span>دعم فني عربي</span>
              </div>
            </div>
          </div>

          {/* Transport type badges */}
          <div className="mt-20 grid grid-cols-2 gap-4 md:grid-cols-4 lg:grid-cols-8">
            {[
              { icon: Globe, label: "نقل وطني" },
              { icon: MapPin, label: "نقل دولي" },
              { icon: Truck, label: "بري" },
              { icon: Snowflake, label: "مبرد" },
              { icon: Container, label: "حاويات" },
              { icon: Warehouse, label: "تخزين" },
              { icon: RouteIcon, label: "حساب الغير" },
              { icon: Shield, label: "حساب خاص" },
            ].map(({ icon: Icon, label }) => (
              <div
                key={label}
                className="flex flex-col items-center gap-2 rounded-2xl border border-border bg-card p-4 text-center transition hover:border-accent/50 hover:shadow-elegant"
              >
                <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-primary/5">
                  <Icon className="h-6 w-6 text-primary" />
                </div>
                <span className="text-xs font-semibold text-foreground">{label}</span>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Modules */}
      <section id="modules" className="border-y border-border bg-secondary/50 py-24">
        <div className="mx-auto max-w-7xl px-6">
          <div className="mx-auto max-w-2xl text-center">
            <h2 className="text-4xl font-black text-primary md:text-5xl">
              نظام واحد لكل عملياتك
            </h2>
            <p className="mt-4 text-lg text-muted-foreground">
              من الطلب حتى التحصيل، من الأسطول حتى المستودع، من العميل حتى KPI.
            </p>
          </div>

          <div className="mt-16 grid gap-6 md:grid-cols-2 lg:grid-cols-3">
            {MODULES.map((m) => (
              <div
                key={m.title}
                className="group relative overflow-hidden rounded-2xl border border-border bg-card p-6 transition hover:border-accent/50 hover:shadow-elegant"
              >
                <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-xl bg-accent/10 text-accent transition group-hover:scale-110">
                  <m.icon className="h-6 w-6" />
                </div>
                <h3 className="text-lg font-bold text-foreground">{m.title}</h3>
                <p className="mt-2 text-sm text-muted-foreground">{m.desc}</p>
                <div className="mt-4 flex flex-wrap gap-2">
                  {m.tags.map((t) => (
                    <span
                      key={t}
                      className="rounded-md bg-primary/5 px-2 py-0.5 text-[11px] font-semibold text-primary"
                    >
                      {t}
                    </span>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Features */}
      <section id="features" className="py-24">
        <div className="mx-auto max-w-7xl px-6">
          <div className="grid gap-16 lg:grid-cols-2 lg:items-center">
            <div>
              <div className="mb-4 inline-flex items-center gap-2 rounded-full bg-accent/10 px-3 py-1">
                <Zap className="h-3.5 w-3.5 text-accent" />
                <span className="text-xs font-bold text-accent">مبني للنمو</span>
              </div>
              <h2 className="text-4xl font-black text-primary md:text-5xl">
                جاهز للبيع التجاري
                <br />
                <span className="text-accent">Multi-Tenant من اليوم الأول</span>
              </h2>
              <p className="mt-6 text-lg text-muted-foreground">
                كل شركة نقل تعمل بمعزل عن الأخرى. تراخيص، اشتراكات، نسخ تجريبية،
                وحساب مالك النظام الوحيد SAIFO TRANSPORT System Owner لإدارة كل العملاء.
              </p>
              <div className="mt-8 space-y-4">
                {[
                  "عزل كامل للبيانات بين الشركات",
                  "8 مستويات صلاحيات دقيقة",
                  "سجل تدقيق Audit Log كامل",
                  "وضع القراءة فقط عند انتهاء الترخيص",
                  "تشفير البيانات الحساسة",
                  "جاهز لدعم GPS و AI مستقبلاً",
                ].map((f) => (
                  <div key={f} className="flex items-center gap-3">
                    <CheckCircle2 className="h-5 w-5 flex-shrink-0 text-success" />
                    <span className="text-foreground">{f}</span>
                  </div>
                ))}
              </div>
            </div>

            <div className="relative">
              <div className="absolute -inset-4 gradient-brand rounded-3xl opacity-10 blur-2xl" />
              <div className="relative overflow-hidden rounded-2xl border border-border bg-card p-8 shadow-elegant">
                <div className="grid grid-cols-2 gap-6">
                  {[
                    { label: "شاحنة نشطة", value: "1,248", trend: "+12%" },
                    { label: "رحلة هذا الشهر", value: "8,932", trend: "+24%" },
                    { label: "معدل الاستغلال", value: "87%", trend: "+5%" },
                    { label: "الإيرادات", value: "4.2M", trend: "+18%" },
                  ].map((s) => (
                    <div key={s.label} className="rounded-xl border border-border bg-background p-4">
                      <div className="text-xs text-muted-foreground">{s.label}</div>
                      <div className="mt-1 text-2xl font-black text-primary">{s.value}</div>
                      <div className="mt-1 text-xs font-semibold text-success">{s.trend}</div>
                    </div>
                  ))}
                </div>
                <div className="mt-6 rounded-xl gradient-brand p-6 text-white">
                  <div className="flex items-center justify-between">
                    <div>
                      <div className="text-xs opacity-80">لوحة KPI الاحترافية</div>
                      <div className="mt-1 text-xl font-bold">أفضل أداء منذ التأسيس</div>
                    </div>
                    <BarChart3 className="h-10 w-10 text-accent" />
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* CTA */}
      <section id="pricing" className="border-t border-border bg-primary py-24 text-primary-foreground">
        <div className="mx-auto max-w-4xl px-6 text-center">
          <h2 className="text-4xl font-black md:text-5xl">جاهز لنقل شركتك للاحترافية؟</h2>
          <p className="mt-4 text-lg opacity-80">
            ابدأ تجربة مجانية لمدة 14 يوم — بدون بطاقة ائتمان، بدون التزام.
          </p>
          <div className="mt-8 flex flex-wrap items-center justify-center gap-4">
            <Button asChild size="lg" className="h-14 gap-2 bg-accent px-8 text-base text-accent-foreground hover:bg-accent/90">
              <Link to="/app">
                ابدأ الآن مجاناً
                <ArrowLeft className="h-5 w-5" />
              </Link>
            </Button>
          </div>
        </div>
      </section>

      <footer className="border-t border-border bg-background py-8">
        <div className="mx-auto flex max-w-7xl items-center justify-between px-6 text-sm text-muted-foreground">
          <div>© 2026 SAIFO TRANSPORT ERP. جميع الحقوق محفوظة.</div>
          <div className="flex items-center gap-2">
            <Truck className="h-4 w-4 text-accent" />
            <span className="font-semibold">Built for logistics leaders</span>
          </div>
        </div>
      </footer>
    </div>
  );
}

const MODULES = [
  {
    icon: Users,
    title: "CRM — إدارة العملاء",
    desc: "ملفات عملاء متكاملة، عقود، فواتير، سجل تعاملات كامل.",
    tags: ["عقود", "فواتير", "وثائق"],
  },
  {
    icon: FileText,
    title: "TMS — إدارة النقل",
    desc: "طلب نقل → أمر نقل → تخصيص → تنفيذ → تسليم → فوترة → تحصيل.",
    tags: ["أوامر", "شحنات", "رحلات"],
  },
  {
    icon: Truck,
    title: "FMS — إدارة الأسطول",
    desc: "شاحنات، جرارات، مقطورات، حاويات، وثائق ورخص وتأمين.",
    tags: ["مركبات", "وثائق", "تأمين"],
  },
  {
    icon: Zap,
    title: "الوقود والصيانة",
    desc: "استهلاك، تكلفة الكيلومتر، صيانة وقائية وتصحيحية، تنبيهات ذكية.",
    tags: ["استهلاك", "تنبيهات", "تكاليف"],
  },
  {
    icon: Warehouse,
    title: "المستودعات",
    desc: "مواقع تخزين، استلام، تسليم، جرد، تحويلات بين المستودعات.",
    tags: ["مواقع", "جرد", "تحويل"],
  },
  {
    icon: BarChart3,
    title: "لوحة KPI",
    desc: "مؤشرات فورية للأسطول، الرحلات، الإيرادات، أفضل العملاء والسائقين.",
    tags: ["مؤشرات", "تحليل", "ربحية"],
  },
];
