import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { PageHeader, EmptyState } from "@/components/dashboard-layout";
import { Wrench, Plus, Loader2, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";

export const Route = createFileRoute("/app/maintenance")({
  component: MaintPage,
});

type Row = {
  id: string;
  maintenance_type: string;
  scheduled_date: string | null;
  completed_date: string | null;
  cost: number;
  status: string;
  workshop: string | null;
  vehicle_id: string | null;
  vehicles?: { plate_number: string } | null;
};

const STATUS: Record<string, { label: string; cls: string }> = {
  scheduled: { label: "مجدولة", cls: "bg-warning/10 text-warning-foreground" },
  in_progress: { label: "قيد التنفيذ", cls: "bg-accent/10 text-accent" },
  completed: { label: "مكتملة", cls: "bg-success/10 text-success" },
  overdue: { label: "متأخرة", cls: "bg-destructive/10 text-destructive" },
};

function MaintPage() {
  const [rows, setRows] = useState<Row[]>([]);
  const [vehicles, setVehicles] = useState<{ id: string; plate_number: string }[]>([]);
  const [loading, setLoading] = useState(true);
  const [open, setOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({
    maintenance_type: "",
    scheduled_date: new Date().toISOString().slice(0, 10),
    cost: "",
    status: "scheduled",
    workshop: "",
    vehicle_id: "",
  });

  const load = async () => {
    setLoading(true);
    const [{ data }, v] = await Promise.all([
      supabase.from("maintenance_records").select("id,maintenance_type,scheduled_date,completed_date,cost,status,workshop,vehicle_id,vehicles(plate_number)").order("scheduled_date", { ascending: false }),
      supabase.from("vehicles").select("id,plate_number").order("plate_number"),
    ]);
    setRows((data as any) ?? []);
    setVehicles(v.data ?? []);
    setLoading(false);
  };

  useEffect(() => { load(); }, []);

  const onCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    const { data: profile } = await supabase.from("profiles").select("tenant_id").maybeSingle();
    if (!profile?.tenant_id) { toast.error("لا توجد شركة"); setSaving(false); return; }
    const { error } = await supabase.from("maintenance_records").insert({
      tenant_id: profile.tenant_id,
      maintenance_type: form.maintenance_type,
      scheduled_date: form.scheduled_date || null,
      cost: Number(form.cost || 0),
      status: form.status,
      workshop: form.workshop || null,
      vehicle_id: form.vehicle_id || null,
    });
    setSaving(false);
    if (error) return toast.error(error.message);
    toast.success("تمت الإضافة");
    setOpen(false);
    setForm({ maintenance_type: "", scheduled_date: new Date().toISOString().slice(0, 10), cost: "", status: "scheduled", workshop: "", vehicle_id: "" });
    load();
  };

  const onDelete = async (id: string) => {
    if (!confirm("حذف؟")) return;
    const { error } = await supabase.from("maintenance_records").delete().eq("id", id);
    if (error) toast.error(error.message); else { toast.success("تم الحذف"); load(); }
  };

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
        subtitle="تنبيهات حسب الكيلومترات، ساعات التشغيل والتاريخ"
        action={
          <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger asChild>
              <Button className="gap-2 bg-accent text-accent-foreground hover:bg-accent/90"><Plus className="h-4 w-4" /> صيانة جديدة</Button>
            </DialogTrigger>
            <DialogContent dir="rtl">
              <DialogHeader><DialogTitle>جدولة صيانة</DialogTitle></DialogHeader>
              <form onSubmit={onCreate} className="space-y-4">
                <div><Label>نوع الصيانة *</Label><Input required placeholder="مثال: تغيير زيت، فحص فرامل..." value={form.maintenance_type} onChange={(e) => setForm({ ...form, maintenance_type: e.target.value })} /></div>
                <div className="grid grid-cols-2 gap-3">
                  <div><Label>التاريخ المجدول</Label><Input type="date" value={form.scheduled_date} onChange={(e) => setForm({ ...form, scheduled_date: e.target.value })} /></div>
                  <div><Label>التكلفة (MAD)</Label><Input type="number" step="0.01" value={form.cost} onChange={(e) => setForm({ ...form, cost: e.target.value })} /></div>
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <Label>الشاحنة</Label>
                    <Select value={form.vehicle_id} onValueChange={(v) => setForm({ ...form, vehicle_id: v })}>
                      <SelectTrigger><SelectValue placeholder="اختر..." /></SelectTrigger>
                      <SelectContent>{vehicles.map((v) => <SelectItem key={v.id} value={v.id}>{v.plate_number}</SelectItem>)}</SelectContent>
                    </Select>
                  </div>
                  <div>
                    <Label>الحالة</Label>
                    <Select value={form.status} onValueChange={(v) => setForm({ ...form, status: v })}>
                      <SelectTrigger><SelectValue /></SelectTrigger>
                      <SelectContent>{Object.entries(STATUS).map(([k, v]) => <SelectItem key={k} value={k}>{v.label}</SelectItem>)}</SelectContent>
                    </Select>
                  </div>
                </div>
                <div><Label>الورشة</Label><Input value={form.workshop} onChange={(e) => setForm({ ...form, workshop: e.target.value })} /></div>
                <DialogFooter><Button type="submit" disabled={saving} className="gap-2 bg-accent text-accent-foreground hover:bg-accent/90">{saving && <Loader2 className="h-4 w-4 animate-spin" />} حفظ</Button></DialogFooter>
              </form>
            </DialogContent>
          </Dialog>
        }
      />

      <div className="mb-4 grid gap-3 md:grid-cols-4">
        <div className="rounded-xl border border-border bg-card p-4"><div className="text-xs text-muted-foreground">مجدولة</div><div className="mt-1 text-2xl font-black text-warning-foreground">{counts.scheduled}</div></div>
        <div className="rounded-xl border border-border bg-card p-4"><div className="text-xs text-muted-foreground">قيد التنفيذ</div><div className="mt-1 text-2xl font-black text-accent">{counts.in_progress}</div></div>
        <div className="rounded-xl border border-border bg-card p-4"><div className="text-xs text-muted-foreground">مكتملة</div><div className="mt-1 text-2xl font-black text-success">{counts.completed}</div></div>
        <div className="rounded-xl border border-border bg-card p-4"><div className="text-xs text-muted-foreground">إجمالي التكلفة</div><div className="mt-1 text-2xl font-black">{counts.cost.toFixed(0)} MAD</div></div>
      </div>

      {loading ? (
        <div className="flex justify-center py-16"><Loader2 className="h-6 w-6 animate-spin text-accent" /></div>
      ) : rows.length === 0 ? (
        <EmptyState icon={Wrench} title="لا توجد صيانات" description="أضف أول جدولة صيانة لبدء متابعة أعمال الصيانة." />
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
              {rows.map((r) => {
                const s = STATUS[r.status] ?? { label: r.status, cls: "bg-secondary" };
                return (
                  <tr key={r.id} className="border-t border-border hover:bg-secondary/30">
                    <td className="p-4 font-semibold">{r.maintenance_type}</td>
                    <td className="p-4" dir="ltr">{r.vehicles?.plate_number ?? "—"}</td>
                    <td className="p-4" dir="ltr">{r.scheduled_date ?? "—"}</td>
                    <td className="p-4">{r.workshop ?? "—"}</td>
                    <td className="p-4 font-semibold">{Number(r.cost).toFixed(0)}</td>
                    <td className="p-4"><span className={`rounded-full px-2 py-1 text-xs font-semibold ${s.cls}`}>{s.label}</span></td>
                    <td className="p-4"><Button variant="ghost" size="sm" onClick={() => onDelete(r.id)} className="text-destructive hover:bg-destructive/10 hover:text-destructive"><Trash2 className="h-4 w-4" /></Button></td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </>
  );
}
