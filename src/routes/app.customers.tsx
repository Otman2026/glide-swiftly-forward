import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { PageHeader, EmptyState } from "@/components/dashboard-layout";
import { Users, Plus, Search, Trash2, Loader2, Printer, Download, Pencil } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle, DialogTrigger,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { exportToCSV } from "@/lib/csv";
import { printHTML, esc } from "@/lib/print";

export const Route = createFileRoute("/app/customers")({ component: CustomersPage });

type Customer = {
  id: string; name: string; email: string | null; phone: string | null;
  city: string | null; country: string | null; tax_id: string | null;
  address: string | null; notes: string | null; created_at: string;
};

const empty = { name: "", email: "", phone: "", city: "", country: "المغرب", tax_id: "", address: "", notes: "" };

function CustomersPage() {
  const [rows, setRows] = useState<Customer[]>([]);
  const [loading, setLoading] = useState(true);
  const [q, setQ] = useState("");
  const [open, setOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [editId, setEditId] = useState<string | null>(null);
  const [form, setForm] = useState(empty);

  const load = async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from("customers")
      .select("id,name,email,phone,city,country,tax_id,address,notes,created_at")
      .order("created_at", { ascending: false });
    if (error) toast.error(error.message);
    else setRows(data ?? []);
    setLoading(false);
  };
  useEffect(() => { load(); }, []);

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    if (editId) {
      const { error } = await supabase.from("customers").update({
        name: form.name, email: form.email || null, phone: form.phone || null,
        city: form.city || null, country: form.country || null, tax_id: form.tax_id || null,
        address: form.address || null, notes: form.notes || null,
      }).eq("id", editId);
      setSaving(false);
      if (error) return toast.error(error.message);
      toast.success("تم التحديث");
    } else {
      const { data: profile } = await supabase.from("profiles").select("tenant_id").maybeSingle();
      if (!profile?.tenant_id) { toast.error("لا توجد شركة"); setSaving(false); return; }
      const { error } = await supabase.from("customers").insert({
        tenant_id: profile.tenant_id, name: form.name,
        email: form.email || null, phone: form.phone || null, city: form.city || null,
        country: form.country || null, tax_id: form.tax_id || null,
        address: form.address || null, notes: form.notes || null,
      });
      setSaving(false);
      if (error) return toast.error(error.message);
      toast.success("تم إضافة العميل");
    }
    setOpen(false); setEditId(null); setForm(empty); load();
  };

  const openEdit = (c: Customer) => {
    setEditId(c.id);
    setForm({
      name: c.name, email: c.email ?? "", phone: c.phone ?? "", city: c.city ?? "",
      country: c.country ?? "المغرب", tax_id: c.tax_id ?? "", address: c.address ?? "", notes: c.notes ?? "",
    });
    setOpen(true);
  };
  const openNew = () => { setEditId(null); setForm(empty); setOpen(true); };

  const onDelete = async (id: string) => {
    if (!confirm("حذف هذا العميل؟ سيتم حذف جميع بياناته المرتبطة.")) return;
    const { error } = await supabase.from("customers").delete().eq("id", id);
    if (error) toast.error(error.message); else { toast.success("تم الحذف"); load(); }
  };

  const onPrint = (c: Customer) => {
    printHTML(`بطاقة عميل — ${c.name}`, `
      <h1>بطاقة العميل</h1>
      <h2>${esc(c.name)}</h2>
      <dl class="kv">
        <dt>الاسم</dt><dd>${esc(c.name)}</dd>
        <dt>الهاتف</dt><dd dir="ltr">${esc(c.phone)}</dd>
        <dt>البريد الإلكتروني</dt><dd dir="ltr">${esc(c.email)}</dd>
        <dt>المدينة</dt><dd>${esc(c.city)}</dd>
        <dt>البلد</dt><dd>${esc(c.country)}</dd>
        <dt>الرقم الضريبي / ICE</dt><dd dir="ltr">${esc(c.tax_id)}</dd>
        <dt>العنوان</dt><dd>${esc(c.address)}</dd>
        <dt>ملاحظات</dt><dd>${esc(c.notes)}</dd>
      </dl>`);
  };

  const onExport = () => {
    if (filtered.length === 0) return toast.error("لا توجد بيانات للتصدير");
    exportToCSV(filtered, [
      { key: "name", label: "الاسم" },
      { key: "phone", label: "الهاتف" },
      { key: "email", label: "البريد" },
      { key: "city", label: "المدينة" },
      { key: "country", label: "البلد" },
      { key: "tax_id", label: "الرقم الضريبي" },
      { key: "created_at", label: "تاريخ الإضافة", get: (r) => new Date(r.created_at).toLocaleDateString("ar-MA") },
    ], `customers-${new Date().toISOString().slice(0, 10)}`);
    toast.success("تم تصدير CSV");
  };

  const filtered = rows.filter((r) => {
    if (!q) return true;
    const k = q.toLowerCase();
    return (r.name + " " + (r.email ?? "") + " " + (r.phone ?? "") + " " + (r.city ?? "") + " " + (r.tax_id ?? ""))
      .toLowerCase().includes(k);
  });

  return (
    <>
      <PageHeader
        title="إدارة العملاء (CRM)"
        subtitle="ملفات عملاء متكاملة مع سجل تعاملات، عقود، فواتير، ووثائق"
        action={
          <div className="flex gap-2">
            <Button variant="outline" onClick={onExport} className="gap-2"><Download className="h-4 w-4" /> تصدير CSV</Button>
            <Button onClick={openNew} className="gap-2 bg-accent text-accent-foreground hover:bg-accent/90">
              <Plus className="h-4 w-4" /> عميل جديد
            </Button>
          </div>
        }
      />

      <Dialog open={open} onOpenChange={(o) => { setOpen(o); if (!o) { setEditId(null); setForm(empty); } }}>
        <DialogContent dir="rtl" className="max-w-2xl">
          <DialogHeader><DialogTitle>{editId ? "تعديل العميل" : "إضافة عميل جديد"}</DialogTitle></DialogHeader>
          <form onSubmit={onSubmit} className="space-y-4">
            <div><Label>اسم العميل / الشركة *</Label>
              <Input required value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} /></div>
            <div className="grid grid-cols-2 gap-3">
              <div><Label>البريد الإلكتروني</Label>
                <Input type="email" dir="ltr" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} /></div>
              <div><Label>الهاتف</Label>
                <Input dir="ltr" value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} /></div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div><Label>المدينة</Label>
                <Input value={form.city} onChange={(e) => setForm({ ...form, city: e.target.value })} /></div>
              <div><Label>البلد</Label>
                <Input value={form.country} onChange={(e) => setForm({ ...form, country: e.target.value })} /></div>
            </div>
            <div><Label>الرقم الضريبي / ICE</Label>
              <Input dir="ltr" value={form.tax_id} onChange={(e) => setForm({ ...form, tax_id: e.target.value })} /></div>
            <div><Label>العنوان</Label>
              <Input value={form.address} onChange={(e) => setForm({ ...form, address: e.target.value })} /></div>
            <div><Label>ملاحظات</Label>
              <textarea rows={3} value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })}
                className="w-full rounded-md border border-border bg-background px-3 py-2 text-sm" /></div>
            <DialogFooter>
              <Button type="submit" disabled={saving} className="gap-2 bg-accent text-accent-foreground hover:bg-accent/90">
                {saving && <Loader2 className="h-4 w-4 animate-spin" />} حفظ
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      <div className="mb-4 flex flex-wrap items-center gap-3">
        <div className="relative flex-1 min-w-64">
          <Search className="pointer-events-none absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="بحث بالاسم، الهاتف، البريد، المدينة، ICE..."
            className="h-10 w-full rounded-lg border border-border bg-card pr-10 pl-4 text-sm focus:border-accent focus:outline-none focus:ring-2 focus:ring-accent/20" />
        </div>
        <div className="text-xs text-muted-foreground">{filtered.length} عميل</div>
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-16"><Loader2 className="h-6 w-6 animate-spin text-accent" /></div>
      ) : filtered.length === 0 ? (
        <EmptyState icon={Users} title="لا يوجد عملاء" description="ابدأ بإضافة أول عميل من زر (عميل جديد)." />
      ) : (
        <div className="rounded-2xl border border-border bg-card overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-secondary/50 text-xs uppercase text-muted-foreground">
              <tr>
                <th className="p-4 text-right font-semibold">الاسم</th>
                <th className="p-4 text-right font-semibold">الهاتف</th>
                <th className="p-4 text-right font-semibold">البريد</th>
                <th className="p-4 text-right font-semibold">المدينة</th>
                <th className="p-4 text-right font-semibold">الرقم الضريبي</th>
                <th className="p-4 text-right font-semibold">إجراءات</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((c) => (
                <tr key={c.id} className="border-t border-border hover:bg-secondary/30">
                  <td className="p-4 font-semibold">{c.name}</td>
                  <td className="p-4 text-muted-foreground" dir="ltr">{c.phone ?? "—"}</td>
                  <td className="p-4 text-muted-foreground" dir="ltr">{c.email ?? "—"}</td>
                  <td className="p-4">{c.city ?? "—"}</td>
                  <td className="p-4 font-mono text-xs">{c.tax_id ?? "—"}</td>
                  <td className="p-4">
                    <div className="flex gap-1">
                      <Button variant="ghost" size="sm" onClick={() => openEdit(c)} title="تعديل"><Pencil className="h-4 w-4" /></Button>
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
