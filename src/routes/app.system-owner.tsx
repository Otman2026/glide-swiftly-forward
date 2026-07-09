import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { PageHeader } from "@/components/dashboard-layout";
import {
  Check, Clock, Crown, Building2, Key, Rocket, ShieldCheck, Users2, Loader2, X,
  Plus, Pencil, Trash2, Copy, PauseCircle, PlayCircle, CalendarPlus, Ban,
  DollarSign, FileCheck2, Layers, ClipboardList, UserCog, Lock, Unlock,
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle,
} from "@/components/ui/dialog";

export const Route = createFileRoute("/app/system-owner")({
  component: SystemOwnerPage,
});

type PlanKey = string;
type BillingCycle = "monthly" | "yearly";

type Plan = {
  id: string; key: string; name: string;
  price_monthly: number | null; price_yearly: number | null;
  max_users: number | null; max_vehicles: number | null;
  features: string[]; is_active: boolean; sort_order: number;
};

type Tenant = {
  id: string; name: string; slug: string; status: string;
  contact_email: string | null; created_at: string;
  subscriptions?: { id: string; plan: PlanKey; status: string; ends_at: string | null; max_users: number | null; max_vehicles: number | null }[];
};

type License = {
  id: string; license_key: string; tenant_id: string | null; plan_key: string;
  max_users: number | null; max_vehicles: number | null;
  issued_at: string; expires_at: string | null; activated_at: string | null;
  revoked_at: string | null; revoked_reason: string | null; notes: string | null;
};

type BillingRequest = {
  id: string; tenant_id: string;
  current_plan: PlanKey; requested_plan: PlanKey; billing_cycle: BillingCycle;
  status: string; notes: string | null; created_at: string;
  tenants?: { name: string; contact_email: string | null } | null;
};

type TabKey = "overview" | "tenants" | "accounts" | "subs" | "licenses" | "plans" | "requests" | "report";

const TABS: { key: TabKey; label: string; icon: React.ComponentType<{ className?: string }> }[] = [
  { key: "overview", label: "نظرة عامة", icon: Crown },
  { key: "tenants", label: "الشركات", icon: Building2 },
  { key: "accounts", label: "الحسابات والصلاحيات", icon: UserCog },
  { key: "subs", label: "الاشتراكات", icon: ShieldCheck },
  { key: "licenses", label: "التراخيص", icon: Key },
  { key: "plans", label: "الخطط والأسعار", icon: Layers },
  { key: "requests", label: "طلبات الفوترة", icon: ClipboardList },
  { key: "report", label: "تقرير الجاهزية", icon: FileCheck2 },
];

function SystemOwnerPage() {
  const [tab, setTab] = useState<TabKey>("overview");
  const [tenants, setTenants] = useState<Tenant[]>([]);
  const [plans, setPlans] = useState<Plan[]>([]);
  const [licenses, setLicenses] = useState<License[]>([]);
  const [requests, setRequests] = useState<BillingRequest[]>([]);
  const [userCount, setUserCount] = useState(0);
  const [loading, setLoading] = useState(true);
  const [isOwner, setIsOwner] = useState(false);

  const load = async () => {
    setLoading(true);
    const { data: u } = await supabase.auth.getUser();
    if (u.user) {
      const { data: check } = await supabase.rpc("is_system_owner", { _user_id: u.user.id });
      setIsOwner(Boolean(check));
    }
    const [t, p, l, r, c] = await Promise.all([
      supabase.from("tenants").select("id,name,slug,status,contact_email,created_at,subscriptions(id,plan,status,ends_at,max_users,max_vehicles)").order("created_at", { ascending: false }),
      supabase.from("plans").select("*").order("sort_order"),
      supabase.from("license_keys").select("*").order("created_at", { ascending: false }),
      supabase.from("billing_requests").select("id,tenant_id,current_plan,requested_plan,billing_cycle,status,notes,created_at,tenants(name,contact_email)").order("created_at", { ascending: false }).limit(50),
      supabase.from("profiles").select("id", { count: "exact", head: true }),
    ]);
    setTenants((t.data as unknown as Tenant[]) ?? []);
    setPlans(((p.data ?? []) as unknown as Plan[]).map((x) => ({ ...x, features: Array.isArray(x.features) ? x.features : [] })));
    setLicenses((l.data as unknown as License[]) ?? []);
    setRequests((r.data as unknown as BillingRequest[]) ?? []);
    setUserCount(c.count ?? 0);
    setLoading(false);
  };

  useEffect(() => { load(); }, []);

  const stats = useMemo(() => ({
    active: tenants.filter((t) => t.status === "active").length,
    trial: tenants.filter((t) => t.status === "trial").length,
    suspended: tenants.filter((t) => t.status === "suspended").length,
    licenses: licenses.filter((l) => !l.revoked_at).length,
    plans: plans.filter((p) => p.is_active).length,
    pendingReq: requests.filter((r) => r.status === "pending").length,
  }), [tenants, licenses, plans, requests]);

  if (loading) return <div className="flex justify-center py-16"><Loader2 className="h-8 w-8 animate-spin text-accent" /></div>;

  if (!isOwner) {
    return (
      <div className="rounded-2xl border border-destructive/40 bg-destructive/5 p-10 text-center">
        <Crown className="mx-auto h-12 w-12 text-destructive" />
        <h2 className="mt-4 text-xl font-black">هذه الصفحة مقصورة على مالك النظام</h2>
        <p className="mt-2 text-sm text-muted-foreground">
          الوصول محجوز لحساب <code dir="ltr">otnaj.2017@gmail.com</code> فقط.
        </p>
      </div>
    );
  }

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
            <div className="text-sm opacity-80">حساب حصري واحد يدير كل الشركات، التراخيص، الاشتراكات والخطط.</div>
          </div>
        </div>
      </div>

      <div className="mb-6 flex flex-wrap gap-2 border-b border-border">
        {TABS.map((t) => {
          const Icon = t.icon;
          const active = tab === t.key;
          return (
            <button key={t.key} onClick={() => setTab(t.key)}
              className={`flex items-center gap-2 px-4 py-2.5 text-sm font-semibold border-b-2 -mb-px transition ${active ? "border-accent text-accent" : "border-transparent text-muted-foreground hover:text-foreground"}`}>
              <Icon className="h-4 w-4" /> {t.label}
            </button>
          );
        })}
      </div>

      {tab === "overview" && <OverviewTab stats={stats} userCount={userCount} />}
      {tab === "tenants" && <TenantsTab tenants={tenants} onReload={load} />}
      {tab === "accounts" && <AccountsTab tenants={tenants} licenses={licenses} />}
      {tab === "subs" && <SubsTab tenants={tenants} plans={plans} onReload={load} />}
      {tab === "licenses" && <LicensesTab licenses={licenses} tenants={tenants} plans={plans} onReload={load} />}
      {tab === "plans" && <PlansTab plans={plans} onReload={load} />}
      {tab === "requests" && <RequestsTab requests={requests} plans={plans} onReload={load} />}
      {tab === "report" && <ReportTab stats={stats} userCount={userCount} plans={plans} licenses={licenses} />}
    </>
  );
}

/* ==================== Overview ==================== */
function OverviewTab({ stats, userCount }: { stats: any; userCount: number }) {
  return (
    <>
      <PageHeader title="نظرة شاملة" />
      <div className="grid gap-4 md:grid-cols-3 lg:grid-cols-6">
        {[
          { icon: Building2, label: "شركات نشطة", value: stats.active, tint: "text-primary" },
          { icon: Rocket, label: "نسخ تجريبية", value: stats.trial, tint: "text-accent" },
          { icon: Ban, label: "شركات موقوفة", value: stats.suspended, tint: "text-destructive" },
          { icon: Key, label: "تراخيص فعّالة", value: stats.licenses, tint: "text-success" },
          { icon: Layers, label: "خطط منشورة", value: stats.plans, tint: "text-chart-3" },
          { icon: Users2, label: "إجمالي المستخدمين", value: userCount, tint: "text-chart-4" },
        ].map((s) => (
          <div key={s.label} className="rounded-2xl border border-border bg-card p-5">
            <s.icon className={`h-6 w-6 ${s.tint}`} />
            <div className="mt-3 text-3xl font-black">{s.value}</div>
            <div className="text-xs text-muted-foreground">{s.label}</div>
          </div>
        ))}
      </div>
    </>
  );
}

/* ==================== Tenants ==================== */
function TenantsTab({ tenants, onReload }: { tenants: Tenant[]; onReload: () => void }) {
  async function setStatus(id: string, status: string) {
    const { error } = await supabase.from("tenants").update({ status: status as any }).eq("id", id);
    if (error) toast.error(error.message);
    else { toast.success("تم التحديث"); onReload(); }
  }
  async function del(id: string, name: string) {
    if (!confirm(`حذف الشركة "${name}" وكل بياناتها نهائياً؟`)) return;
    const { error } = await supabase.from("tenants").delete().eq("id", id);
    if (error) toast.error(error.message); else { toast.success("تم الحذف"); onReload(); }
  }
  return (
    <>
      <PageHeader title="إدارة الشركات" subtitle="عرض، إيقاف، إعادة تفعيل، حذف" />
      <div className="rounded-2xl border border-border bg-card overflow-x-auto">
        <table className="w-full text-sm">
          <thead className="bg-secondary/50 text-xs uppercase text-muted-foreground">
            <tr>
              <th className="p-4 text-right">الشركة</th>
              <th className="p-4 text-right">البريد</th>
              <th className="p-4 text-right">الخطة</th>
              <th className="p-4 text-right">الحالة</th>
              <th className="p-4 text-right">إجراءات</th>
            </tr>
          </thead>
          <tbody>
            {tenants.length === 0 ? (
              <tr><td colSpan={5} className="p-8 text-center text-muted-foreground">لا توجد شركات</td></tr>
            ) : tenants.map((t) => {
              const sub = t.subscriptions?.[0];
              return (
                <tr key={t.id} className="border-t border-border hover:bg-secondary/30">
                  <td className="p-4 font-semibold">{t.name}</td>
                  <td className="p-4 text-muted-foreground" dir="ltr">{t.contact_email ?? "—"}</td>
                  <td className="p-4"><span className="rounded-md bg-primary/10 px-2 py-1 text-xs font-bold text-primary uppercase">{sub?.plan ?? "—"}</span></td>
                  <td className="p-4">
                    <span className={`inline-flex items-center gap-1 rounded-md px-2 py-1 text-xs font-semibold ${t.status === "active" ? "bg-success/10 text-success" : t.status === "trial" ? "bg-accent/10 text-accent" : "bg-destructive/10 text-destructive"}`}>
                      {t.status === "active" ? "نشط" : t.status === "trial" ? "تجريبي" : "موقوف"}
                    </span>
                  </td>
                  <td className="p-4">
                    <div className="flex flex-wrap gap-2">
                      {t.status !== "suspended" ? (
                        <Button size="sm" variant="outline" onClick={() => setStatus(t.id, "suspended")}><PauseCircle className="h-3 w-3" /> إيقاف</Button>
                      ) : (
                        <Button size="sm" variant="outline" onClick={() => setStatus(t.id, "active")} className="text-success"><PlayCircle className="h-3 w-3" /> تفعيل</Button>
                      )}
                      <Button size="sm" variant="outline" onClick={() => del(t.id, t.name)} className="text-destructive"><Trash2 className="h-3 w-3" /></Button>
                    </div>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </>
  );
}

/* ==================== Subscriptions ==================== */
function SubsTab({ tenants, plans, onReload }: { tenants: Tenant[]; plans: Plan[]; onReload: () => void }) {
  const [busy, setBusy] = useState<string | null>(null);

  async function extend(subId: string, days: number) {
    setBusy(subId);
    const { data: sub } = await supabase.from("subscriptions").select("ends_at").eq("id", subId).maybeSingle();
    const base = sub?.ends_at ? new Date(sub.ends_at) : new Date();
    if (base < new Date()) base.setTime(Date.now());
    base.setDate(base.getDate() + days);
    const { error } = await supabase.from("subscriptions").update({ ends_at: base.toISOString(), status: "active" }).eq("id", subId);
    setBusy(null);
    if (error) toast.error(error.message); else { toast.success(`+${days} يوم`); onReload(); }
  }
  async function setStatus(subId: string, status: string) {
    const { error } = await supabase.from("subscriptions").update({ status }).eq("id", subId);
    if (error) toast.error(error.message); else { toast.success("تم"); onReload(); }
  }
  async function changePlan(tenantId: string, subId: string | undefined, planKey: string) {
    const plan = plans.find((p) => p.key === planKey);
    if (!plan) return;
    const payload = {
      plan: planKey as any, status: "active",
      max_users: plan.max_users, max_vehicles: plan.max_vehicles,
      price_monthly: plan.price_monthly,
    };
    const res = subId
      ? await supabase.from("subscriptions").update(payload).eq("id", subId)
      : await supabase.from("subscriptions").insert({ tenant_id: tenantId, starts_at: new Date().toISOString(), ends_at: new Date(Date.now() + 30 * 86400000).toISOString(), ...payload });
    if (res.error) toast.error(res.error.message); else { toast.success("تم تحديث الخطة"); onReload(); }
  }

  return (
    <>
      <PageHeader title="إدارة الاشتراكات" subtitle="تمديد، إيقاف، تفعيل، تغيير الخطة" />
      <div className="rounded-2xl border border-border bg-card overflow-x-auto">
        <table className="w-full text-sm">
          <thead className="bg-secondary/50 text-xs uppercase text-muted-foreground">
            <tr>
              <th className="p-4 text-right">الشركة</th>
              <th className="p-4 text-right">الخطة</th>
              <th className="p-4 text-right">الحالة</th>
              <th className="p-4 text-right">ينتهي في</th>
              <th className="p-4 text-right">إجراءات</th>
            </tr>
          </thead>
          <tbody>
            {tenants.map((t) => {
              const sub = t.subscriptions?.[0];
              return (
                <tr key={t.id} className="border-t border-border hover:bg-secondary/30">
                  <td className="p-4 font-semibold">{t.name}</td>
                  <td className="p-4">
                    <select value={sub?.plan ?? ""} onChange={(e) => changePlan(t.id, sub?.id, e.target.value)}
                      className="h-9 rounded-md border border-border bg-background px-2 text-xs">
                      <option value="">—</option>
                      {plans.map((p) => <option key={p.key} value={p.key}>{p.name}</option>)}
                    </select>
                  </td>
                  <td className="p-4">
                    <span className={`rounded-md px-2 py-1 text-xs font-semibold ${sub?.status === "active" ? "bg-success/10 text-success" : "bg-destructive/10 text-destructive"}`}>
                      {sub?.status ?? "—"}
                    </span>
                  </td>
                  <td className="p-4 text-xs text-muted-foreground" dir="ltr">{sub?.ends_at ? new Date(sub.ends_at).toLocaleDateString() : "—"}</td>
                  <td className="p-4">
                    {sub && (
                      <div className="flex flex-wrap gap-1">
                        <Button size="sm" variant="outline" disabled={busy === sub.id} onClick={() => extend(sub.id, 30)}><CalendarPlus className="h-3 w-3" />+30</Button>
                        <Button size="sm" variant="outline" onClick={() => extend(sub.id, 90)}>+90</Button>
                        <Button size="sm" variant="outline" onClick={() => extend(sub.id, 365)}>+365</Button>
                        {sub.status === "active"
                          ? <Button size="sm" variant="outline" className="text-destructive" onClick={() => setStatus(sub.id, "cancelled")}><Ban className="h-3 w-3" /></Button>
                          : <Button size="sm" variant="outline" className="text-success" onClick={() => setStatus(sub.id, "active")}><PlayCircle className="h-3 w-3" /></Button>}
                      </div>
                    )}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </>
  );
}

/* ==================== Licenses ==================== */
function LicensesTab({ licenses, tenants, plans, onReload }: { licenses: License[]; tenants: Tenant[]; plans: Plan[]; onReload: () => void }) {
  const [open, setOpen] = useState(false);
  const [edit, setEdit] = useState<License | null>(null);
  const [form, setForm] = useState<{ tenant_id: string; plan_key: string; expires_at: string; notes: string; max_users: string; max_vehicles: string }>(
    { tenant_id: "", plan_key: "starter", expires_at: "", notes: "", max_users: "", max_vehicles: "" }
  );

  function openNew() {
    setEdit(null);
    setForm({ tenant_id: "", plan_key: plans[0]?.key ?? "starter", expires_at: "", notes: "", max_users: "", max_vehicles: "" });
    setOpen(true);
  }
  function openEdit(l: License) {
    setEdit(l);
    setForm({
      tenant_id: l.tenant_id ?? "", plan_key: l.plan_key,
      expires_at: l.expires_at ? l.expires_at.slice(0, 10) : "",
      notes: l.notes ?? "",
      max_users: l.max_users?.toString() ?? "",
      max_vehicles: l.max_vehicles?.toString() ?? "",
    });
    setOpen(true);
  }

  async function save() {
    const payload = {
      tenant_id: form.tenant_id || null,
      plan_key: form.plan_key,
      expires_at: form.expires_at ? new Date(form.expires_at).toISOString() : null,
      notes: form.notes || null,
      max_users: form.max_users ? Number(form.max_users) : null,
      max_vehicles: form.max_vehicles ? Number(form.max_vehicles) : null,
    };
    const res = edit
      ? await supabase.from("license_keys").update(payload).eq("id", edit.id)
      : await supabase.from("license_keys").insert(payload as any);
    if (res.error) return toast.error(res.error.message);
    toast.success(edit ? "تم التعديل" : "تم إنشاء الترخيص");
    setOpen(false);
    onReload();
  }
  async function revoke(l: License) {
    const reason = prompt("سبب الإلغاء:");
    if (reason === null) return;
    const { error } = await supabase.from("license_keys").update({ revoked_at: new Date().toISOString(), revoked_reason: reason }).eq("id", l.id);
    if (error) toast.error(error.message); else { toast.success("تم الإلغاء"); onReload(); }
  }
  async function reactivate(l: License) {
    const { error } = await supabase.from("license_keys").update({ revoked_at: null, revoked_reason: null }).eq("id", l.id);
    if (error) toast.error(error.message); else { toast.success("تم التفعيل"); onReload(); }
  }
  async function del(l: License) {
    if (!confirm(`حذف الترخيص ${l.license_key}؟`)) return;
    const { error } = await supabase.from("license_keys").delete().eq("id", l.id);
    if (error) toast.error(error.message); else { toast.success("تم الحذف"); onReload(); }
  }

  return (
    <>
      <PageHeader title="مفاتيح التراخيص" subtitle="إنشاء، تعديل، إلغاء، إعادة تفعيل"
        action={<Button onClick={openNew} className="gap-2 bg-accent text-accent-foreground hover:bg-accent/90"><Plus className="h-4 w-4" /> ترخيص جديد</Button>} />

      <div className="rounded-2xl border border-border bg-card overflow-x-auto">
        <table className="w-full text-sm">
          <thead className="bg-secondary/50 text-xs uppercase text-muted-foreground">
            <tr>
              <th className="p-4 text-right">المفتاح</th>
              <th className="p-4 text-right">الشركة</th>
              <th className="p-4 text-right">الخطة</th>
              <th className="p-4 text-right">ينتهي في</th>
              <th className="p-4 text-right">الحالة</th>
              <th className="p-4 text-right">إجراءات</th>
            </tr>
          </thead>
          <tbody>
            {licenses.length === 0 ? (
              <tr><td colSpan={6} className="p-8 text-center text-muted-foreground">لا توجد تراخيص بعد</td></tr>
            ) : licenses.map((l) => {
              const t = tenants.find((x) => x.id === l.tenant_id);
              const revoked = !!l.revoked_at;
              return (
                <tr key={l.id} className="border-t border-border hover:bg-secondary/30">
                  <td className="p-4">
                    <div className="flex items-center gap-2">
                      <code dir="ltr" className="text-xs font-mono font-bold">{l.license_key}</code>
                      <button onClick={() => { navigator.clipboard.writeText(l.license_key); toast.success("نُسخ"); }}>
                        <Copy className="h-3 w-3 text-muted-foreground hover:text-accent" />
                      </button>
                    </div>
                  </td>
                  <td className="p-4">{t?.name ?? <span className="text-muted-foreground">— بلا شركة —</span>}</td>
                  <td className="p-4"><span className="rounded-md bg-primary/10 px-2 py-1 text-xs font-bold text-primary uppercase">{l.plan_key}</span></td>
                  <td className="p-4 text-xs" dir="ltr">{l.expires_at ? new Date(l.expires_at).toLocaleDateString() : "بلا انتهاء"}</td>
                  <td className="p-4">
                    <span className={`rounded-md px-2 py-1 text-xs font-semibold ${revoked ? "bg-destructive/10 text-destructive" : "bg-success/10 text-success"}`}>
                      {revoked ? "ملغى" : "فعّال"}
                    </span>
                  </td>
                  <td className="p-4">
                    <div className="flex flex-wrap gap-1">
                      <Button size="sm" variant="outline" onClick={() => openEdit(l)}><Pencil className="h-3 w-3" /></Button>
                      {revoked
                        ? <Button size="sm" variant="outline" className="text-success" onClick={() => reactivate(l)}><PlayCircle className="h-3 w-3" /></Button>
                        : <Button size="sm" variant="outline" className="text-destructive" onClick={() => revoke(l)}><Ban className="h-3 w-3" /></Button>}
                      <Button size="sm" variant="outline" onClick={() => del(l)}><Trash2 className="h-3 w-3" /></Button>
                    </div>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent dir="rtl">
          <DialogHeader><DialogTitle>{edit ? "تعديل ترخيص" : "ترخيص جديد"}</DialogTitle></DialogHeader>
          <div className="space-y-3">
            <div>
              <Label>الشركة</Label>
              <select value={form.tenant_id} onChange={(e) => setForm({ ...form, tenant_id: e.target.value })} className="h-10 w-full rounded-md border border-border bg-background px-3 text-sm">
                <option value="">— بلا (مفتاح مستقل) —</option>
                {tenants.map((t) => <option key={t.id} value={t.id}>{t.name}</option>)}
              </select>
            </div>
            <div>
              <Label>الخطة</Label>
              <select value={form.plan_key} onChange={(e) => setForm({ ...form, plan_key: e.target.value })} className="h-10 w-full rounded-md border border-border bg-background px-3 text-sm">
                {plans.map((p) => <option key={p.key} value={p.key}>{p.name}</option>)}
              </select>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div><Label>حد المستخدمين</Label><Input type="number" value={form.max_users} onChange={(e) => setForm({ ...form, max_users: e.target.value })} /></div>
              <div><Label>حد المركبات</Label><Input type="number" value={form.max_vehicles} onChange={(e) => setForm({ ...form, max_vehicles: e.target.value })} /></div>
            </div>
            <div><Label>تاريخ الانتهاء</Label><Input type="date" value={form.expires_at} onChange={(e) => setForm({ ...form, expires_at: e.target.value })} /></div>
            <div><Label>ملاحظات</Label><Textarea rows={2} value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })} /></div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setOpen(false)}>إلغاء</Button>
            <Button onClick={save}>{edit ? "حفظ" : "إنشاء"}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}

/* ==================== Plans ==================== */
function PlansTab({ plans, onReload }: { plans: Plan[]; onReload: () => void }) {
  const [open, setOpen] = useState(false);
  const [edit, setEdit] = useState<Plan | null>(null);
  const [form, setForm] = useState({ key: "", name: "", price_monthly: "", price_yearly: "", max_users: "", max_vehicles: "", features: "", is_active: true, sort_order: "0" });

  function openNew() {
    setEdit(null);
    setForm({ key: "", name: "", price_monthly: "", price_yearly: "", max_users: "", max_vehicles: "", features: "", is_active: true, sort_order: "0" });
    setOpen(true);
  }
  function openEdit(p: Plan) {
    setEdit(p);
    setForm({
      key: p.key, name: p.name,
      price_monthly: p.price_monthly?.toString() ?? "",
      price_yearly: p.price_yearly?.toString() ?? "",
      max_users: p.max_users?.toString() ?? "",
      max_vehicles: p.max_vehicles?.toString() ?? "",
      features: (p.features ?? []).join("\n"),
      is_active: p.is_active,
      sort_order: p.sort_order?.toString() ?? "0",
    });
    setOpen(true);
  }
  async function save() {
    const payload = {
      key: form.key.trim(), name: form.name.trim(),
      price_monthly: form.price_monthly ? Number(form.price_monthly) : null,
      price_yearly: form.price_yearly ? Number(form.price_yearly) : null,
      max_users: form.max_users ? Number(form.max_users) : null,
      max_vehicles: form.max_vehicles ? Number(form.max_vehicles) : null,
      features: form.features.split("\n").map((s) => s.trim()).filter(Boolean),
      is_active: form.is_active, sort_order: Number(form.sort_order) || 0,
    };
    const res = edit
      ? await supabase.from("plans").update(payload).eq("id", edit.id)
      : await supabase.from("plans").insert(payload);
    if (res.error) return toast.error(res.error.message);
    toast.success("تم"); setOpen(false); onReload();
  }
  async function del(p: Plan) {
    if (!confirm(`حذف الخطة ${p.name}؟`)) return;
    const { error } = await supabase.from("plans").delete().eq("id", p.id);
    if (error) toast.error(error.message); else { toast.success("حُذفت"); onReload(); }
  }

  return (
    <>
      <PageHeader title="الخطط والأسعار" subtitle="إدارة كاملة لخطط الاشتراك"
        action={<Button onClick={openNew} className="gap-2 bg-accent text-accent-foreground hover:bg-accent/90"><Plus className="h-4 w-4" /> خطة جديدة</Button>} />

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        {plans.map((p) => (
          <div key={p.id} className={`rounded-2xl border p-5 ${p.is_active ? "border-border bg-card" : "border-dashed border-muted bg-muted/20 opacity-70"}`}>
            <div className="flex items-start justify-between">
              <div>
                <div className="text-xl font-black">{p.name}</div>
                <code dir="ltr" className="text-xs text-muted-foreground">{p.key}</code>
              </div>
              <div className="flex gap-1">
                <Button size="sm" variant="outline" onClick={() => openEdit(p)}><Pencil className="h-3 w-3" /></Button>
                <Button size="sm" variant="outline" onClick={() => del(p)} className="text-destructive"><Trash2 className="h-3 w-3" /></Button>
              </div>
            </div>
            <div className="mt-3 space-y-1 text-sm">
              <div className="flex items-center gap-2"><DollarSign className="h-3 w-3 text-success" /> شهري: <strong dir="ltr">{p.price_monthly ?? "مخصص"}</strong></div>
              <div className="flex items-center gap-2"><DollarSign className="h-3 w-3 text-success" /> سنوي: <strong dir="ltr">{p.price_yearly ?? "مخصص"}</strong></div>
              <div className="flex items-center gap-2"><Users2 className="h-3 w-3 text-primary" /> مستخدمون: {p.max_users ?? "∞"}</div>
              <div className="flex items-center gap-2"><Building2 className="h-3 w-3 text-primary" /> مركبات: {p.max_vehicles ?? "∞"}</div>
            </div>
            <ul className="mt-3 space-y-1 text-xs text-muted-foreground">
              {(p.features ?? []).map((f, i) => <li key={i} className="flex gap-1"><Check className="h-3 w-3 text-success" /> {f}</li>)}
            </ul>
          </div>
        ))}
      </div>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent dir="rtl" className="max-h-[90vh] overflow-y-auto">
          <DialogHeader><DialogTitle>{edit ? "تعديل خطة" : "خطة جديدة"}</DialogTitle></DialogHeader>
          <div className="space-y-3">
            <div className="grid grid-cols-2 gap-3">
              <div><Label>المفتاح (بالإنجليزية)</Label><Input dir="ltr" value={form.key} onChange={(e) => setForm({ ...form, key: e.target.value })} disabled={!!edit} /></div>
              <div><Label>الاسم</Label><Input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} /></div>
              <div><Label>سعر شهري</Label><Input type="number" value={form.price_monthly} onChange={(e) => setForm({ ...form, price_monthly: e.target.value })} /></div>
              <div><Label>سعر سنوي</Label><Input type="number" value={form.price_yearly} onChange={(e) => setForm({ ...form, price_yearly: e.target.value })} /></div>
              <div><Label>حد المستخدمين</Label><Input type="number" value={form.max_users} onChange={(e) => setForm({ ...form, max_users: e.target.value })} /></div>
              <div><Label>حد المركبات</Label><Input type="number" value={form.max_vehicles} onChange={(e) => setForm({ ...form, max_vehicles: e.target.value })} /></div>
              <div><Label>ترتيب</Label><Input type="number" value={form.sort_order} onChange={(e) => setForm({ ...form, sort_order: e.target.value })} /></div>
              <div className="flex items-end"><label className="flex items-center gap-2 text-sm"><input type="checkbox" checked={form.is_active} onChange={(e) => setForm({ ...form, is_active: e.target.checked })} /> فعّالة</label></div>
            </div>
            <div><Label>المزايا (سطر لكل ميزة)</Label><Textarea rows={5} value={form.features} onChange={(e) => setForm({ ...form, features: e.target.value })} /></div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setOpen(false)}>إلغاء</Button>
            <Button onClick={save}>حفظ</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}

/* ==================== Requests ==================== */
function RequestsTab({ requests, plans, onReload }: { requests: BillingRequest[]; plans: Plan[]; onReload: () => void }) {
  const [busy, setBusy] = useState<string | null>(null);
  async function decide(r: BillingRequest, status: "approved" | "rejected") {
    setBusy(r.id);
    try {
      if (status === "approved") {
        const plan = plans.find((p) => p.key === r.requested_plan);
        const now = new Date();
        const endsAt = new Date(now);
        if (r.billing_cycle === "yearly") endsAt.setFullYear(endsAt.getFullYear() + 1);
        else endsAt.setMonth(endsAt.getMonth() + 1);
        const { data: existing } = await supabase.from("subscriptions").select("id").eq("tenant_id", r.tenant_id).order("created_at", { ascending: false }).limit(1).maybeSingle();
        const payload = {
          plan: r.requested_plan as any, status: "active",
          starts_at: now.toISOString(), ends_at: endsAt.toISOString(),
          max_users: plan?.max_users ?? null, max_vehicles: plan?.max_vehicles ?? null,
          price_monthly: plan?.price_monthly ?? null,
        };
        if (existing?.id) await supabase.from("subscriptions").update(payload).eq("id", existing.id);
        else await supabase.from("subscriptions").insert({ tenant_id: r.tenant_id, ...payload });
        await supabase.from("tenants").update({ status: r.requested_plan === "trial" ? "trial" : "active" }).eq("id", r.tenant_id);
      }
      await supabase.from("billing_requests").update({ status }).eq("id", r.id);
      toast.success(status === "approved" ? "تم القبول" : "تم الرفض");
      onReload();
    } finally { setBusy(null); }
  }
  return (
    <>
      <PageHeader title="طلبات الفوترة" subtitle="ترقيات وطلبات تغيير الاشتراك" />
      <div className="rounded-2xl border border-border bg-card overflow-x-auto">
        <table className="w-full text-sm">
          <thead className="bg-secondary/50 text-xs uppercase text-muted-foreground">
            <tr>
              <th className="p-4 text-right">الشركة</th>
              <th className="p-4 text-right">من</th>
              <th className="p-4 text-right">إلى</th>
              <th className="p-4 text-right">الدورة</th>
              <th className="p-4 text-right">الحالة</th>
              <th className="p-4 text-right">إجراء</th>
            </tr>
          </thead>
          <tbody>
            {requests.length === 0 ? (
              <tr><td colSpan={6} className="p-8 text-center text-muted-foreground">لا توجد طلبات</td></tr>
            ) : requests.map((r) => (
              <tr key={r.id} className="border-t border-border">
                <td className="p-4 font-semibold">{r.tenants?.name ?? "—"}</td>
                <td className="p-4 uppercase">{r.current_plan}</td>
                <td className="p-4 uppercase text-primary font-semibold">{r.requested_plan}</td>
                <td className="p-4">{r.billing_cycle === "yearly" ? "سنوي" : "شهري"}</td>
                <td className="p-4"><span className={`rounded-md px-2 py-1 text-xs font-semibold ${r.status === "pending" ? "bg-accent/10 text-accent" : r.status === "approved" ? "bg-success/10 text-success" : "bg-secondary text-muted-foreground"}`}>{r.status}</span></td>
                <td className="p-4">
                  {r.status === "pending" && (
                    <div className="flex gap-1">
                      <Button size="sm" onClick={() => decide(r, "approved")} disabled={busy === r.id} className="bg-success text-success-foreground hover:bg-success/90"><Check className="h-3 w-3" /></Button>
                      <Button size="sm" variant="outline" onClick={() => decide(r, "rejected")} disabled={busy === r.id} className="text-destructive"><X className="h-3 w-3" /></Button>
                    </div>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </>
  );
}

/* ==================== Report ==================== */
function ReportTab({ stats, userCount, plans, licenses }: any) {
  const items = [
    { g: "✅ مكتمل", label: "لوحة مالك النظام (حساب حصري + قفل الدور بالتريغرات)" },
    { g: "✅ مكتمل", label: "فصل اسم المستخدم عن البريد (اختياري، دخول بأيهما)" },
    { g: "✅ مكتمل", label: "إدارة الخطط والأسعار — CRUD كامل" },
    { g: "✅ مكتمل", label: "إدارة التراخيص — إنشاء/تعديل/إلغاء/إعادة تفعيل مع توليد المفتاح تلقائياً" },
    { g: "✅ مكتمل", label: "إدارة الاشتراكات — تمديد/إيقاف/تفعيل/تغيير الخطة" },
    { g: "✅ مكتمل", label: "إدارة الشركات (Tenants) — تعليق/تفعيل/حذف" },
    { g: "✅ مكتمل", label: "إدارة الفترة التجريبية عبر tenants.status + subscriptions.ends_at" },
    { g: "✅ مكتمل", label: "طلبات الفوترة — قبول/رفض من طرف مالك النظام" },
    { g: "✅ مكتمل", label: "بوابة العميل + تطبيق السائق + توجيه ذكي حسب الدور" },
    { g: "✅ مكتمل", label: "أتمتة (ترقيم عقود/رحلات/أوامر + Audit + Cron تنبيهات)" },
    { g: "✅ مكتمل", label: "التقارير الاحترافية + الطباعة بالشعار" },
    { g: "✅ مكتمل", label: "RLS مطبقة على كل الجداول + دالة has_role/is_system_owner" },
    { g: "⚠️ إعداد يدوي", label: "Stripe — تفعيل مفاتيح الإنتاج من إعدادات Stripe" },
    { g: "⚠️ إعداد يدوي", label: "تغيير كلمة مرور مالك النظام الأولى (SaifoOwner2026!) بعد أول دخول" },
    { g: "⚠️ إعداد يدوي", label: "إعداد Google OAuth إن رغب المستخدم في تفعيله" },
    { g: "ℹ️ ملاحظة", label: "معلومات الاتصال لمالك النظام: otnaj.2017@gmail.com (للاسترجاع فقط)" },
  ];
  return (
    <>
      <PageHeader title="تقرير الجاهزية" subtitle={`مستخدمون: ${userCount} · شركات: ${stats.active + stats.trial + stats.suspended} · تراخيص: ${licenses.length} · خطط: ${plans.length}`} />
      <div className="rounded-2xl border border-border bg-card">
        <ul className="divide-y divide-border">
          {items.map((it, i) => (
            <li key={i} className="flex items-start gap-3 p-4">
              <span className="mt-0.5 text-xs font-bold whitespace-nowrap">{it.g}</span>
              <span className="text-sm">{it.label}</span>
            </li>
          ))}
        </ul>
      </div>
      <div className="mt-6 rounded-2xl border border-accent/40 bg-accent/5 p-5 text-sm">
        <p className="font-bold text-accent mb-2">حساب مالك النظام</p>
        <p>البريد: <code dir="ltr">otnaj.2017@gmail.com</code></p>
        <p>كلمة المرور المؤقتة: <code dir="ltr">SaifoOwner2026!</code></p>
        <p className="mt-2 text-xs text-muted-foreground">
          هذا الحساب محمي على مستوى قاعدة البيانات — لا يمكن إنشاء ثانٍ أو نسخه أو ترقيته أو حذفه من داخل التطبيق.
        </p>
      </div>
    </>
  );
}
