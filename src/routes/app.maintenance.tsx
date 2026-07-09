import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { PageHeader, EmptyState } from "@/components/dashboard-layout";
import { Wrench, Plus, Loader2, Trash2, Pencil, CheckCircle2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { ExportBar } from "@/components/export-bar";
import { SearchInput } from "@/components/search-input";

export const Route = createFileRoute("/app/maintenance")({ component: MaintPage });

type Row = {
  id: string;
  maintenance_type: string;
  scheduled_date: string | null;
  completed_date: string | null;
  cost: number;
  status: string;
  workshop: string | null;
  odometer: number | null;
  notes: string | null;
  vehicle_id: string | null;
  vehicles?: { plate_number: string } | null;
};

const STATUS: Record<string, { label: string; cls: string }> = {
  scheduled: { label: "مجدولة", cls: "bg-warning/10 text-warning-foreground" },
  in_progress: { label: "قيد التنفيذ", cls: "bg-accent/10 text-accent" },
  completed: { label: "مكتملة", cls: "bg-success/10 text-success" },
  overdue: { label: "متأخرة", cls: "bg-destructive/10 text-destructive" },
};

const emptyForm = {
  maintenance_type: "",
  scheduled_date: new Date().toISOString().slice(0, 10),
  cost: "", status: "scheduled", workshop: "", odometer: "", notes: "", vehicle_id: "",
};

function MaintPage() {
  const [rows, setRows] = useState<Row[]>([]);
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
    const [{ data }, v] = await Promise.all([
      supabase.from("maintenance_records").select("id,maintenance_type,scheduled_date,completed_date,cost,status,workshop,odometer,notes,vehicle_id,vehicles(plate_number)").order("scheduled_date", { ascending: false }),
      supabase.from("vehicles").select("id,plate_number").order("plate_number"),
    ]);
    setRows((data as any) ?? []);
    setVehicles(v.data ?? []);
    setLoading(false);
  };
  useEffect(() => { load(); }, []);

  const openCreate = () => { setEditingId(null); setForm(emptyForm); setOpen(true); };
  const openEdit = (r: Row) => {
    setEditingId(r.id);
    setForm({
      maintenance_type: r.maintenance_type, scheduled_date: r.scheduled_date ?? "",
      cost: String(r.cost), status: r.status, workshop: r.workshop ?? "",
      odometer: r.odometer?.toString() ?? "", notes: r.notes ?? "", vehicle_id: r.vehicle_id ?? "",
    });
    setOpen(true);
  };

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    const payload = {
      maintenance_type: form.maintenance_type,
      scheduled_date: form.scheduled_date || null,
      cost: Number(form.cost || 0), status: form.status,
      workshop: form.workshop || null,
      odometer: form.odometer ? Number(form.odometer) : null,
      notes: form.notes || null,
      vehicle_id: form.vehicle_id || null,
    };
    if (editingId) {
      const { error } = await supabase.from("maintenance_records").update(payload).eq("id", editingId);
      setSaving(false);
      if (error) return toast.error(error.message);
      toast.success("تم التحديث");
    } else {
      const { data: profile } = await supabase.from("profiles").select("tenant_id").maybeSingle();
      if (!profile?.tenant_id) { toast.error("لا توجد شركة"); setSaving(false); return; }
      const { error } = await supabase.from("maintenance_records").insert({ ...payload, tenant_id: profile.tenant_id });
      setSaving(false);
      if (error) return toast.error(error.message);
      toast.success("تمت الإضافة");
    }
    setOpen(false); load();
  };

  const onClose = async (id: string) => {
    const cost = prompt("التكلفة النهائية (MAD):", "0");
    if (cost === null) return;
    const { error } = await supabase.from("maintenance_records").update({
      status: "completed",
      completed_date: new Date().toISOString().slice(0, 10),
      cost: Number(cost || 0),
    }).eq("id", id);
    if (error) toast.error(error.message); else { toast.success("تم إغلاق الأمر"); load(); }
  };

  const onDelete = async (id: string) => {
    if (!confirm("حذف؟")) return;
    const { error } = await supabase.from("maintenance_records").delete().eq("id", id);
    if (error) toast.error(error.message); else { toast.success("تم الحذف"); load(); }
  };

  const filtered = useMemo(() => {
    const s = q.trim().toLowerCase();
    return rows.filter((r) => {
      if (statusFilter !== "all" && r.status !== statusFilter) return false;
      if (!s) return true;
      return [r.maintenance_type, r.workshop, r.vehicles?.plate_number, r.notes]
        .some((v) => String(v ?? "").toLowerCase().includes(s));
    });
  }, [rows, statusFilter, q]);

  const counts = {
    scheduled: rows.filter((r) => r.status === "scheduled").length,
    in_progress: rows.filter((r) => r.status === "in_progress").length,
    completed: rows.filter((r) => r.status === "completed").length,
    cost: rows.reduce((s, r) => s + Number(r.cost), 0),
  };

  return (
    <>
      <PageHeader
        title="الصيانة الوقائية والتصحيحية"
        subtitle="أوامر الصيانة، الأعطال، قطع الغيار، وتنبيهات مواعيد الصيانة"
        action={
          <div className="flex flex-wrap gap-2">
            <ExportBar
              filename="maintenance"
              title="أوامر الصيانة"
              rows={filtered}
              columns={[
                { key: "maintenance_type", label: "النوع" },
                { key: "vehicle", label: "الشاحنة", format: (r) => r.vehicles?.plate_number ?? "" },
                { key: "scheduled_date", label: "التاريخ المجدول" },
                { key: "completed_date", label: "الإتمام" },
                { key: "workshop", label: "الورشة" },
                { key: "cost", label: "التكلفة" },
                { key: "status", label: "الحالة", format: (r) => STATUS[r.status]?.label ?? r.status },
              ]}
            />
            <Button onClick={openCreate} className="gap-2 bg-accent text-accent-foreground hover:bg-accent/90"><Plus className="h-4 w-4" /> أمر صيانة</Button>
          </div>
        }
      />

      <div className="mb-4 grid gap-3 md:grid-cols-4">
        <Card label="مجدولة" value={counts.scheduled} tone="warning" />
        <Card label="قيد التنفيذ" value={counts.in_progress} tone="accent" />
        <Card label="مكتملة" value={counts.completed} tone="success" />
        <Card label="إجمالي التكلفة" value={`${counts.cost.toFixed(0)} MAD`} />
      </div>

      <div className="mb-4 flex flex-wrap gap-3 items-center">
        <SearchInput value={q} onChange={setQ} placeholder="بحث بنوع/ورشة/شاحنة…" />
        <Select value={statusFilter} onValueChange={setStatusFilter}>
          <SelectTrigger className="w-48"><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">جميع الحالات</SelectItem>
            {Object.entries(STATUS).map(([k, v]) => <SelectItem key={k} value={k}>{v.label}</SelectItem>)}
          </SelectContent>
        </Select>
      </div>

      {loading ? (
        <div className="flex justify-center py-16"><Loader2 className="h-6 w-6 animate-spin text-accent" /></div>
      ) : filtered.length === 0 ? (
        <EmptyState icon={Wrench} title="لا توجد صيانات" description="أضف أول أمر صيانة." />
      ) : (
        <div className="rounded-2xl border border-border bg-card overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-secondary/50 text-xs uppercase text-muted-foreground">
              <tr>
                <th className="p-4 text-right">النوع</th>
                <th className="p-4 text-right">الشاحنة</th>
                <th className="p-4 text-right">التاريخ</th>
                <th className="p-4 text-right">الورشة</th>
                <th className="p-4 text-right">التكلفة</th>
                <th className="p-4 text-right">الحالة</th>
                <th className="p-4 text-right">إجراءات</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((r) => {
                const s = STATUS[r.status] ?? { label: r.status, cls: "bg-secondary" };
                return (
                  <tr key={r.id} className="border-t border-border hover:bg-secondary/30">
                    <td className="p-4 font-semibold">{r.maintenance_type}</td>
                    <td className="p-4" dir="ltr">{r.vehicles?.plate_number ?? "—"}</td>
                    <td className="p-4" dir="ltr">{r.scheduled_date ?? "—"}</td>
                    <td className="p-4">{r.workshop ?? "—"}</td>
                    <td className="p-4 font-semibold">{Number(r.cost).toFixed(0)}</td>
                    <td className="p-4"><span className={`rounded-full px-2 py-1 text-xs font-semibold ${s.cls}`}>{s.label}</span></td>
                    <td className="p-4">
                      <div className="flex gap-1">
                        <Button variant="ghost" size="sm" title="تعديل" onClick={() => openEdit(r)}><Pencil className="h-4 w-4" /></Button>
                        {r.status !== "completed" && (
                          <Button variant="ghost" size="sm" title="إغلاق الأمر" onClick={() => onClose(r.id)} className="text-success"><CheckCircle2 className="h-4 w-4" /></Button>
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
          <DialogHeader><DialogTitle>{editingId ? "تعديل أمر صيانة" : "إنشاء أمر صيانة"}</DialogTitle></DialogHeader>
          <form onSubmit={onSubmit} className="space-y-4">
            <div><Label>نوع الصيانة *</Label><Input required placeholder="تغيير زيت، فحص فرامل..." value={form.maintenance_type} onChange={(e) => setForm({ ...form, maintenance_type: e.target.value })} /></div>
            <div className="grid grid-cols-2 gap-3">
              <div><Label>التاريخ المجدول</Label><Input type="date" value={form.scheduled_date} onChange={(e) => setForm({ ...form, scheduled_date: e.target.value })} /></div>
              <div><Label>التكلفة (MAD)</Label><Input type="number" step="0.01" value={form.cost} onChange={(e) => setForm({ ...form, cost: e.target.value })} /></div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div><Label>الشاحنة</Label>
                <Select value={form.vehicle_id} onValueChange={(v) => setForm({ ...form, vehicle_id: v })}>
                  <SelectTrigger><SelectValue placeholder="اختر..." /></SelectTrigger>
                  <SelectContent>{vehicles.map((v) => <SelectItem key={v.id} value={v.id}>{v.plate_number}</SelectItem>)}</SelectContent>
                </Select>
              </div>
              <div><Label>الحالة</Label>
                <Select value={form.status} onValueChange={(v) => setForm({ ...form, status: v })}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>{Object.entries(STATUS).map(([k, v]) => <SelectItem key={k} value={k}>{v.label}</SelectItem>)}</SelectContent>
                </Select>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div><Label>الورشة</Label><Input value={form.workshop} onChange={(e) => setForm({ ...form, workshop: e.target.value })} /></div>
              <div><Label>عداد الكيلومترات</Label><Input type="number" value={form.odometer} onChange={(e) => setForm({ ...form, odometer: e.target.value })} /></div>
            </div>
            <div><Label>ملاحظات / قطع الغيار</Label><Textarea rows={3} value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })} /></div>
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

function Card({ label, value, tone }: { label: string; value: string | number; tone?: "success" | "warning" | "accent" }) {
  const t = tone === "success" ? "success" : tone === "warning" ? "warning" : tone === "accent" ? "brand" : "muted";
  return <StatCard label={label} value={value} tone={t} />;
}
