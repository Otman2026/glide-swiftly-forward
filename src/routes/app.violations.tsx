import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { PageHeader, EmptyState } from "@/components/dashboard-layout";
import { Shield, Plus, Loader2, Trash2, Pencil, Printer, Download, CheckCircle2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { exportToCSV } from "@/lib/csv";
import { printHTML, esc } from "@/lib/print";
import { SearchInput, matchQuery } from "@/components/search-input";

export const Route = createFileRoute("/app/violations")({ component: ViolationsPage });

type Row = {
  id: string;
  violation_date: string;
  violation_type: string;
  location: string | null;
  fine_amount: number;
  reference_number: string | null;
  status: string;
  notes: string | null;
  driver_id: string | null;
  vehicle_id: string | null;
  drivers?: { full_name: string } | null;
  vehicles?: { plate_number: string } | null;
};

const STAT: Record<string, { label: string; cls: string }> = {
  pending: { label: "قيد الدفع", cls: "bg-warning/10 text-warning-foreground" },
  paid: { label: "مدفوعة", cls: "bg-success/10 text-success" },
  disputed: { label: "معترض عليها", cls: "bg-accent/10 text-accent" },
  cancelled: { label: "ملغاة", cls: "bg-muted text-muted-foreground" },
};

const emptyForm = {
  violation_date: new Date().toISOString().slice(0, 10),
  violation_type: "", location: "", fine_amount: "", reference_number: "",
  status: "pending", notes: "", driver_id: "", vehicle_id: "",
};

function ViolationsPage() {
  const [rows, setRows] = useState<Row[]>([]);
  const [drivers, setDrivers] = useState<{ id: string; full_name: string }[]>([]);
  const [vehicles, setVehicles] = useState<{ id: string; plate_number: string }[]>([]);
  const [loading, setLoading] = useState(true);
  const [open, setOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState(emptyForm);
  const [statusFilter, setStatusFilter] = useState("all");
  const [q, setQ] = useState("");

  const load = async () => {
    setLoading(true);
    const [{ data }, d, v] = await Promise.all([
      supabase.from("violations").select("id,violation_date,violation_type,location,fine_amount,reference_number,status,notes,driver_id,vehicle_id,drivers(full_name),vehicles(plate_number)").order("violation_date", { ascending: false }),
      supabase.from("drivers").select("id,full_name").order("full_name"),
      supabase.from("vehicles").select("id,plate_number").order("plate_number"),
    ]);
    setRows((data as any) ?? []);
    setDrivers(d.data ?? []); setVehicles(v.data ?? []);
    setLoading(false);
  };
  useEffect(() => { load(); }, []);

  const openCreate = () => { setEditingId(null); setForm(emptyForm); setOpen(true); };
  const openEdit = (r: Row) => {
    setEditingId(r.id);
    setForm({
      violation_date: r.violation_date, violation_type: r.violation_type,
      location: r.location ?? "", fine_amount: String(r.fine_amount),
      reference_number: r.reference_number ?? "", status: r.status,
      notes: r.notes ?? "", driver_id: r.driver_id ?? "", vehicle_id: r.vehicle_id ?? "",
    });
    setOpen(true);
  };

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    const payload = {
      violation_date: form.violation_date, violation_type: form.violation_type,
      location: form.location || null, fine_amount: Number(form.fine_amount || 0),
      reference_number: form.reference_number || null, status: form.status,
      notes: form.notes || null,
      driver_id: form.driver_id || null, vehicle_id: form.vehicle_id || null,
    };
    if (editingId) {
      const { error } = await supabase.from("violations").update(payload).eq("id", editingId);
      setSaving(false);
      if (error) return toast.error(error.message);
      toast.success("تم التحديث");
    } else {
      const { data: profile } = await supabase.from("profiles").select("tenant_id").maybeSingle();
      if (!profile?.tenant_id) { toast.error("لا توجد شركة"); setSaving(false); return; }
      const { error } = await supabase.from("violations").insert({ ...payload, tenant_id: profile.tenant_id });
      setSaving(false);
      if (error) return toast.error(error.message);
      toast.success("تم التسجيل");
    }
    setOpen(false); load();
  };

  const markPaid = async (id: string) => {
    const { error } = await supabase.from("violations").update({ status: "paid" }).eq("id", id);
    if (error) toast.error(error.message); else { toast.success("تم تسجيل الدفع"); load(); }
  };

  const onDelete = async (id: string) => {
    if (!confirm("حذف؟")) return;
    const { error } = await supabase.from("violations").delete().eq("id", id);
    if (error) toast.error(error.message); else { toast.success("تم الحذف"); load(); }
  };

  const filtered = useMemo(() => {
    const base = rows.filter((r) => statusFilter === "all" || r.status === statusFilter);
    const s = q.trim().toLowerCase();
    if (!s) return base;
    return base.filter((r) =>
      [r.violation_type, r.location, r.reference_number, r.drivers?.full_name, r.vehicles?.plate_number]
        .some((v) => String(v ?? "").toLowerCase().includes(s))
    );
  }, [rows, statusFilter, q]);
  const counts = {
    total: rows.length,
    pending: rows.filter((r) => r.status === "pending").length,
    paid: rows.filter((r) => r.status === "paid").length,
    fines: rows.reduce((s, r) => s + Number(r.fine_amount), 0),
  };

  const onExport = () => {
    exportToCSV(filtered, [
      { key: "violation_date", label: "التاريخ" },
      { key: "violation_type", label: "النوع" },
      { key: "driver", label: "السائق", get: (r) => r.drivers?.full_name ?? "" },
      { key: "vehicle", label: "الشاحنة", get: (r) => r.vehicles?.plate_number ?? "" },
      { key: "location", label: "المكان" },
      { key: "fine_amount", label: "الغرامة" },
      { key: "reference_number", label: "المرجع" },
      { key: "status", label: "الحالة", get: (r) => STAT[r.status]?.label ?? r.status },
    ], `violations-${new Date().toISOString().slice(0, 10)}`);
  };

  const onPrint = () => {
    const body = `<h1>تقرير المخالفات المرورية</h1><h2>${filtered.length} مخالفة · إجمالي الغرامات ${counts.fines.toFixed(0)} MAD</h2>
      <table><thead><tr><th>التاريخ</th><th>النوع</th><th>السائق</th><th>الشاحنة</th><th>المكان</th><th>الغرامة</th><th>الحالة</th></tr></thead>
      <tbody>${filtered.map((r) => `<tr><td>${esc(r.violation_date)}</td><td>${esc(r.violation_type)}</td><td>${esc(r.drivers?.full_name)}</td><td>${esc(r.vehicles?.plate_number)}</td><td>${esc(r.location)}</td><td>${Number(r.fine_amount).toFixed(0)}</td><td>${esc(STAT[r.status]?.label)}</td></tr>`).join("")}</tbody></table>`;
    printHTML("تقرير المخالفات", body);
  };

  return (
    <>
      <PageHeader
        title="المخالفات المرورية"
        subtitle="تسجيل ومتابعة مخالفات السائقين والغرامات المرورية"
        action={
          <div className="flex gap-2">
            <Button variant="outline" onClick={onExport} className="gap-2"><Download className="h-4 w-4" /> تصدير</Button>
            <Button variant="outline" onClick={onPrint} className="gap-2"><Printer className="h-4 w-4" /> طباعة</Button>
            <Button onClick={openCreate} className="gap-2 bg-accent text-accent-foreground hover:bg-accent/90"><Plus className="h-4 w-4" /> تسجيل مخالفة</Button>
          </div>
        }
      />

      <div className="mb-4 grid gap-3 md:grid-cols-4">
        <Card label="إجمالي" value={counts.total} />
        <Card label="قيد الدفع" value={counts.pending} tone="warning" />
        <Card label="مدفوعة" value={counts.paid} tone="success" />
        <Card label="إجمالي الغرامات" value={`${counts.fines.toFixed(0)} MAD`} tone="destructive" />
      </div>

      <div className="mb-4 flex flex-wrap items-center gap-2">
        <Select value={statusFilter} onValueChange={setStatusFilter}>
          <SelectTrigger className="w-48"><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">جميع الحالات</SelectItem>
            {Object.entries(STAT).map(([k, v]) => <SelectItem key={k} value={k}>{v.label}</SelectItem>)}
          </SelectContent>
        </Select>
        <SearchInput value={q} onChange={setQ} placeholder="ابحث بالنوع أو المرجع أو السائق…" />
      </div>

      {loading ? (
        <div className="flex justify-center py-16"><Loader2 className="h-6 w-6 animate-spin text-accent" /></div>
      ) : filtered.length === 0 ? (
        <EmptyState icon={Shield} title="لا توجد مخالفات" description="سجّل مخالفات السائقين هنا." />
      ) : (
        <div className="rounded-2xl border border-border bg-card overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-secondary/50 text-xs uppercase text-muted-foreground">
              <tr>
                <th className="p-4 text-right">التاريخ</th>
                <th className="p-4 text-right">النوع</th>
                <th className="p-4 text-right">السائق</th>
                <th className="p-4 text-right">الشاحنة</th>
                <th className="p-4 text-right">المكان</th>
                <th className="p-4 text-right">الغرامة</th>
                <th className="p-4 text-right">الحالة</th>
                <th className="p-4 text-right">إجراءات</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((r) => {
                const s = STAT[r.status] ?? { label: r.status, cls: "bg-secondary" };
                return (
                  <tr key={r.id} className="border-t border-border hover:bg-secondary/30">
                    <td className="p-4" dir="ltr">{r.violation_date}</td>
                    <td className="p-4 font-semibold">{r.violation_type}</td>
                    <td className="p-4">{r.drivers?.full_name ?? "—"}</td>
                    <td className="p-4" dir="ltr">{r.vehicles?.plate_number ?? "—"}</td>
                    <td className="p-4">{r.location ?? "—"}</td>
                    <td className="p-4 font-semibold text-destructive">{Number(r.fine_amount).toFixed(0)}</td>
                    <td className="p-4"><span className={`rounded-full px-2 py-1 text-xs font-semibold ${s.cls}`}>{s.label}</span></td>
                    <td className="p-4">
                      <div className="flex gap-1">
                        <Button variant="ghost" size="sm" title="تعديل" onClick={() => openEdit(r)}><Pencil className="h-4 w-4" /></Button>
                        {r.status !== "paid" && (
                          <Button variant="ghost" size="sm" title="تسجيل الدفع" onClick={() => markPaid(r.id)} className="text-success"><CheckCircle2 className="h-4 w-4" /></Button>
                        )}
                        <Button variant="ghost" size="sm" onClick={() => onDelete(r.id)} className="text-destructive hover:bg-destructive/10 hover:text-destructive"><Trash2 className="h-4 w-4" /></Button>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent dir="rtl" className="max-h-[90vh] overflow-y-auto">
          <DialogHeader><DialogTitle>{editingId ? "تعديل مخالفة" : "تسجيل مخالفة"}</DialogTitle></DialogHeader>
          <form onSubmit={onSubmit} className="space-y-4">
            <div className="grid grid-cols-2 gap-3">
              <div><Label>التاريخ *</Label><Input type="date" required value={form.violation_date} onChange={(e) => setForm({ ...form, violation_date: e.target.value })} /></div>
              <div><Label>نوع المخالفة *</Label><Input required placeholder="سرعة زائدة، عدم ربط الحزام..." value={form.violation_type} onChange={(e) => setForm({ ...form, violation_type: e.target.value })} /></div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div><Label>السائق</Label>
                <Select value={form.driver_id} onValueChange={(v) => setForm({ ...form, driver_id: v })}>
                  <SelectTrigger><SelectValue placeholder="اختر..." /></SelectTrigger>
                  <SelectContent>{drivers.map((d) => <SelectItem key={d.id} value={d.id}>{d.full_name}</SelectItem>)}</SelectContent>
                </Select>
              </div>
              <div><Label>الشاحنة</Label>
                <Select value={form.vehicle_id} onValueChange={(v) => setForm({ ...form, vehicle_id: v })}>
                  <SelectTrigger><SelectValue placeholder="اختر..." /></SelectTrigger>
                  <SelectContent>{vehicles.map((v) => <SelectItem key={v.id} value={v.id}>{v.plate_number}</SelectItem>)}</SelectContent>
                </Select>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div><Label>المكان</Label><Input value={form.location} onChange={(e) => setForm({ ...form, location: e.target.value })} /></div>
              <div><Label>مبلغ الغرامة (MAD)</Label><Input type="number" step="0.01" value={form.fine_amount} onChange={(e) => setForm({ ...form, fine_amount: e.target.value })} /></div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div><Label>الرقم المرجعي</Label><Input value={form.reference_number} onChange={(e) => setForm({ ...form, reference_number: e.target.value })} /></div>
              <div><Label>الحالة</Label>
                <Select value={form.status} onValueChange={(v) => setForm({ ...form, status: v })}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>{Object.entries(STAT).map(([k, v]) => <SelectItem key={k} value={k}>{v.label}</SelectItem>)}</SelectContent>
                </Select>
              </div>
            </div>
            <div><Label>ملاحظات</Label><Textarea rows={2} value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })} /></div>
            <DialogFooter>
              <Button type="submit" disabled={saving} className="gap-2 bg-accent text-accent-foreground hover:bg-accent/90">
                {saving && <Loader2 className="h-4 w-4 animate-spin" />} حفظ
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </>
  );
}

function Card({ label, value, tone }: { label: string; value: string | number; tone?: "success" | "warning" | "destructive" }) {
  const t = tone === "success" ? "success" : tone === "warning" ? "warning" : tone === "destructive" ? "danger" : "muted";
  return <StatCard label={label} value={value} tone={t} />;
}
