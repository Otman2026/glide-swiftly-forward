import { createFileRoute } from "@tanstack/react-router";
import { PageHeader } from "@/components/dashboard-layout";
import { Crown, Building2, Key, Rocket, ShieldCheck, Users2 } from "lucide-react";

export const Route = createFileRoute("/app/system-owner")({
  component: SystemOwnerPage,
});

function SystemOwnerPage() {
  return (
    <>
      <div className="mb-6 rounded-2xl gradient-brand p-6 text-white shadow-elegant">
        <div className="flex items-center gap-4">
          <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-accent/20 backdrop-blur-sm">
            <Crown className="h-7 w-7 text-accent" />
          </div>
          <div>
            <div className="text-xs font-bold uppercase tracking-widest text-accent">
              SAIFO TRANSPORT · System Owner
            </div>
            <div className="text-2xl font-black">لوحة مالك النظام</div>
            <div className="text-sm opacity-80">
              حساب واحد فقط في النظام — إدارة كل الشركات، التراخيص، الاشتراكات والنسخ التجريبية.
            </div>
          </div>
        </div>
      </div>

      <PageHeader title="إدارة المستأجرين والاشتراكات" />

      <div className="grid gap-4 md:grid-cols-4">
        {[
          { icon: Building2, label: "شركات نشطة", value: "12", tint: "text-primary" },
          { icon: Rocket, label: "نسخ تجريبية", value: "8", tint: "text-accent" },
          { icon: Key, label: "تراخيص نشطة", value: "10", tint: "text-success" },
          { icon: Users2, label: "إجمالي المستخدمين", value: "487", tint: "text-chart-3" },
        ].map((s) => (
          <div key={s.label} className="rounded-2xl border border-border bg-card p-5">
            <s.icon className={`h-6 w-6 ${s.tint}`} />
            <div className="mt-3 text-3xl font-black text-foreground">{s.value}</div>
            <div className="text-xs text-muted-foreground">{s.label}</div>
          </div>
        ))}
      </div>

      <div className="mt-6 rounded-2xl border border-border bg-card">
        <div className="border-b border-border p-6">
          <h3 className="font-bold text-foreground">الشركات المستأجرة (Multi-Tenant)</h3>
          <p className="text-xs text-muted-foreground">كل شركة معزولة تماماً عن الأخرى</p>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-secondary/50 text-xs uppercase text-muted-foreground">
              <tr>
                <th className="p-4 text-right font-semibold">الشركة</th>
                <th className="p-4 text-right font-semibold">الخطة</th>
                <th className="p-4 text-right font-semibold">المستخدمون</th>
                <th className="p-4 text-right font-semibold">الترخيص</th>
                <th className="p-4 text-right font-semibold">الحالة</th>
              </tr>
            </thead>
            <tbody>
              {[
                { name: "شركة النقل الوطنية", plan: "Enterprise", users: 48, license: "سنوي", status: "نشط" },
                { name: "مجموعة الأطلس اللوجستية", plan: "Pro", users: 22, license: "سنوي", status: "نشط" },
                { name: "شركة الصحراء للنقل", plan: "Starter", users: 6, license: "شهري", status: "نشط" },
                { name: "لوجستيك المغرب", plan: "Trial", users: 3, license: "تجريبي", status: "تجريبي" },
              ].map((t) => (
                <tr key={t.name} className="border-t border-border hover:bg-secondary/30">
                  <td className="p-4 font-semibold">{t.name}</td>
                  <td className="p-4">
                    <span className="rounded-md bg-primary/10 px-2 py-1 text-xs font-bold text-primary">
                      {t.plan}
                    </span>
                  </td>
                  <td className="p-4">{t.users}</td>
                  <td className="p-4 text-muted-foreground">{t.license}</td>
                  <td className="p-4">
                    <span
                      className={`inline-flex items-center gap-1 rounded-md px-2 py-1 text-xs font-semibold ${
                        t.status === "نشط" ? "bg-success/10 text-success" : "bg-accent/10 text-accent"
                      }`}
                    >
                      <ShieldCheck className="h-3 w-3" />
                      {t.status}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </>
  );
}
