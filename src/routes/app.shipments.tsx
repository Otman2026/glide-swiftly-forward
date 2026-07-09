import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { PageHeader, EmptyState } from "@/components/dashboard-layout";
import { Package, Plus, Search, Trash2, Loader2, MapPin, Printer } from "lucide-react";
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
import { printHTML, esc } from "@/lib/print";
import { ExportBar } from "@/components/export-bar";
import { RoutePicker, type RouteValue } from "@/components/route-picker";
import { DEFAULT_COUNTRY, SCOPE_LABELS, scopeFor } from "@/lib/geo";

export const Route = createFileRoute("/app/shipments")({ component: ShipmentsPage });

type Status = "planned" | "loading" | "in_transit" | "delivered" | "cancelled";
type Scope = "local" | "national" | "international";
type Shipment = {
  id: string; shipment_number: string; origin: string; destination: string;
  distance_km: number | null; status: Status;
  order_id: string | null; vehicle_id: string | null; driver_id: string | null;
  scope: Scope | null;
  origin_country: string | null; origin_city: string | null;
  destination_country: string | null; destination_city: string | null;
  vehicles?: { plate_number: string } | null;
  drivers?: { full_name: string } | null;
  transport_orders?: { order_number: string } | null;
};

const STATUS_LABEL: Record<Status, string> = {
  planned: "مبرمجة", loading: "قيد التحميل", in_transit: "في الطريق",
  delivered: "مُسلَّمة", cancelled: "ملغاة",
};
const STATUS_COLOR: Record<Status, string> = {
  planned: "bg-muted text-muted-foreground",
  loading: "bg-primary/10 text-primary",
  in_transit: "bg-warning/10 text-warning-foreground",
  delivered: "bg-success/10 text-success",
  cancelled: "bg-destructive/10 text-destructive",
};

function ShipmentsPage() {
  const nav = useNavigate();
  const [rows, setRows] = useState<Shipment[]>([]);
  const [orders, setOrders] = useState<{ id: string; order_number: string }[]>([]);
  const [vehicles, setVehicles] = useState<{ id: string; plate_number: string }[]>([]);
  const [drivers, setDrivers] = useState<{ id: string; full_name: string }[]>([]);
  const [loading, setLoading] = useState(true);
  const [q, setQ] = useState("");
  const [statusFilter, setStatusFilter] = useState<"all" | Status>("all");
  const [open, setOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({
    shipment_number: "", order_id: "none", vehicle_id: "none", driver_id: "none",
    origin: "", destination: "", distance_km: "", status: "planned" as Status,
    origin_country: DEFAULT_COUNTRY as string | null,
    origin_city: null as string | null,
    destination_country: DEFAULT_COUNTRY as string | null,
    destination_city: null as string | null,
  });

  const load = async () => {
    setLoading(true);
    const [{ data, error }, { data: o }, { data: v }, { data: d }] = await Promise.all([
      supabase.from("shipments")
        .select("id,shipment_number,origin,destination,distance_km,status,order_id,vehicle_id,driver_id,scope,origin_country,origin_city,destination_country,destination_city,vehicles(plate_number),drivers(full_name),transport_orders(order_number)")
        .order("created_at", { ascending: false }),
      supabase.from("transport_orders").select("id,order_number").order("created_at", { ascending: false }),
      supabase.from("vehicles").select("id,plate_number"),
      supabase.from("drivers").select("id,full_name"),
    ]);
    if (error) toast.error(error.message);
    else setRows((data ?? []) as unknown as Shipment[]);
    setOrders(o ?? []); setVehicles(v ?? []); setDrivers(d ?? []);
    setLoading(false);
  };
  useEffect(() => { load(); }, []);

  const onCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    const { data: profile } = await supabase.from("profiles").select("tenant_id").maybeSingle();
    if (!profile?.tenant_id) { toast.error("لا توجد شركة"); setSaving(false); return; }
    const scope = scopeFor(form.origin_country, form.destination_country, form.origin_city, form.destination_city);
    const { error } = await supabase.from("shipments").insert({
      tenant_id: profile.tenant_id, shipment_number: form.shipment_number,
      order_id: form.order_id !== "none" ? form.order_id : null,
      vehicle_id: form.vehicle_id !== "none" ? form.vehicle_id : null,
      driver_id: form.driver_id !== "none" ? form.driver_id : null,
      origin: form.origin, destination: form.destination,
      origin_country: form.origin_country, origin_city: form.origin_city,
      destination_country: form.destination_country, destination_city: form.destination_city,
      scope,
      distance_km: form.distance_km ? Number(form.distance_km) : null,
      status: form.status,
    });
    setSaving(false);
    if (error) return toast.error(error.message);
    toast.success("تمت إضافة الشحنة");
    setOpen(false);
    setForm({
      shipment_number: "", order_id: "none", vehicle_id: "none", driver_id: "none",
      origin: "", destination: "", distance_km: "", status: "planned",
      origin_country: DEFAULT_COUNTRY, origin_city: null,
      destination_country: DEFAULT_COUNTRY, destination_city: null,
    });
    load();
  };

  const onQuickStatus = async (id: string, status: Status) => {
    const { error } = await supabase.from("shipments").update({ status }).eq("id", id);
    if (error) toast.error(error.message); else { toast.success("تم تحديث الحالة"); load(); }
  };

  const onDelete = async (id: string) => {
    if (!confirm("حذف هذه الشحنة؟")) return;
    const { error } = await supabase.from("shipments").delete().eq("id", id);
    if (error) toast.error(error.message); else { toast.success("تم الحذف"); load(); }
  };

  const onTrack = () => nav({ to: "/app/tracking" });

  const onPrint = (s: Shipment) => {
    printHTML(`بوليصة شحن ${s.shipment_number}`, `
      <h1>بوليصة شحن ${esc(s.shipment_number)}</h1>
      <h2>${esc(s.origin)} → ${esc(s.destination)}</h2>
      <dl class="kv">
        <dt>رقم الشحنة</dt><dd dir="ltr">${esc(s.shipment_number)}</dd>
        <dt>أمر النقل</dt><dd dir="ltr">${esc(s.transport_orders?.order_number)}</dd>
        <dt>المركبة</dt><dd dir="ltr">${esc(s.vehicles?.plate_number)}</dd>
        <dt>السائق</dt><dd>${esc(s.drivers?.full_name)}</dd>
        <dt>نقطة التحميل</dt><dd>${esc(s.origin)}</dd>
        <dt>نقطة التسليم</dt><dd>${esc(s.destination)}</dd>
        <dt>المسافة</dt><dd>${s.distance_km ? `${s.distance_km} كم` : "—"}</dd>
        <dt>الحالة</dt><dd>${esc(STATUS_LABEL[s.status])}</dd>
      </dl>
      <div style="margin-top:60px;display:flex;justify-content:space-between;font-size:13px">
        <div>توقيع المرسِل: ______________________</div>
        <div>توقيع المستلِم: ______________________</div>
      </div>`);
  };




  const filtered = rows.filter((r) => {
    if (statusFilter !== "all" && r.status !== statusFilter) return false;
    if (!q) return true;
    return (r.shipment_number + " " + r.origin + " " + r.destination).toLowerCase().includes(q.toLowerCase());
  });

  return (
    <>
      <PageHeader title="الشحنات" subtitle="متابعة الشحنات المعيَّنة، المركبة، السائق، والمسافة"
        action={
          <div className="flex flex-wrap gap-2">
            <ExportBar
              filename="shipments"
              title="الشحنات"
              rows={filtered}
              columns={[
                { key: "shipment_number", label: "الرقم" },
                { key: "origin", label: "من" },
                { key: "destination", label: "إلى" },
                { key: "vehicle", label: "المركبة", format: (r) => r.vehicles?.plate_number ?? "" },
                { key: "driver", label: "السائق", format: (r) => r.drivers?.full_name ?? "" },
                { key: "distance_km", label: "المسافة (كم)" },
                { key: "status", label: "الحالة", format: (r) => STATUS_LABEL[r.status] },
              ]}
            />
            <Button onClick={() => setOpen(true)} className="gap-2 bg-accent text-accent-foreground hover:bg-accent/90">
              <Plus className="h-4 w-4" /> شحنة جديدة
            </Button>
          </div>
        }
      />

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent dir="rtl" className="max-w-2xl">
          <DialogHeader><DialogTitle>إضافة شحنة</DialogTitle></DialogHeader>
          <form onSubmit={onCreate} className="space-y-4">
            <div className="grid grid-cols-2 gap-3">
              <div><Label>رقم الشحنة *</Label>
                <Input required dir="ltr" value={form.shipment_number} onChange={(e) => setForm({ ...form, shipment_number: e.target.value })} /></div>
              <div><Label>أمر النقل</Label>
                <Select value={form.order_id} onValueChange={(v) => setForm({ ...form, order_id: v })}>
                  <SelectTrigger><SelectValue placeholder="اختياري" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">— بدون —</SelectItem>
                    {orders.map((o) => <SelectItem key={o.id} value={o.id}>{o.order_number}</SelectItem>)}
                  </SelectContent>
                </Select></div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div><Label>المركبة</Label>
                <Select value={form.vehicle_id} onValueChange={(v) => setForm({ ...form, vehicle_id: v })}>
                  <SelectTrigger><SelectValue placeholder="اختياري" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">— بدون —</SelectItem>
                    {vehicles.map((v) => <SelectItem key={v.id} value={v.id}>{v.plate_number}</SelectItem>)}
                  </SelectContent>
                </Select></div>
              <div><Label>السائق</Label>
                <Select value={form.driver_id} onValueChange={(v) => setForm({ ...form, driver_id: v })}>
                  <SelectTrigger><SelectValue placeholder="اختياري" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">— بدون —</SelectItem>
                    {drivers.map((d) => <SelectItem key={d.id} value={d.id}>{d.full_name}</SelectItem>)}
                  </SelectContent>
                </Select></div>
            </div>
            <RoutePicker
              value={{
                origin_country: form.origin_country,
                origin_city: form.origin_city,
                destination_country: form.destination_country,
                destination_city: form.destination_city,
              }}
              onChange={(v: RouteValue) => setForm({ ...form, ...v })}
              onLegacyChange={(o, d) => setForm((f) => ({ ...f, origin: o, destination: d }))}
            />
            <div className="grid grid-cols-2 gap-3">
              <div><Label>المسافة (كم)</Label>
                <Input type="number" step="0.1" value={form.distance_km} onChange={(e) => setForm({ ...form, distance_km: e.target.value })} /></div>
              <div><Label>الحالة</Label>
                <Select value={form.status} onValueChange={(v) => setForm({ ...form, status: v as Status })}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>{Object.entries(STATUS_LABEL).map(([k, l]) => <SelectItem key={k} value={k}>{l}</SelectItem>)}</SelectContent>
                </Select></div>
            </div>
            <DialogFooter>
              <Button type="submit" disabled={saving} className="gap-2 bg-accent text-accent-foreground hover:bg-accent/90">
                {saving && <Loader2 className="h-4 w-4 animate-spin" />} حفظ
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      <div className="mb-4 flex flex-wrap items-center gap-3">
        <div className="relative flex-1 min-w-64 max-w-md">
          <Search className="pointer-events-none absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="بحث..."
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
        <EmptyState icon={Package} title="لا توجد شحنات" description="أضف أول شحنة بربطها بالمركبة والسائق." />
      ) : (
        <div className="rounded-2xl border border-border bg-card overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-secondary/50 text-xs uppercase text-muted-foreground">
              <tr>
                <th className="p-4 text-right font-semibold">رقم</th>
                <th className="p-4 text-right font-semibold">من</th>
                <th className="p-4 text-right font-semibold">إلى</th>
                <th className="p-4 text-right font-semibold">المركبة</th>
                <th className="p-4 text-right font-semibold">السائق</th>
                <th className="p-4 text-right font-semibold">المسافة</th>
                <th className="p-4 text-right font-semibold">الحالة</th>
                <th className="p-4 text-right font-semibold">إجراءات</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((s) => (
                <tr key={s.id} className="border-t border-border hover:bg-secondary/30">
                  <td className="p-4 font-mono font-semibold text-primary" dir="ltr">{s.shipment_number}</td>
                  <td className="p-4">{s.origin}</td>
                  <td className="p-4">{s.destination}</td>
                  <td className="p-4 font-mono text-xs" dir="ltr">{s.vehicles?.plate_number ?? "—"}</td>
                  <td className="p-4">{s.drivers?.full_name ?? "—"}</td>
                  <td className="p-4">{s.distance_km ? `${s.distance_km} كم` : "—"}</td>
                  <td className="p-4">
                    <Select value={s.status} onValueChange={(v) => onQuickStatus(s.id, v as Status)}>
                      <SelectTrigger className={`h-8 w-32 text-xs font-semibold border-0 ${STATUS_COLOR[s.status]}`}><SelectValue /></SelectTrigger>
                      <SelectContent>{Object.entries(STATUS_LABEL).map(([k, l]) => <SelectItem key={k} value={k}>{l}</SelectItem>)}</SelectContent>
                    </Select>
                  </td>
                  <td className="p-4">
                    <div className="flex gap-1">
                      <Button variant="ghost" size="sm" onClick={onTrack} title="تتبع" className="text-accent"><MapPin className="h-4 w-4" /></Button>
                      <Button variant="ghost" size="sm" onClick={() => onPrint(s)} title="طباعة"><Printer className="h-4 w-4" /></Button>
                      <Button variant="ghost" size="sm" onClick={() => onDelete(s.id)} title="حذف"
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
