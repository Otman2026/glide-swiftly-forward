import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { PageHeader, EmptyState } from "@/components/dashboard-layout";
import { StatCard } from "@/components/stat-card";
import { Route as RouteIcon, Plus, Search, Trash2, Loader2, Play, Square, MapPin, Printer, Download } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { exportToCSV } from "@/lib/csv";
import { printHTML, esc } from "@/lib/print";
import { ExportBar } from "@/components/export-bar";
import { RoutePicker, type RouteValue } from "@/components/route-picker";
import { DEFAULT_COUNTRY, SCOPE_LABELS, scopeFor } from "@/lib/geo";

export const Route = createFileRoute("/app/trips")({ component: TripsPage });

type Scope = "local" | "national" | "international";
type Trip = {
  id: string; trip_number: string; origin: string | null; destination: string | null;
  distance_km: number | null; revenue: number | null; cost: number | null;
  status: string; start_date: string | null; end_date: string | null;
  scope: Scope | null;
  origin_country: string | null; origin_city: string | null;
  destination_country: string | null; destination_city: string | null;
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

const emptyForm = {
  trip_number: "", vehicle_id: "", driver_id: "", customer_id: "",
  origin: "", destination: "", distance_km: "", revenue: "", cost: "", status: "planned",
  origin_country: DEFAULT_COUNTRY as string | null,
  origin_city: null as string | null,
  destination_country: DEFAULT_COUNTRY as string | null,
  destination_city: null as string | null,
};

function TripsPage() {
  const nav = useNavigate();
  const [rows, setRows] = useState<Trip[]>([]);
  const [loading, setLoading] = useState(true);
  const [q, setQ] = useState("");
  const [open, setOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [vehicles, setVehicles] = useState<Opt[]>([]);
  const [drivers, setDrivers] = useState<Opt[]>([]);
  const [customers, setCustomers] = useState<Opt[]>([]);
  const [form, setForm] = useState(emptyForm);

  const load = async () => {
    setLoading(true);
    const [t, v, d, c] = await Promise.all([
      supabase.from("trips").select("id,trip_number,origin,destination,distance_km,revenue,cost,status,start_date,end_date,scope,origin_country,origin_city,destination_country,destination_city,vehicles(plate_number),drivers(full_name),customers(name)").order("created_at", { ascending: false }),
      supabase.from("vehicles").select("id,plate_number"),
      supabase.from("drivers").select("id,full_name"),
      supabase.from("customers").select("id,name"),
    ]);
    if (t.error) toast.error(t.error.message);
    else setRows((t.data ?? []) as unknown as Trip[]);
    setVehicles((v.data ?? []).map((x) => ({ id: x.id, label: x.plate_number })));
    setDrivers((d.data ?? []).map((x) => ({ id: x.id, label: x.full_name })));
    setCustomers((c.data ?? []).map((x) => ({ id: x.id, label: x.name })));
    setLoading(false);
  };
  useEffect(() => { load(); }, []);

  const onCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    const { data: profile } = await supabase.from("profiles").select("tenant_id").maybeSingle();
    if (!profile?.tenant_id) { toast.error("لا توجد شركة"); setSaving(false); return; }
    const scope = scopeFor(form.origin_country, form.destination_country, form.origin_city, form.destination_city);
    const { error } = await supabase.from("trips").insert({
      tenant_id: profile.tenant_id, trip_number: form.trip_number,
      vehicle_id: form.vehicle_id || null, driver_id: form.driver_id || null,
      customer_id: form.customer_id || null,
      origin: form.origin || null, destination: form.destination || null,
      origin_country: form.origin_country, origin_city: form.origin_city,
      destination_country: form.destination_country, destination_city: form.destination_city,
      scope,
      distance_km: form.distance_km ? Number(form.distance_km) : null,
      revenue: form.revenue ? Number(form.revenue) : 0,
      cost: form.cost ? Number(form.cost) : 0,
      status: form.status,
    });
    setSaving(false);
    if (error) return toast.error(error.message);
    toast.success("تم إنشاء الرحلة");
    setOpen(false); setForm(emptyForm); load();
  };

  const onStart = async (t: Trip) => {
    const { error } = await supabase.from("trips").update({
      status: "in_progress", start_date: t.start_date ?? new Date().toISOString(),
    }).eq("id", t.id);
    if (error) toast.error(error.message); else { toast.success("بدأت الرحلة"); load(); }
  };

  const onEnd = async (t: Trip) => {
    if (!confirm(`إنهاء الرحلة ${t.trip_number}؟`)) return;
    const { error } = await supabase.from("trips").update({
      status: "completed", end_date: new Date().toISOString(),
    }).eq("id", t.id);
    if (error) toast.error(error.message); else { toast.success("تم إنهاء الرحلة"); load(); }
  };

  const onDelete = async (id: string) => {
    if (!confirm("حذف هذه الرحلة؟")) return;
    const { error } = await supabase.from("trips").delete().eq("id", id);
    if (error) toast.error(error.message); else { toast.success("تم الحذف"); load(); }
  };

  const onViewRoute = () => nav({ to: "/app/tracking" });

  const onPrintReport = (t: Trip) => {
    const profit = (Number(t.revenue) || 0) - (Number(t.cost) || 0);
    const duration = t.start_date && t.end_date
      ? Math.round((new Date(t.end_date).getTime() - new Date(t.start_date).getTime()) / 3_600_000) : null;
    printHTML(`تقرير رحلة ${t.trip_number}`, `
      <h1>تقرير الرحلة ${esc(t.trip_number)}</h1>
      <h2>${esc(t.origin)} → ${esc(t.destination)}</h2>
      <dl class="kv">
        <dt>المركبة</dt><dd dir="ltr">${esc(t.vehicles?.plate_number)}</dd>
        <dt>السائق</dt><dd>${esc(t.drivers?.full_name)}</dd>
        <dt>العميل</dt><dd>${esc(t.customers?.name)}</dd>
        <dt>تاريخ البدء</dt><dd dir="ltr">${t.start_date ? new Date(t.start_date).toLocaleString("ar-MA") : "—"}</dd>
        <dt>تاريخ الانتهاء</dt><dd dir="ltr">${t.end_date ? new Date(t.end_date).toLocaleString("ar-MA") : "—"}</dd>
        <dt>المدة</dt><dd>${duration !== null ? `${duration} ساعة` : "—"}</dd>
        <dt>المسافة</dt><dd>${t.distance_km ? `${t.distance_km} كم` : "—"}</dd>
        <dt>الإيرادات</dt><dd>${Number(t.revenue || 0).toLocaleString()} MAD</dd>
        <dt>التكلفة</dt><dd>${Number(t.cost || 0).toLocaleString()} MAD</dd>
        <dt>صافي الربح</dt><dd style="font-weight:800;color:${profit >= 0 ? "#16a34a" : "#dc2626"}">${profit.toLocaleString()} MAD</dd>
        <dt>الحالة</dt><dd>${esc(STATUS_LABEL[t.status] ?? t.status)}</dd>
      </dl>`);
  };

  const onExport = () => {
    if (filtered.length === 0) return toast.error("لا توجد بيانات");
    exportToCSV(filtered, [
      { key: "trip_number", label: "الرقم" },
      { key: "origin", label: "من" },
      { key: "destination", label: "إلى" },
      { key: "vehicle", label: "المركبة", get: (r) => r.vehicles?.plate_number ?? "" },
      { key: "driver", label: "السائق", get: (r) => r.drivers?.full_name ?? "" },
      { key: "customer", label: "العميل", get: (r) => r.customers?.name ?? "" },
      { key: "distance_km", label: "المسافة" },
      { key: "revenue", label: "الإيرادات" },
      { key: "cost", label: "التكلفة" },
      { key: "profit", label: "الربح", get: (r) => (Number(r.revenue || 0) - Number(r.cost || 0)) },
      { key: "status", label: "الحالة", get: (r) => STATUS_LABEL[r.status] ?? r.status },
    ], `trips-${new Date().toISOString().slice(0, 10)}`);
    toast.success("تم التصدير");
  };

  const filtered = rows.filter((r) => q ? r.trip_number.toLowerCase().includes(q.toLowerCase()) : true);
  const revenue = rows.reduce((s, r) => s + (Number(r.revenue) || 0), 0);
  const cost = rows.reduce((s, r) => s + (Number(r.cost) || 0), 0);
  const active = rows.filter(r => r.status === "in_progress").length;
  const done = rows.filter(r => r.status === "completed").length;

  return (
    <>
      <PageHeader title="إدارة الرحلات" subtitle="بدء، إنهاء، عرض المسار، وطباعة التقارير"
        action={
          <div className="flex flex-wrap gap-2">
            <ExportBar
              filename="trips"
              title="الرحلات"
              rows={filtered}
              columns={[
                { key: "trip_number", label: "رقم الرحلة" },
                { key: "origin", label: "من" },
                { key: "destination", label: "إلى" },
                { key: "distance_km", label: "المسافة (كم)" },
                { key: "revenue", label: "الإيراد" },
                { key: "cost", label: "التكلفة" },
                { key: "status", label: "الحالة", format: (r) => STATUS_LABEL[r.status] ?? r.status },
                { key: "vehicles", label: "المركبة", format: (r) => r.vehicles?.plate_number ?? "" },
                { key: "drivers", label: "السائق", format: (r) => r.drivers?.full_name ?? "" },
                { key: "customers", label: "العميل", format: (r) => r.customers?.name ?? "" },
              ]}
            />
            <Button onClick={() => setOpen(true)} className="gap-2 bg-accent text-accent-foreground hover:bg-accent/90">
              <Plus className="h-4 w-4" /> رحلة جديدة
            </Button>
          </div>
        }
      />

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent dir="rtl" className="max-w-2xl">
          <DialogHeader><DialogTitle>إضافة رحلة</DialogTitle></DialogHeader>
          <form onSubmit={onCreate} className="space-y-4">
            <div className="grid grid-cols-2 gap-3">
              <div><Label>رقم الرحلة *</Label><Input required dir="ltr" value={form.trip_number} onChange={(e) => setForm({ ...form, trip_number: e.target.value })} /></div>
              <div><Label>الحالة</Label>
                <select value={form.status} onChange={(e) => setForm({ ...form, status: e.target.value })} className="h-10 w-full rounded-md border border-border bg-background px-3 text-sm">
                  {Object.entries(STATUS_LABEL).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
                </select></div>
            </div>
            <div className="grid grid-cols-3 gap-3">
              <div><Label>المركبة</Label>
                <select value={form.vehicle_id} onChange={(e) => setForm({ ...form, vehicle_id: e.target.value })} className="h-10 w-full rounded-md border border-border bg-background px-3 text-sm">
                  <option value="">—</option>{vehicles.map(o => <option key={o.id} value={o.id}>{o.label}</option>)}
                </select></div>
              <div><Label>السائق</Label>
                <select value={form.driver_id} onChange={(e) => setForm({ ...form, driver_id: e.target.value })} className="h-10 w-full rounded-md border border-border bg-background px-3 text-sm">
                  <option value="">—</option>{drivers.map(o => <option key={o.id} value={o.id}>{o.label}</option>)}
                </select></div>
              <div><Label>العميل</Label>
                <select value={form.customer_id} onChange={(e) => setForm({ ...form, customer_id: e.target.value })} className="h-10 w-full rounded-md border border-border bg-background px-3 text-sm">
                  <option value="">—</option>{customers.map(o => <option key={o.id} value={o.id}>{o.label}</option>)}
                </select></div>
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

      <div className="mb-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard label="جارية" value={active} tone="brand" />
        <StatCard label="مكتملة" value={done} tone="success" />
        <StatCard label="الإيرادات" value={`${(revenue / 1000).toFixed(1)}K MAD`} tone="info" />
        <StatCard label="صافي الربح" value={`${((revenue - cost) / 1000).toFixed(1)}K MAD`} tone={revenue - cost >= 0 ? "success" : "danger"} />
      </div>


      <div className="mb-4 relative">
        <Search className="pointer-events-none absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
        <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="بحث برقم الرحلة..." className="h-10 w-full rounded-lg border border-border bg-card pr-10 pl-4 text-sm focus:border-accent focus:outline-none focus:ring-2 focus:ring-accent/20" />
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-16"><Loader2 className="h-6 w-6 animate-spin text-accent" /></div>
      ) : filtered.length === 0 ? (
        <EmptyState icon={RouteIcon} title="لا توجد رحلات" description="أنشئ أول رحلة من زر (رحلة جديدة)." />
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
                <th className="p-4 text-right font-semibold">إجراءات</th>
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
                      <div className="flex flex-wrap gap-1">
                        {r.status === "planned" && (
                          <Button variant="ghost" size="sm" onClick={() => onStart(r)} title="بدء" className="text-accent"><Play className="h-4 w-4" /></Button>
                        )}
                        {r.status === "in_progress" && (
                          <Button variant="ghost" size="sm" onClick={() => onEnd(r)} title="إنهاء" className="text-success"><Square className="h-4 w-4" /></Button>
                        )}
                        <Button variant="ghost" size="sm" onClick={onViewRoute} title="عرض المسار"><MapPin className="h-4 w-4" /></Button>
                        <Button variant="ghost" size="sm" onClick={() => onPrintReport(r)} title="تقرير"><Printer className="h-4 w-4" /></Button>
                        <Button variant="ghost" size="sm" onClick={() => onDelete(r.id)} title="حذف" className="text-destructive hover:bg-destructive/10 hover:text-destructive"><Trash2 className="h-4 w-4" /></Button>
                      </div>
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
