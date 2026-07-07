import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { PageHeader, EmptyState } from "@/components/dashboard-layout";
import { Shield, Loader2, Trash2, Plus, Users as UsersIcon, Ban, CheckCircle2, KeyRound } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle, DialogTrigger,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { sendPasswordReset } from "@/lib/admin.functions";

export const Route = createFileRoute("/app/users")({
  component: UsersPage,
});

const ROLES = [
  { key: "company_admin", label: "مدير الشركة", color: "bg-primary/10 text-primary" },
  { key: "ops_manager", label: "مدير العمليات", color: "bg-accent/10 text-accent" },
  { key: "fleet_manager", label: "مسؤول الأسطول", color: "bg-blue-500/10 text-blue-600" },
  { key: "maintenance", label: "مسؤول الصيانة", color: "bg-orange-500/10 text-orange-600" },
  { key: "accountant", label: "المحاسب", color: "bg-emerald-500/10 text-emerald-600" },
  { key: "receptionist", label: "الاستقبال", color: "bg-purple-500/10 text-purple-600" },
  { key: "driver", label: "السائق", color: "bg-muted text-muted-foreground" },
] as const;

type Member = {
  user_id: string;
  full_name: string | null;
  email: string | null;
  customer_id: string | null;
  driver_id: string | null;
  disabled_at: string | null;
  disabled_reason: string | null;
  roles: string[];
};

function UsersPage() {
  const [rows, setRows] = useState<Member[]>([]);
  const [loading, setLoading] = useState(true);
  const [open, setOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [tenantId, setTenantId] = useState<string | null>(null);
  const [form, setForm] = useState({ email: "", role: "receptionist" });
  const [customers, setCustomers] = useState<{ id: string; name: string }[]>([]);
  const [drivers, setDrivers] = useState<{ id: string; full_name: string }[]>([]);
  const [linking, setLinking] = useState<Member | null>(null);
  const [linkForm, setLinkForm] = useState({ customer_id: "", driver_id: "" });

  const load = async () => {
    setLoading(true);
    const { data: u } = await supabase.auth.getUser();
    if (!u.user) return;
    const { data: myProfile } = await supabase.from("profiles").select("tenant_id").eq("id", u.user.id).maybeSingle();
    const tid = myProfile?.tenant_id ?? null;
    setTenantId(tid);
    if (!tid) { setLoading(false); return; }

    const { data: profiles } = await supabase
      .from("profiles")
      .select("id,full_name,email,customer_id,driver_id,disabled_at,disabled_reason")
      .eq("tenant_id", tid);
    const { data: roles } = await supabase
      .from("user_roles")
      .select("user_id,role")
      .eq("tenant_id", tid);

    const map = new Map<string, Member>();
    (profiles ?? []).forEach((p: any) => map.set(p.id, { user_id: p.id, full_name: p.full_name, email: p.email, customer_id: p.customer_id, driver_id: p.driver_id, disabled_at: p.disabled_at, disabled_reason: p.disabled_reason, roles: [] }));
    (roles ?? []).forEach(r => {
      const m = map.get(r.user_id);
      if (m) m.roles.push(r.role);
      else map.set(r.user_id, { user_id: r.user_id, full_name: null, email: null, customer_id: null, driver_id: null, disabled_at: null, disabled_reason: null, roles: [r.role] });
    });
    setRows(Array.from(map.values()));
    setLoading(false);
  };

  useEffect(() => {
    load();
    (async () => {
      const [{ data: c }, { data: d }] = await Promise.all([
        supabase.from("customers").select("id, name").order("name"),
        supabase.from("drivers").select("id, full_name").order("full_name"),
      ]);
      setCustomers((c ?? []) as { id: string; name: string }[]);
      setDrivers((d ?? []) as { id: string; full_name: string }[]);
    })();
  }, []);

  function openLink(m: Member) {
    setLinking(m);
    setLinkForm({ customer_id: m.customer_id ?? "", driver_id: m.driver_id ?? "" });
  }

  async function saveLink() {
    if (!linking) return;
    const { error } = await supabase.from("profiles").update({
      customer_id: linkForm.customer_id || null,
      driver_id: linkForm.driver_id || null,
    }).eq("id", linking.user_id);
    if (error) return toast.error(error.message);
    toast.success("تم الحفظ");
    setLinking(null);
    load();
  }

  const assignRole = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!tenantId) return;
    setSaving(true);
    const { data: prof, error: perr } = await supabase
      .from("profiles").select("id").eq("email", form.email.trim()).maybeSingle();
    if (perr || !prof) {
      toast.error("لم يتم العثور على مستخدم بهذا البريد. يجب أن يسجل حساباً أولاً.");
      setSaving(false);
      return;
    }
    const { error } = await supabase.from("user_roles").insert({
      user_id: prof.id, tenant_id: tenantId, role: form.role as any,
    });
    setSaving(false);
    if (error) { toast.error(error.message); return; }
    await supabase.from("profiles").update({ tenant_id: tenantId }).eq("id", prof.id);
    toast.success("تم إسناد الدور");
    setOpen(false);
    setForm({ email: "", role: "receptionist" });
    load();
  };

  const removeRole = async (userId: string, role: string) => {
    if (!tenantId) return;
    if (!confirm(`إزالة دور "${ROLES.find(r => r.key === role)?.label ?? role}"؟`)) return;
    const { error } = await supabase.from("user_roles").delete()
      .eq("user_id", userId).eq("tenant_id", tenantId).eq("role", role as any);
    if (error) toast.error(error.message);
    else { toast.success("تمت الإزالة"); load(); }
  };

  const toggleDisabled = async (m: Member) => {
    const isDisabled = !!m.disabled_at;
    let reason: string | null = null;
    if (!isDisabled) {
      reason = prompt("سبب التعطيل (اختياري):") ?? "";
      if (reason === null) return;
    } else if (!confirm(`إعادة تفعيل ${m.full_name ?? m.email}؟`)) return;
    const { error } = await supabase.from("profiles").update({
      disabled_at: isDisabled ? null : new Date().toISOString(),
      disabled_reason: isDisabled ? null : (reason || null),
    }).eq("id", m.user_id);
    if (error) return toast.error(error.message);
    toast.success(isDisabled ? "تم التفعيل" : "تم التعطيل");
    load();
  };


  return (
    <>
      <PageHeader
        title="المستخدمون والصلاحيات"
        subtitle="إدارة الفريق وإسناد الأدوار"
        action={
          <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger asChild>
              <Button className="gap-2 bg-accent text-accent-foreground hover:bg-accent/90">
                <Plus className="h-4 w-4" /> إسناد دور
              </Button>
            </DialogTrigger>
            <DialogContent dir="rtl">
              <DialogHeader><DialogTitle>إسناد دور لمستخدم</DialogTitle></DialogHeader>
              <form onSubmit={assignRole} className="space-y-4">
                <div className="rounded-lg border border-border bg-muted/30 p-3 text-xs text-muted-foreground">
                  يجب على المستخدم إنشاء حساب في المنصة أولاً، ثم أدخل بريده هنا لإسناد الدور.
                </div>
                <div><Label>البريد الإلكتروني *</Label><Input type="email" required dir="ltr" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} /></div>
                <div>
                  <Label>الدور *</Label>
                  <select value={form.role} onChange={(e) => setForm({ ...form, role: e.target.value })} className="h-10 w-full rounded-md border border-border bg-background px-3 text-sm">
                    {ROLES.map(r => <option key={r.key} value={r.key}>{r.label}</option>)}
                  </select>
                </div>
                <DialogFooter>
                  <Button type="submit" disabled={saving} className="gap-2 bg-accent text-accent-foreground hover:bg-accent/90">
                    {saving && <Loader2 className="h-4 w-4 animate-spin" />} إسناد
                  </Button>
                </DialogFooter>
              </form>
            </DialogContent>
          </Dialog>
        }
      />

      {loading ? (
        <div className="flex items-center justify-center py-16"><Loader2 className="h-6 w-6 animate-spin text-accent" /></div>
      ) : rows.length === 0 ? (
        <EmptyState icon={UsersIcon} title="لا يوجد أعضاء" description="ابدأ بإسناد دور لأحد أعضاء فريقك." />
      ) : (
        <div className="rounded-2xl border border-border bg-card overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-secondary/50 text-xs uppercase text-muted-foreground">
              <tr>
                <th className="p-4 text-right font-semibold">الاسم</th>
                <th className="p-4 text-right font-semibold">البريد</th>
                <th className="p-4 text-right font-semibold">الحالة</th>
                <th className="p-4 text-right font-semibold">الأدوار</th>
                <th className="p-4 text-right font-semibold">الربط</th>
                <th className="p-4 text-right font-semibold">إجراءات</th>
              </tr>
            </thead>
            <tbody>
              {rows.map(m => {
                const cust = m.customer_id ? customers.find(c => c.id === m.customer_id)?.name : null;
                const drv = m.driver_id ? drivers.find(d => d.id === m.driver_id)?.full_name : null;
                const disabled = !!m.disabled_at;
                return (
                  <tr key={m.user_id} className={`border-t border-border hover:bg-secondary/30 ${disabled ? "opacity-60" : ""}`}>
                    <td className="p-4 font-semibold">{m.full_name ?? "—"}</td>
                    <td className="p-4 text-muted-foreground" dir="ltr">{m.email ?? "—"}</td>
                    <td className="p-4">
                      {disabled ? (
                        <span className="inline-flex items-center gap-1 rounded-full bg-destructive/10 px-2 py-1 text-xs font-bold text-destructive" title={m.disabled_reason ?? ""}>
                          <Ban className="h-3 w-3" /> معطل
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1 rounded-full bg-success/10 px-2 py-1 text-xs font-bold text-success">
                          <CheckCircle2 className="h-3 w-3" /> نشط
                        </span>
                      )}
                    </td>
                    <td className="p-4">
                      <div className="flex flex-wrap gap-2">
                        {m.roles.length === 0 && <span className="text-xs text-muted-foreground">لا توجد أدوار</span>}
                        {m.roles.map(r => {
                          const meta = ROLES.find(x => x.key === r);
                          return (
                            <span key={r} className={`inline-flex items-center gap-1 rounded-full px-3 py-1 text-xs font-semibold ${meta?.color ?? "bg-muted"}`}>
                              <Shield className="h-3 w-3" /> {meta?.label ?? r}
                              <button onClick={() => removeRole(m.user_id, r)} className="mr-1 hover:text-destructive">
                                <Trash2 className="h-3 w-3" />
                              </button>
                            </span>
                          );
                        })}
                      </div>
                    </td>
                    <td className="p-4 text-xs">
                      <div className="space-y-1">
                        {cust && <div className="text-primary">عميل: {cust}</div>}
                        {drv && <div className="text-accent">سائق: {drv}</div>}
                        {!cust && !drv && <div className="text-muted-foreground">—</div>}
                      </div>
                    </td>
                    <td className="p-4">
                      <div className="flex flex-wrap gap-2">
                        <Button size="sm" variant="outline" onClick={() => openLink(m)}>ربط</Button>
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={async () => {
                            try {
                              const r = await sendPasswordReset({ data: { targetUserId: m.user_id } });
                              toast.success(`تم إرسال رابط إعادة التعيين إلى ${r.email}`);
                            } catch (e) {
                              toast.error((e as Error).message);
                            }
                          }}
                        >
                          <KeyRound className="h-3 w-3" /> كلمة المرور
                        </Button>
                        <Button
                          size="sm"
                          variant={disabled ? "default" : "outline"}
                          onClick={() => toggleDisabled(m)}
                          className={disabled ? "bg-success text-success-foreground hover:bg-success/90" : "text-destructive hover:bg-destructive/10"}
                        >
                          {disabled ? <><CheckCircle2 className="h-3 w-3" /> تفعيل</> : <><Ban className="h-3 w-3" /> تعطيل</>}
                        </Button>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      <Dialog open={!!linking} onOpenChange={(v) => !v && setLinking(null)}>
        <DialogContent dir="rtl">
          <DialogHeader><DialogTitle>ربط المستخدم بعميل أو سائق</DialogTitle></DialogHeader>
          <div className="space-y-4">
            <div className="rounded-lg border border-border bg-muted/30 p-3 text-xs text-muted-foreground">
              اربط المستخدم بسجل عميل ليصل إلى بوابة العملاء، أو بسجل سائق ليصل إلى تطبيق السائق.
            </div>
            <div>
              <Label>العميل</Label>
              <select value={linkForm.customer_id} onChange={(e) => setLinkForm({ ...linkForm, customer_id: e.target.value })} className="h-10 w-full rounded-md border border-border bg-background px-3 text-sm">
                <option value="">— بلا —</option>
                {customers.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
              </select>
            </div>
            <div>
              <Label>السائق</Label>
              <select value={linkForm.driver_id} onChange={(e) => setLinkForm({ ...linkForm, driver_id: e.target.value })} className="h-10 w-full rounded-md border border-border bg-background px-3 text-sm">
                <option value="">— بلا —</option>
                {drivers.map(d => <option key={d.id} value={d.id}>{d.full_name}</option>)}
              </select>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setLinking(null)}>إلغاء</Button>
            <Button onClick={saveLink}>حفظ</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
