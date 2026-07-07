import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { PageHeader, EmptyState } from "@/components/dashboard-layout";
import { Warehouse, Plus, Search, Trash2, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle, DialogTrigger,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { ExportBar } from "@/components/export-bar";

export const Route = createFileRoute("/app/warehouses")({
  component: WarehousesPage,
});

type Row = {
  id: string;
  name: string;
  code: string | null;
  city: string | null;
  address: string | null;
  capacity_m3: number | null;
  manager_name: string | null;
  phone: string | null;
  status: string;
};

function WarehousesPage() {
  const [rows, setRows] = useState<Row[]>([]);
  const [loading, setLoading] = useState(true);
  const [q, setQ] = useState("");
  const [open, setOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({
    name: "", code: "", city: "", address: "", capacity_m3: "", manager_name: "", phone: "",
  });

  const load = async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from("warehouses")
      .select("id,name,code,city,address,capacity_m3,manager_name,phone,status")
      .order("created_at", { ascending: false });
    if (error) toast.error(error.message);
    else setRows(data ?? []);
    setLoading(false);
  };

  useEffect(() => { load(); }, []);

  const onCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    const { data: profile } = await supabase.from("profiles").select("tenant_id").maybeSingle();
    if (!profile?.tenant_id) { toast.error("لا توجد شركة مرتبطة بحسابك"); setSaving(false); return; }
    const { error } = await supabase.from("warehouses").insert({
      tenant_id: profile.tenant_id,
      name: form.name,
      code: form.code || null,
      city: form.city || null,
      address: form.address || null,
      capacity_m3: form.capacity_m3 ? Number(form.capacity_m3) : null,
      manager_name: form.manager_name || null,
      phone: form.phone || null,
    });
    setSaving(false);
    if (error) { toast.error(error.message); return; }
    toast.success("تم إضافة المستودع");
    setOpen(false);
    setForm({ name: "", code: "", city: "", address: "", capacity_m3: "", manager_name: "", phone: "" });
    load();
  };

  const onDelete = async (id: string) => {
    if (!confirm("حذف هذا المستودع؟")) return;
    const { error } = await supabase.from("warehouses").delete().eq("id", id);
    if (error) toast.error(error.message);
    else { toast.success("تم الحذف"); load(); }
  };

  const filtered = rows.filter((r) => q ? r.name.toLowerCase().includes(q.toLowerCase()) : true);
  const totalCap = rows.reduce((s, r) => s + (Number(r.capacity_m3) || 0), 0);

  return (
    <>
      <PageHeader
        title="إدارة المستودعات"
        subtitle="مواقع تخزين، سعات، مسؤولون، وإحصائيات إشغال"
        action={
          <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger asChild>
              <Button className="gap-2 bg-accent text-accent-foreground hover:bg-accent/90">
                <Plus className="h-4 w-4" /> مستودع جديد
              </Button>
            </DialogTrigger>
            <DialogContent dir="rtl">
              <DialogHeader><DialogTitle>إضافة مستودع</DialogTitle></DialogHeader>
              <form onSubmit={onCreate} className="space-y-4">
                <div className="grid grid-cols-2 gap-3">
                  <div><Label>الاسم *</Label><Input required value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} /></div>
                  <div><Label>الرمز</Label><Input dir="ltr" value={form.code} onChange={(e) => setForm({ ...form, code: e.target.value })} /></div>
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div><Label>المدينة</Label><Input value={form.city} onChange={(e) => setForm({ ...form, city: e.target.value })} /></div>
                  <div><Label>السعة (m³)</Label><Input type="number" dir="ltr" value={form.capacity_m3} onChange={(e) => setForm({ ...form, capacity_m3: e.target.value })} /></div>
                </div>
                <div><Label>العنوان</Label><Input value={form.address} onChange={(e) => setForm({ ...form, address: e.target.value })} /></div>
                <div className="grid grid-cols-2 gap-3">
                  <div><Label>المسؤول</Label><Input value={form.manager_name} onChange={(e) => setForm({ ...form, manager_name: e.target.value })} /></div>
                  <div><Label>الهاتف</Label><Input dir="ltr" value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} /></div>
                </div>
                <DialogFooter>
                  <Button type="submit" disabled={saving} className="gap-2 bg-accent text-accent-foreground hover:bg-accent/90">
                    {saving && <Loader2 className="h-4 w-4 animate-spin" />} حفظ
                  </Button>
                </DialogFooter>
              </form>
            </DialogContent>
          </Dialog>
        }
      />

      <div className="mb-4 grid gap-3 sm:grid-cols-3">
        <div className="rounded-2xl border border-border bg-card p-4"><div className="text-xs text-muted-foreground">المستودعات</div><div className="mt-1 text-2xl font-black">{rows.length}</div></div>
        <div className="rounded-2xl border border-border bg-card p-4"><div className="text-xs text-muted-foreground">إجمالي السعة</div><div className="mt-1 text-2xl font-black">{totalCap.toLocaleString()} m³</div></div>
        <div className="rounded-2xl border border-border bg-card p-4"><div className="text-xs text-muted-foreground">النشطة</div><div className="mt-1 text-2xl font-black text-success">{rows.filter(r => r.status === "active").length}</div></div>
      </div>

      <div className="mb-4">
        <div className="relative">
          <Search className="pointer-events-none absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="بحث عن مستودع..." className="h-10 w-full rounded-lg border border-border bg-card pr-10 pl-4 text-sm focus:border-accent focus:outline-none focus:ring-2 focus:ring-accent/20" />
        </div>
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-16"><Loader2 className="h-6 w-6 animate-spin text-accent" /></div>
      ) : filtered.length === 0 ? (
        <EmptyState icon={Warehouse} title="لا توجد مستودعات بعد" description="أضف مستودعك الأول من زر (مستودع جديد)." />
      ) : (
        <div className="rounded-2xl border border-border bg-card overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-secondary/50 text-xs uppercase text-muted-foreground">
              <tr>
                <th className="p-4 text-right font-semibold">الاسم</th>
                <th className="p-4 text-right font-semibold">الرمز</th>
                <th className="p-4 text-right font-semibold">المدينة</th>
                <th className="p-4 text-right font-semibold">السعة</th>
                <th className="p-4 text-right font-semibold">المسؤول</th>
                <th className="p-4 text-right font-semibold">الهاتف</th>
                <th className="p-4 text-right font-semibold">إجراءات</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((r) => (
                <tr key={r.id} className="border-t border-border hover:bg-secondary/30">
                  <td className="p-4 font-semibold">{r.name}</td>
                  <td className="p-4 font-mono text-xs">{r.code ?? "—"}</td>
                  <td className="p-4">{r.city ?? "—"}</td>
                  <td className="p-4" dir="ltr">{r.capacity_m3 ? `${Number(r.capacity_m3).toLocaleString()} m³` : "—"}</td>
                  <td className="p-4">{r.manager_name ?? "—"}</td>
                  <td className="p-4 text-muted-foreground" dir="ltr">{r.phone ?? "—"}</td>
                  <td className="p-4">
                    <Button variant="ghost" size="sm" onClick={() => onDelete(r.id)} className="text-destructive hover:bg-destructive/10 hover:text-destructive">
                      <Trash2 className="h-4 w-4" />
                    </Button>
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
