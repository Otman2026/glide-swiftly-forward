import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { PageHeader, EmptyState } from "@/components/dashboard-layout";
import { FileText, Plus, Search, Trash2, Loader2, Printer, RefreshCw, Ban, Download } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { exportToCSV } from "@/lib/csv";
import { printHTML, esc } from "@/lib/print";

export const Route = createFileRoute("/app/contracts")({ component: ContractsPage });

type Status = "draft" | "active" | "expired" | "cancelled";
type Contract = {
  id: string; contract_number: string; title: string; description: string | null;
  status: Status; start_date: string | null; end_date: string | null;
  value: number | null; currency: string | null; customer_id: string;
  customers?: { name: string } | null;
};

const STATUS_LABEL: Record<Status, string> = { draft: "مسودة", active: "نشط", expired: "منتهي", cancelled: "ملغى" };
const STATUS_COLOR: Record<Status, string> = {
  draft: "bg-muted text-muted-foreground",
  active: "bg-success/10 text-success",
  expired: "bg-warning/10 text-warning-foreground",
  cancelled: "bg-destructive/10 text-destructive",
};

const emptyForm = { contract_number: "", title: "", customer_id: "", status: "draft" as Status,
  start_date: "", end_date: "", value: "", currency: "MAD", description: "" };

function ContractsPage() {
  const [rows, setRows] = useState<Contract[]>([]);
  const [customers, setCustomers] = useState<{ id: string; name: string }[]>([]);
  const [loading, setLoading] = useState(true);
  const [q, setQ] = useState("");
  const [statusFilter, setStatusFilter] = useState<"all" | Status>("all");
  const [open, setOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [editId, setEditId] = useState<string | null>(null);
  const [form, setForm] = useState(emptyForm);

  const load = async () => {
    setLoading(true);
    const [c, cust] = await Promise.all([
      supabase.from("contracts")
        .select("id,contract_number,title,description,status,start_date,end_date,value,currency,customer_id,customers(name)")
        .order("created_at", { ascending: false }),
      supabase.from("customers").select("id,name").order("name"),
    ]);
    if (c.error) toast.error(c.error.message);
    else setRows((c.data ?? []) as unknown as Contract[]);
    setCustomers(cust.data ?? []);
    setLoading(false);
  };
  useEffect(() => { load(); }, []);

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.customer_id) return toast.error("اختر عميلاً");
    setSaving(true);
    const payload = {
      customer_id: form.customer_id, contract_number: form.contract_number, title: form.title,
      description: form.description || null, status: form.status,
      start_date: form.start_date || null, end_date: form.end_date || null,
      value: form.value ? Number(form.value) : null, currency: form.currency,
    };
    if (editId) {
      const { error } = await supabase.from("contracts").update(payload).eq("id", editId);
      setSaving(false);
      if (error) return toast.error(error.message);
      toast.success("تم التحديث");
    } else {
      const { data: profile } = await supabase.from("profiles").select("tenant_id").maybeSingle();
      if (!profile?.tenant_id) { toast.error("لا توجد شركة"); setSaving(false); return; }
      const { error } = await supabase.from("contracts").insert({ ...payload, tenant_id: profile.tenant_id });
      setSaving(false);
      if (error) return toast.error(error.message);
      toast.success("تم إنشاء العقد");
    }
    setOpen(false); setEditId(null); setForm(emptyForm); load();
  };

  const onDelete = async (id: string) => {
    if (!confirm("حذف هذا العقد؟")) return;
    const { error } = await supabase.from("contracts").delete().eq("id", id);
    if (error) toast.error(error.message); else { toast.success("تم الحذف"); load(); }
  };

  const onEnd = async (c: Contract) => {
    if (!confirm(`إنهاء العقد ${c.contract_number}؟`)) return;
    const today = new Date().toISOString().slice(0, 10);
    const { error } = await supabase.from("contracts").update({
      status: "expired", end_date: c.end_date ?? today,
    }).eq("id", c.id);
    if (error) toast.error(error.message); else { toast.success("تم إنهاء العقد"); load(); }
  };

  const onRenew = async (c: Contract) => {
    if (!confirm(`تجديد العقد ${c.contract_number} لمدة سنة؟`)) return;
    const { data: profile } = await supabase.from("profiles").select("tenant_id").maybeSingle();
    if (!profile?.tenant_id) return toast.error("لا توجد شركة");
    const start = new Date();
    const end = new Date(); end.setFullYear(end.getFullYear() + 1);
    const { error } = await supabase.from("contracts").insert({
      tenant_id: profile.tenant_id, customer_id: c.customer_id,
      contract_number: `${c.contract_number}-R${new Date().getFullYear()}`,
      title: `${c.title} (تجديد)`, description: c.description,
      status: "active", start_date: start.toISOString().slice(0, 10),
      end_date: end.toISOString().slice(0, 10), value: c.value, currency: c.currency,
    });
    if (error) toast.error(error.message); else { toast.success("تم إنشاء عقد التجديد"); load(); }
  };

  const onPrint = (c: Contract) => {
    printHTML(`عقد — ${c.contract_number}`, `
      <h1>عقد نقل رقم ${esc(c.contract_number)}</h1>
      <h2>${esc(c.title)}</h2>
      <dl class="kv">
        <dt>العميل</dt><dd>${esc(c.customers?.name)}</dd>
        <dt>الحالة</dt><dd>${esc(STATUS_LABEL[c.status])}</dd>
        <dt>تاريخ البداية</dt><dd dir="ltr">${esc(c.start_date)}</dd>
        <dt>تاريخ النهاية</dt><dd dir="ltr">${esc(c.end_date)}</dd>
        <dt>القيمة</dt><dd>${c.value ? `${Number(c.value).toLocaleString()} ${esc(c.currency)}` : "—"}</dd>
        <dt>الوصف</dt><dd>${esc(c.description)}</dd>
      </dl>
      <div style="margin-top:60px;display:flex;justify-content:space-between;font-size:13px">
        <div>توقيع الشركة: ______________________</div>
        <div>توقيع العميل: ______________________</div>
      </div>`);
  };

  const openEdit = (c: Contract) => {
    setEditId(c.id);
    setForm({
      contract_number: c.contract_number, title: c.title, customer_id: c.customer_id, status: c.status,
      start_date: c.start_date ?? "", end_date: c.end_date ?? "",
      value: c.value ? String(c.value) : "", currency: c.currency ?? "MAD", description: c.description ?? "",
    });
    setOpen(true);
  };
  const openNew = () => { setEditId(null); setForm(emptyForm); setOpen(true); };

  const onExport = () => {
    if (filtered.length === 0) return toast.error("لا توجد بيانات");
    exportToCSV(filtered, [
      { key: "contract_number", label: "الرقم" },
      { key: "title", label: "العنوان" },
      { key: "customer", label: "العميل", get: (r) => r.customers?.name ?? "" },
      { key: "status", label: "الحالة", get: (r) => STATUS_LABEL[r.status] },
      { key: "start_date", label: "من" },
      { key: "end_date", label: "إلى" },
      { key: "value", label: "القيمة" },
      { key: "currency", label: "العملة" },
    ], `contracts-${new Date().toISOString().slice(0, 10)}`);
    toast.success("تم التصدير");
  };

  const filtered = rows.filter((r) => {
    if (statusFilter !== "all" && r.status !== statusFilter) return false;
    if (!q) return true;
    return (r.title + " " + r.contract_number + " " + (r.customers?.name ?? "")).toLowerCase().includes(q.toLowerCase());
  });

  return (
    <>
      <PageHeader title="العقود" subtitle="إدارة عقود العملاء: النشطة، المسودة، المنتهية"
        action={
          <div className="flex gap-2">
            <Button variant="outline" onClick={onExport} className="gap-2"><Download className="h-4 w-4" /> CSV</Button>
            <Button onClick={openNew} className="gap-2 bg-accent text-accent-foreground hover:bg-accent/90">
              <Plus className="h-4 w-4" /> عقد جديد
            </Button>
          </div>
        }
      />

      <Dialog open={open} onOpenChange={(o) => { setOpen(o); if (!o) { setEditId(null); setForm(emptyForm); } }}>
        <DialogContent dir="rtl" className="max-w-2xl">
          <DialogHeader><DialogTitle>{editId ? "تعديل العقد" : "إنشاء عقد"}</DialogTitle></DialogHeader>
          {customers.length === 0 ? (
            <p className="text-sm text-muted-foreground">أضف عميلاً أولاً من شاشة CRM.</p>
          ) : (
            <form onSubmit={onSubmit} className="space-y-4">
              <div className="grid grid-cols-2 gap-3">
                <div><Label>رقم العقد *</Label>
                  <Input required dir="ltr" value={form.contract_number} onChange={(e) => setForm({ ...form, contract_number: e.target.value })} /></div>
                <div><Label>العميل *</Label>
                  <Select value={form.customer_id} onValueChange={(v) => setForm({ ...form, customer_id: v })}>
                    <SelectTrigger><SelectValue placeholder="اختر" /></SelectTrigger>
                    <SelectContent>{customers.map((c) => <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>)}</SelectContent>
                  </Select></div>
              </div>
              <div><Label>عنوان العقد *</Label>
                <Input required value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} /></div>
              <div><Label>الوصف</Label>
                <textarea rows={2} value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })}
                  className="w-full rounded-md border border-border bg-background px-3 py-2 text-sm" /></div>
              <div className="grid grid-cols-2 gap-3">
                <div><Label>تاريخ البداية</Label>
                  <Input type="date" value={form.start_date} onChange={(e) => setForm({ ...form, start_date: e.target.value })} /></div>
                <div><Label>تاريخ النهاية</Label>
                  <Input type="date" value={form.end_date} onChange={(e) => setForm({ ...form, end_date: e.target.value })} /></div>
              </div>
              <div className="grid grid-cols-3 gap-3">
                <div className="col-span-2"><Label>القيمة</Label>
                  <Input type="number" step="0.01" value={form.value} onChange={(e) => setForm({ ...form, value: e.target.value })} /></div>
                <div><Label>العملة</Label>
                  <Input value={form.currency} onChange={(e) => setForm({ ...form, currency: e.target.value })} /></div>
              </div>
              <div><Label>الحالة</Label>
                <Select value={form.status} onValueChange={(v) => setForm({ ...form, status: v as Status })}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>{Object.entries(STATUS_LABEL).map(([k, l]) => <SelectItem key={k} value={k}>{l}</SelectItem>)}</SelectContent>
                </Select></div>
              <DialogFooter>
                <Button type="submit" disabled={saving} className="gap-2 bg-accent text-accent-foreground hover:bg-accent/90">
                  {saving && <Loader2 className="h-4 w-4 animate-spin" />} حفظ
                </Button>
              </DialogFooter>
            </form>
          )}
        </DialogContent>
      </Dialog>

      <div className="mb-4 flex flex-wrap items-center gap-3">
        <div className="relative flex-1 min-w-64 max-w-md">
          <Search className="pointer-events-none absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="بحث برقم/عنوان/عميل..."
            className="h-10 w-full rounded-lg border border-border bg-card pr-10 pl-4 text-sm focus:border-accent focus:outline-none focus:ring-2 focus:ring-accent/20" />
        </div>
        <Select value={statusFilter} onValueChange={(v) => setStatusFilter(v as "all" | Status)}>
          <SelectTrigger className="w-40"><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">كل الحالات</SelectItem>
            {Object.entries(STATUS_LABEL).map(([k, l]) => <SelectItem key={k} value={k}>{l}</SelectItem>)}
          </SelectContent>
        </Select>
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-16"><Loader2 className="h-6 w-6 animate-spin text-accent" /></div>
      ) : filtered.length === 0 ? (
        <EmptyState icon={FileText} title="لا توجد عقود" description="أنشئ أول عقد مع عملائك من زر (عقد جديد)." />
      ) : (
        <div className="rounded-2xl border border-border bg-card overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-secondary/50 text-xs uppercase text-muted-foreground">
              <tr>
                <th className="p-4 text-right font-semibold">الرقم</th>
                <th className="p-4 text-right font-semibold">العنوان</th>
                <th className="p-4 text-right font-semibold">العميل</th>
                <th className="p-4 text-right font-semibold">من</th>
                <th className="p-4 text-right font-semibold">إلى</th>
                <th className="p-4 text-right font-semibold">القيمة</th>
                <th className="p-4 text-right font-semibold">الحالة</th>
                <th className="p-4 text-right font-semibold">إجراءات</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((c) => (
                <tr key={c.id} className="border-t border-border hover:bg-secondary/30">
                  <td className="p-4 font-mono font-semibold text-primary" dir="ltr">{c.contract_number}</td>
                  <td className="p-4 font-semibold">{c.title}</td>
                  <td className="p-4">{c.customers?.name ?? "—"}</td>
                  <td className="p-4" dir="ltr">{c.start_date ?? "—"}</td>
                  <td className="p-4" dir="ltr">{c.end_date ?? "—"}</td>
                  <td className="p-4 font-semibold">{c.value ? `${Number(c.value).toLocaleString()} ${c.currency}` : "—"}</td>
                  <td className="p-4">
                    <span className={`inline-flex rounded-md px-2 py-1 text-xs font-semibold ${STATUS_COLOR[c.status]}`}>
                      {STATUS_LABEL[c.status]}
                    </span>
                  </td>
                  <td className="p-4">
                    <div className="flex gap-1">
                      <Button variant="ghost" size="sm" onClick={() => openEdit(c)} title="تعديل">تعديل</Button>
                      <Button variant="ghost" size="sm" onClick={() => onRenew(c)} title="تجديد" className="text-primary"><RefreshCw className="h-4 w-4" /></Button>
                      {c.status !== "expired" && c.status !== "cancelled" && (
                        <Button variant="ghost" size="sm" onClick={() => onEnd(c)} title="إنهاء" className="text-warning-foreground"><Ban className="h-4 w-4" /></Button>
                      )}
                      <Button variant="ghost" size="sm" onClick={() => onPrint(c)} title="طباعة"><Printer className="h-4 w-4" /></Button>
                      <Button variant="ghost" size="sm" onClick={() => onDelete(c.id)} title="حذف"
                        className="text-destructive hover:bg-destructive/10 hover:text-destructive"><Trash2 className="h-4 w-4" /></Button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </>
  );
}
