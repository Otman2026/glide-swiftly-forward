import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { PageHeader, EmptyState } from "@/components/dashboard-layout";
import { Fuel, Plus, Loader2, Trash2, Pencil } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { ExportBar } from "@/components/export-bar";
import { SearchInput } from "@/components/search-input";

export const Route = createFileRoute("/app/fuel")({ component: FuelPage });

type Row = {
  id: string;
  fuel_date: string;
  liters: number;
  cost: number;
  odometer: number | null;
  station: string | null;
  vehicle_id: string | null;
  driver_id: string | null;
  vehicles?: { plate_number: string } | null;
  drivers?: { full_name: string } | null;
};

const emptyForm = {
  fuel_date: new Date().toISOString().slice(0, 10),
  liters: "", cost: "", odometer: "", station: "", vehicle_id: "", driver_id: "",
};

function FuelPage() {
  const [rows, setRows] = useState<Row[]>([]);
  const [vehicles, setVehicles] = useState<{ id: string; plate_number: string }[]>([]);
  const [drivers, setDrivers] = useState<{ id: string; full_name: string }[]>([]);
  const [loading, setLoading] = useState(true);
  const [open, setOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState(emptyForm);
  const [vehicleFilter, setVehicleFilter] = useState("all");
  const [q, setQ] = useState("");

  const load = async () => {
    setLoading(true);
    const [{ data }, v, d] = await Promise.all([
      supabase.from("fuel_logs").select("id,fuel_date,liters,cost,odometer,station,vehicle_id,driver_id,vehicles(plate_number),drivers(full_name)").order("fuel_date", { ascending: false }),
      supabase.from("vehicles").select("id,plate_number").order("plate_number"),
      supabase.from("drivers").select("id,full_name").order("full_name"),
    ]);
    setRows((data as any) ?? []);
    setVehicles(v.data ?? []); setDrivers(d.data ?? []);
    setLoading(false);
  };
  useEffect(() => { load(); }, []);

  const openCreate = () => { setEditingId(null); setForm(emptyForm); setOpen(true); };
  const openEdit = (r: Row) => {
    setEditingId(r.id);
    setForm({
      fuel_date: r.fuel_date, liters: String(r.liters), cost: String(r.cost),
      odometer: r.odometer?.toString() ?? "", station: r.station ?? "",
      vehicle_id: r.vehicle_id ?? "", driver_id: r.driver_id ?? "",
    });
    setOpen(true);
  };

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    const payload = {
      fuel_date: form.fuel_date, liters: Number(form.liters), cost: Number(form.cost || 0),
      odometer: form.odometer ? Number(form.odometer) : null,
      station: form.station || null, vehicle_id: form.vehicle_id || null, driver_id: form.driver_id || null,
    };
    if (editingId) {
      const { error } = await supabase.from("fuel_logs").update(payload).eq("id", editingId);
      setSaving(false);
      if (error) return toast.error(error.message);
      toast.success("تم التحديث");
    } else {
      const { data: profile } = await supabase.from("profiles").select("tenant_id").maybeSingle();
      if (!profile?.tenant_id) { toast.error("لا توجد شركة"); setSaving(false); return; }
      const { error } = await supabase.from("fuel_logs").insert({ ...payload, tenant_id: profile.tenant_id });
      setSaving(false);
      if (error) return toast.error(error.message);
      toast.success("تم التسجيل");
    }
    setOpen(false); load();
  };

  const onDelete = async (id: string) => {
    if (!confirm("حذف؟")) return;
    const { error } = await supabase.from("fuel_logs").delete().eq("id", id);
    if (error) toast.error(error.message); else { toast.success("تم الحذف"); load(); }
  };

  const filtered = useMemo(() => {
    const s = q.trim().toLowerCase();
    return rows.filter((r) => {
      if (vehicleFilter !== "all" && r.vehicle_id !== vehicleFilter) return false;
      if (!s) return true;
      return [r.vehicles?.plate_number, r.drivers?.full_name, r.station, r.fuel_date]
        .some((v) => String(v ?? "").toLowerCase().includes(s));
    });
  }, [rows, vehicleFilter, q]);
  const totalLiters = filtered.reduce((s, r) => s + Number(r.liters), 0);
  const totalCost = filtered.reduce((s, r) => s + Number(r.cost), 0);

  return (
    <>
      <PageHeader
        title="إدارة الوقود"
        subtitle="التعبئة، الاستهلاك، التكلفة، تقارير حسب الشاحنة والسائق"
        action={
          <div className="flex flex-wrap gap-2">
            <ExportBar
              filename="fuel"
              title="تعبئات الوقود"
              rows={filtered}
              columns={[
                { key: "fuel_date", label: "التاريخ" },
                { key: "vehicle", label: "الشاحنة", format: (r) => r.vehicles?.plate_number ?? "" },
                { key: "driver", label: "السائق", format: (r) => r.drivers?.full_name ?? "" },
                { key: "liters", label: "اللترات" },
                { key: "cost", label: "التكلفة" },
                { key: "odometer", label: "العداد" },
                { key: "station", label: "المحطة" },
              ]}
            />
            <Button onClick={openCreate} className="gap-2 bg-accent text-accent-foreground hover:bg-accent/90"><Plus className="h-4 w-4" /> تعبئة جديدة</Button>
          </div>
        }
      />

      <div className="mb-4 flex flex-wrap gap-3 items-center">
        <SearchInput value={q} onChange={setQ} placeholder="بحث بلوحة/سائق/محطة…" />
        <Select value={vehicleFilter} onValueChange={setVehicleFilter}>
          <SelectTrigger className="w-64"><SelectValue placeholder="فلترة حسب الشاحنة" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">جميع الشاحنات</SelectItem>
            {vehicles.map((v) => <SelectItem key={v.id} value={v.id}>{v.plate_number}</SelectItem>)}
          </SelectContent>
        </Select>
      </div>

      <div className="mb-4 grid gap-3 md:grid-cols-3">
        <Card label="عدد التعبئات" value={filtered.length} />
        <Card label="إجمالي اللترات" value={`${totalLiters.toFixed(0)}L`} />
        <Card label="إجمالي التكلفة" value={`${totalCost.toFixed(0)} MAD`} accent />
      </div>

      {loading ? (
        <div className="flex justify-center py-16"><Loader2 className="h-6 w-6 animate-spin text-accent" /></div>
      ) : filtered.length === 0 ? (
        <EmptyState icon={Fuel} title="لا توجد تعبئات" description="سجّل أول تعبئة وقود." />
      ) : (
        <div className="rounded-2xl border border-border bg-card overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-secondary/50 text-xs uppercase text-muted-foreground">
              <tr>
                <th className="p-4 text-right">التاريخ</th>
                <th className="p-4 text-right">الشاحنة</th>
                <th className="p-4 text-right">السائق</th>
                <th className="p-4 text-right">اللترات</th>
                <th className="p-4 text-right">التكلفة</th>
                <th className="p-4 text-right">العداد</th>
                <th className="p-4 text-right">إجراءات</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((r) => (
                <tr key={r.id} className="border-t border-border hover:bg-secondary/30">
                  <td className="p-4" dir="ltr">{r.fuel_date}</td>
                  <td className="p-4 font-semibold" dir="ltr">{r.vehicles?.plate_number ?? "—"}</td>
                  <td className="p-4">{r.drivers?.full_name ?? "—"}</td>
                  <td className="p-4">{Number(r.liters).toFixed(2)}L</td>
                  <td className="p-4 font-semibold text-accent">{Number(r.cost).toFixed(2)}</td>
                  <td className="p-4" dir="ltr">{r.odometer ?? "—"}</td>
                  <td className="p-4">
                    <div className="flex gap-1">
                      <Button variant="ghost" size="sm" onClick={() => openEdit(r)}><Pencil className="h-4 w-4" /></Button>
                      <Button variant="ghost" size="sm" onClick={() => onDelete(r.id)} className="text-destructive hover:bg-destructive/10 hover:text-destructive"><Trash2 className="h-4 w-4" /></Button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent dir="rtl">
          <DialogHeader><DialogTitle>{editingId ? "تعديل تعبئة" : "تسجيل تعبئة وقود"}</DialogTitle></DialogHeader>
          <form onSubmit={onSubmit} className="space-y-4">
            <div className="grid grid-cols-2 gap-3">
              <div><Label>التاريخ *</Label><Input type="date" required value={form.fuel_date} onChange={(e) => setForm({ ...form, fuel_date: e.target.value })} /></div>
              <div><Label>المحطة</Label><Input value={form.station} onChange={(e) => setForm({ ...form, station: e.target.value })} /></div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div><Label>الكمية (لتر) *</Label><Input type="number" step="0.01" required value={form.liters} onChange={(e) => setForm({ ...form, liters: e.target.value })} /></div>
              <div><Label>التكلفة (MAD)</Label><Input type="number" step="0.01" value={form.cost} onChange={(e) => setForm({ ...form, cost: e.target.value })} /></div>
            </div>
            <div><Label>عداد الكيلومترات</Label><Input type="number" value={form.odometer} onChange={(e) => setForm({ ...form, odometer: e.target.value })} /></div>
            <div className="grid grid-cols-2 gap-3">
              <div><Label>الشاحنة</Label>
                <Select value={form.vehicle_id} onValueChange={(v) => setForm({ ...form, vehicle_id: v })}>
                  <SelectTrigger><SelectValue placeholder="اختر..." /></SelectTrigger>
                  <SelectContent>{vehicles.map((v) => <SelectItem key={v.id} value={v.id}>{v.plate_number}</SelectItem>)}</SelectContent>
                </Select>
              </div>
              <div><Label>السائق</Label>
                <Select value={form.driver_id} onValueChange={(v) => setForm({ ...form, driver_id: v })}>
                  <SelectTrigger><SelectValue placeholder="اختر..." /></SelectTrigger>
                  <SelectContent>{drivers.map((d) => <SelectItem key={d.id} value={d.id}>{d.full_name}</SelectItem>)}</SelectContent>
                </Select>
              </div>
            </div>
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

function Card({ label, value, accent }: { label: string; value: string | number; accent?: boolean }) {
  return (
    <div className="rounded-xl border border-border bg-card p-4">
      <div className="text-xs text-muted-foreground">{label}</div>
      <div className={`mt-1 text-2xl font-black ${accent ? "text-accent" : ""}`}>{value}</div>
    </div>
  );
}
