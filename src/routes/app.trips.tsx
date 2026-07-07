import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { PageHeader, EmptyState } from "@/components/dashboard-layout";
import { Route as RouteIcon, Plus, Search, Trash2, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle, DialogTrigger,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";

export const Route = createFileRoute("/app/trips")({
  component: TripsPage,
});

type Trip = {
  id: string;
  trip_number: string;
  origin: string | null;
  destination: string | null;
  distance_km: number | null;
  revenue: number | null;
  cost: number | null;
  status: string;
  start_date: string | null;
  end_date: string | null;
  vehicles: { plate_number: string } | null;
  drivers: { full_name: string } | null;
  customers: { name: string } | null;
};

type Opt = { id: string; label: string };

const STATUS_LABEL: Record<string, string> = {
  planned: "مخططة", in_progress: "جارية", completed: "مكتملة", cancelled: "ملغاة",
};
const STATUS_COLOR: Record<string, string> = {
  planned: "bg-muted text-muted-foreground",
  in_progress: "bg-accent/10 text-accent",
  completed: "bg-success/10 text-success",
  cancelled: "bg-destructive/10 text-destructive",
};

function TripsPage() {
  const [rows, setRows] = useState<Trip[]>([]);
  const [loading, setLoading] = useState(true);
  const [q, setQ] = useState("");
  const [open, setOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [vehicles, setVehicles] = useState<Opt[]>([]);
  const [drivers, setDrivers] = useState<Opt[]>([]);
  const [customers, setCustomers] = useState<Opt[]>([]);
  const [form, setForm] = useState({
    trip_number: "", vehicle_id: "", driver_id: "", customer_id: "",
    origin: "", destination: "", distance_km: "", revenue: "", cost: "", status: "planned",
  });

  const load = async () => {
    setLoading(true);
    const [t, v, d, c] = await Promise.all([
      supabase.from("trips").select("id,trip_number,origin,destination,distance_km,revenue,cost,status,start_date,end_date,vehicles(plate_number),drivers(full_name),customers(name)").order("created_at", { ascending: false }),
      supabase.from("vehicles").select("id,plate_number"),
      supabase.from("drivers").select("id,full_name"),
      supabase.from("customers").select("id,name"),
    ]);
    if (t.error) toast.error(t.error.message);
    else setRows((t.data ?? []) as any);
    setVehicles((v.data ?? []).map((x: any) => ({ id: x.id, label: x.plate_number })));
    setDrivers((d.data ?? []).map((x: any) => ({ id: x.id, label: x.full_name })));
    setCustomers((c.data ?? []).map((x: any) => ({ id: x.id, label: x.name })));
    setLoading(false);
  };

  useEffect(() => { load(); }, []);

  const onCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    const { data: profile } = await supabase.from("profiles").select("tenant_id").maybeSingle();
    if (!profile?.tenant_id) { toast.error("لا توجد شركة مرتبطة بحسابك"); setSaving(false); return; }
    const { error } = await supabase.from("trips").insert({
      tenant_id: profile.tenant_id,
      trip_number: form.trip_number,
      vehicle_id: form.vehicle_id || null,
      driver_id: form.driver_id || null,
      customer_id: form.customer_id || null,
      origin: form.origin || null,
      destination: form.destination || null,
      distance_km: form.distance_km ? Number(form.distance_km) : null,
      revenue: form.revenue ? Number(form.revenue) : 0,
      cost: form.cost ? Number(form.cost) : 0,
      status: form.status,
    });
    setSaving(false);
    if (error) { toast.error(error.message); return; }
    toast.success("تم إنشاء الرحلة");
    setOpen(false);
    setForm({ trip_number: "", vehicle_id: "", driver_id: "", customer_id: "", origin: "", destination: "", distance_km: "", revenue: "", cost: "", status: "planned" });
    load();
  };

  const onDelete = async (id: string) => {
    if (!confirm("حذف هذه الرحلة؟")) return;
    const { error } = await supabase.from("trips").delete().eq("id", id);
    if (error) toast.error(error.message);
    else { toast.success("تم الحذف"); load(); }
  };

  const filtered = rows.filter((r) => q ? r.trip_number.toLowerCase().includes(q.toLowerCase()) : true);
  const revenue = rows.reduce((s, r) => s + (Number(r.revenue) || 0), 0);
  const cost = rows.reduce((s, r) => s + (Number(r.cost) || 0), 0);
  const active = rows.filter(r => r.status === "in_progress").length;
  const done = rows.filter(r => r.status === "completed").length;

  return (
    <>
      <PageHeader
        title="إدارة الرحلات"
        subtitle="رقم الرحلة، الشاحنة، السائق، العميل، المسافة، التكلفة، الإيرادات، والربحية"
        action={
          <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger asChild>
              <Button className="gap-2 bg-accent text-accent-foreground hover:bg-accent/90">
                <Plus className="h-4 w-4" /> رحلة جديدة
              </Button>
            </DialogTrigger>
            <DialogContent dir="rtl" className="max-w-2xl">
              <DialogHeader><DialogTitle>إضافة رحلة</DialogTitle></DialogHeader>
              <form onSubmit={onCreate} className="space-y-4">
                <div className="grid grid-cols-2 gap-3">
                  <div><Label>رقم الرحلة *</Label><Input required dir="ltr" value={form.trip_number} onChange={(e) => setForm({ ...form, trip_number: e.target.value })} /></div>
                  <div>
                    <Label>الحالة</Label>
                    <select value={form.status} onChange={(e) => setForm({ ...form, status: e.target.value })} className="h-10 w-full rounded-md border border-border bg-background px-3 text-sm">
                      {Object.entries(STATUS_LABEL).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
                    </select>
                  </div>
                </div>
                <div className="grid grid-cols-3 gap-3">
                  <div>
                    <Label>المركبة</Label>
                    <select value={form.vehicle_id} onChange={(e) => setForm({ ...form, vehicle_id: e.target.value })} className="h-10 w-full rounded-md border border-border bg-background px-3 text-sm">
                      <option value="">—</option>
                      {vehicles.map(o => <option key={o.id} value={o.id}>{o.label}</option>)}
                    </select>
                  </div>
                  <div>
                    <Label>السائق</Label>
                    <select value={form.driver_id} onChange={(e) => setForm({ ...form, driver_id: e.target.value })} className="h-10 w-full rounded-md border border-border bg-background px-3 text-sm">
                      <option value="">—</option>
                      {drivers.map(o => <option key={o.id} value={o.id}>{o.label}</option>)}
                    </select>
                  </div>
                  <div>
                    <Label>العميل</Label>
                    <select value={form.customer_id} onChange={(e) => setForm({ ...form, customer_id: e.target.value })} className="h-10 w-full rounded-md border border-border bg-background px-3 text-sm">
                      <option value="">—</option>
                      {customers.map(o => <option key={o.id} value={o.id}>{o.label}</option>)}
                    </select>
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div><Label>من</Label><Input value={form.origin} onChange={(e) => setForm({ ...form, origin: e.target.value })} /></div>
                  <div><Label>إلى</Label><Input value={form.destination} onChange={(e) => setForm({ ...form, destination: e.target.value })} /></div>
                </div>
                <div className="grid grid-cols-3 gap-3">
                  <div><Label>المسافة (كم)</Label><Input type="number" dir="ltr" value={form.distance_km} onChange={(e) => setForm({ ...form, distance_km: e.target.value })} /></div>
                  <div><Label>الإيرادات (MAD)</Label><Input type="number" dir="ltr" value={form.revenue} onChange={(e) => setForm({ ...form, revenue: e.target.value })} /></div>
                  <div><Label>التكلفة (MAD)</Label><Input type="number" dir="ltr" value={form.cost} onChange={(e) => setForm({ ...form, cost: e.target.value })} /></div>
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

      <div className="mb-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <div className="rounded-2xl border border-border bg-card p-4"><div className="text-xs text-muted-foreground">رحلات جارية</div><div className="mt-1 text-2xl font-black text-accent">{active}</div></div>
        <div className="rounded-2xl border border-border bg-card p-4"><div className="text-xs text-muted-foreground">مكتملة</div><div className="mt-1 text-2xl font-black text-success">{done}</div></div>
        <div className="rounded-2xl border border-border bg-card p-4"><div className="text-xs text-muted-foreground">إجمالي الإيرادات</div><div className="mt-1 text-2xl font-black">{(revenue / 1000).toFixed(1)}K MAD</div></div>
        <div className="rounded-2xl border border-border bg-card p-4"><div className="text-xs text-muted-foreground">صافي الربح</div><div className={`mt-1 text-2xl font-black ${revenue - cost >= 0 ? "text-success" : "text-destructive"}`}>{((revenue - cost) / 1000).toFixed(1)}K MAD</div></div>
      </div>

      <div className="mb-4">
        <div className="relative">
          <Search className="pointer-events-none absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="بحث برقم الرحلة..." className="h-10 w-full rounded-lg border border-border bg-card pr-10 pl-4 text-sm focus:border-accent focus:outline-none focus:ring-2 focus:ring-accent/20" />
        </div>
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-16"><Loader2 className="h-6 w-6 animate-spin text-accent" /></div>
      ) : filtered.length === 0 ? (
        <EmptyState icon={RouteIcon} title="لا توجد رحلات بعد" description="أنشئ أول رحلة من زر (رحلة جديدة)." />
      ) : (
        <div className="rounded-2xl border border-border bg-card overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-secondary/50 text-xs uppercase text-muted-foreground">
              <tr>
                <th className="p-4 text-right font-semibold">الرقم</th>
                <th className="p-4 text-right font-semibold">المسار</th>
                <th className="p-4 text-right font-semibold">المركبة</th>
                <th className="p-4 text-right font-semibold">السائق</th>
                <th className="p-4 text-right font-semibold">العميل</th>
                <th className="p-4 text-right font-semibold">المسافة</th>
                <th className="p-4 text-right font-semibold">الربح</th>
                <th className="p-4 text-right font-semibold">الحالة</th>
                <th className="p-4 text-right font-semibold"></th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((r) => {
                const profit = (Number(r.revenue) || 0) - (Number(r.cost) || 0);
                return (
                  <tr key={r.id} className="border-t border-border hover:bg-secondary/30">
                    <td className="p-4 font-mono font-semibold" dir="ltr">{r.trip_number}</td>
                    <td className="p-4 text-xs">{r.origin ?? "—"} → {r.destination ?? "—"}</td>
                    <td className="p-4 font-mono text-xs" dir="ltr">{r.vehicles?.plate_number ?? "—"}</td>
                    <td className="p-4">{r.drivers?.full_name ?? "—"}</td>
                    <td className="p-4">{r.customers?.name ?? "—"}</td>
                    <td className="p-4" dir="ltr">{r.distance_km ? `${r.distance_km} كم` : "—"}</td>
                    <td className={`p-4 font-semibold ${profit >= 0 ? "text-success" : "text-destructive"}`} dir="ltr">{profit.toLocaleString()} MAD</td>
                    <td className="p-4"><span className={`rounded-full px-2 py-1 text-xs font-semibold ${STATUS_COLOR[r.status] ?? "bg-muted"}`}>{STATUS_LABEL[r.status] ?? r.status}</span></td>
                    <td className="p-4">
                      <Button variant="ghost" size="sm" onClick={() => onDelete(r.id)} className="text-destructive hover:bg-destructive/10 hover:text-destructive">
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </td>
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
