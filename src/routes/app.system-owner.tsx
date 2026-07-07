import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { PageHeader } from "@/components/dashboard-layout";
import { Crown, Building2, Key, Rocket, ShieldCheck, Users2, Loader2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";

export const Route = createFileRoute("/app/system-owner")({
  component: SystemOwnerPage,
});

type Tenant = {
  id: string;
  name: string;
  slug: string;
  status: string;
  contact_email: string | null;
  created_at: string;
  subscriptions?: { plan: string; status: string; ends_at: string | null }[];
};

function SystemOwnerPage() {
  const [tenants, setTenants] = useState<Tenant[]>([]);
  const [userCount, setUserCount] = useState(0);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      const [{ data: t }, { count }] = await Promise.all([
        supabase.from("tenants").select("id,name,slug,status,contact_email,created_at,subscriptions(plan,status,ends_at)").order("created_at", { ascending: false }),
        supabase.from("profiles").select("id", { count: "exact", head: true }),
      ]);
      setTenants((t as any) ?? []);
      setUserCount(count ?? 0);
      setLoading(false);
    })();
  }, []);

  const active = tenants.filter((t) => t.status === "active").length;
  const trial = tenants.filter((t) => t.status === "trial").length;
  const licenses = tenants.filter((t) => (t.subscriptions?.[0]?.status ?? "") === "active").length;

  return (
    <>
      <div className="mb-6 rounded-2xl gradient-brand p-6 text-white shadow-elegant">
        <div className="flex items-center gap-4">
          <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-accent/20 backdrop-blur-sm">
            <Crown className="h-7 w-7 text-accent" />
          </div>
          <div>
            <div className="text-xs font-bold uppercase tracking-widest text-accent">SAIFO TRANSPORT · System Owner</div>
            <div className="text-2xl font-black">لوحة مالك النظام</div>
            <div className="text-sm opacity-80">إدارة كل الشركات، التراخيص، الاشتراكات والنسخ التجريبية.</div>
          </div>
        </div>
      </div>

      <PageHeader title="إدارة المستأجرين والاشتراكات" />

      <div className="grid gap-4 md:grid-cols-4">
        {[
          { icon: Building2, label: "شركات نشطة", value: active, tint: "text-primary" },
          { icon: Rocket, label: "نسخ تجريبية", value: trial, tint: "text-accent" },
          { icon: Key, label: "تراخيص نشطة", value: licenses, tint: "text-success" },
          { icon: Users2, label: "إجمالي المستخدمين", value: userCount, tint: "text-chart-3" },
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
          <p className="text-xs text-muted-foreground">كل شركة معزولة تماماً عن الأخرى بواسطة RLS</p>
        </div>
        {loading ? (
          <div className="flex justify-center py-12"><Loader2 className="h-6 w-6 animate-spin text-accent" /></div>
        ) : tenants.length === 0 ? (
          <div className="p-8 text-center text-sm text-muted-foreground">لا توجد شركات مسجلة بعد.</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-secondary/50 text-xs uppercase text-muted-foreground">
                <tr>
                  <th className="p-4 text-right font-semibold">الشركة</th>
                  <th className="p-4 text-right font-semibold">البريد</th>
                  <th className="p-4 text-right font-semibold">الخطة</th>
                  <th className="p-4 text-right font-semibold">تاريخ الإنشاء</th>
                  <th className="p-4 text-right font-semibold">ينتهي في</th>
                  <th className="p-4 text-right font-semibold">الحالة</th>
                </tr>
              </thead>
              <tbody>
                {tenants.map((t) => {
                  const sub = t.subscriptions?.[0];
                  return (
                    <tr key={t.id} className="border-t border-border hover:bg-secondary/30">
                      <td className="p-4 font-semibold">{t.name}</td>
                      <td className="p-4 text-muted-foreground" dir="ltr">{t.contact_email ?? "—"}</td>
                      <td className="p-4"><span className="rounded-md bg-primary/10 px-2 py-1 text-xs font-bold text-primary uppercase">{sub?.plan ?? "—"}</span></td>
                      <td className="p-4 text-muted-foreground" dir="ltr">{new Date(t.created_at).toLocaleDateString()}</td>
                      <td className="p-4 text-muted-foreground" dir="ltr">{sub?.ends_at ? new Date(sub.ends_at).toLocaleDateString() : "—"}</td>
                      <td className="p-4">
                        <span className={`inline-flex items-center gap-1 rounded-md px-2 py-1 text-xs font-semibold ${t.status === "active" ? "bg-success/10 text-success" : t.status === "trial" ? "bg-accent/10 text-accent" : "bg-secondary text-muted-foreground"}`}>
                          <ShieldCheck className="h-3 w-3" />
                          {t.status === "active" ? "نشط" : t.status === "trial" ? "تجريبي" : t.status}
                        </span>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </>
  );
}
