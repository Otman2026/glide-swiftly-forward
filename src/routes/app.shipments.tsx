import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { PageHeader, EmptyState } from "@/components/dashboard-layout";
import { Package, Plus, Search, Trash2, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle, DialogTrigger,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";

export const Route = createFileRoute("/app/shipments")({ component: ShipmentsPage });

type Shipment = {
  id: string;
  shipment_number: string;
  origin: string;
  destination: string;
  distance_km: number | null;
  status: "planned" | "loading" | "in_transit" | "delivered" | "cancelled";
  order_id: string | null;
  vehicle_id: string | null;
  driver_id: string | null;
  vehicles?: { plate_number: string } | null;
  drivers?: { full_name: string } | null;
};

const STATUS_LABEL: Record<Shipment["status"], string> = {
  planned: "مبرمجة", loading: "قيد التحميل", in_transit: "في الطريق",
  delivered: "مُسلَّمة", cancelled: "ملغاة",
};
const STATUS_COLOR: Record<Shipment["status"], string> = {
  planned: "bg-muted text-muted-foreground",
  loading: "bg-primary/10 text-primary",
  in_transit: "bg-warning/10 text-warning-foreground",
  delivered: "bg-success/10 text-success",
  cancelled: "bg-destructive/10 text-destructive",
};

function ShipmentsPage() {
  const [rows, setRows] = useState<Shipment[]>([]);
  const [orders, setOrders] = useState<{ id: string; order_number: string }[]>([]);
  const [vehicles, setVehicles] = useState<{ id: string; plate_number: string }[]>([]);
  const [drivers, setDrivers] = useState<{ id: string; full_name: string }[]>([]);
  const [loading, setLoading] = useState(true);
  const [q, setQ] = useState("");
  const [open, setOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({
    shipment_number: "", order_id: "none", vehicle_id: "none", driver_id: "none",
    origin: "", destination: "", distance_km: "", status: "planned",
  });

  const load = async () => {
    setLoading(true);
    const [{ data, error }, { data: o }, { data: v }, { data: d }] = await Promise.all([
      supabase.from("shipments")
        .select("id,shipment_number,origin,destination,distance_km,status,order_id,vehicle_id,driver_id,vehicles(plate_number),drivers(full_name)")
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
    if (!profile?.tenant_id) { toast.error("لا توجد شركة مرتبطة بحسابك"); setSaving(false); return; }
    const { error } = await supabase.from("shipments").insert({
      tenant_id: profile.tenant_id,
      shipment_number: form.shipment_number,
      order_id: form.order_id !== "none" ? form.order_id : null,
      vehicle_id: form.vehicle_id !== "none" ? form.vehicle_id : null,
      driver_id: form.driver_id !== "none" ? form.driver_id : null,
      origin: form.origin,
      destination: form.destination,
      distance_km: form.distance_km ? Number(form.distance_km) : null,
      status: form.status as Shipment["status"],
    });
    setSaving(false);
    if (error) return toast.error(error.message);
    toast.success("تمت إضافة الشحنة");
    setOpen(false);
    setForm({ shipment_number: "", order_id: "none", vehicle_id: "none", driver_id: "none", origin: "", destination: "", distance_km: "", status: "planned" });
    load();
  };

  const onDelete = async (id: string) => {
    if (!confirm("حذف هذه الشحنة؟")) return;
    const { error } = await supabase.from("shipments").delete().eq("id", id);
    if (error) toast.error(error.message); else { toast.success("تم الحذف"); load(); }
  };

  const filtered = rows.filter((r) => q ? (r.shipment_number + r.origin + r.destination).toLowerCase().includes(q.toLowerCase()) : true);

  return (
    <>
      <PageHeader
        title="الشحنات"
        subtitle="متابعة الشحنات المعيَّنة، المركبة، السائق، والمسافة"
        action={
          <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger asChild>
              <Button className="gap-2 bg-accent text-accent-foreground hover:bg-accent/90">
                <Plus className="h-4 w-4" /> شحنة جديدة
              </Button>
            </DialogTrigger>
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
                <div className="grid grid-cols-2 gap-3">
                  <div><Label>من *</Label>
                    <Input required value={form.origin} onChange={(e) => setForm({ ...form, origin: e.target.value })} /></div>
                  <div><Label>إلى *</Label>
                    <Input required value={form.destination} onChange={(e) => setForm({ ...form, destination: e.target.value })} /></div>
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div><Label>المسافة (كم)</Label>
                    <Input type="number" step="0.1" value={form.distance_km} onChange={(e) => setForm({ ...form, distance_km: e.target.value })} /></div>
                  <div>
                    <Label>الحالة</Label>
                    <Select value={form.status} onValueChange={(v) => setForm({ ...form, status: v })}>
                      <SelectTrigger><SelectValue /></SelectTrigger>
                      <SelectContent>{Object.entries(STATUS_LABEL).map(([k, l]) => <SelectItem key={k} value={k}>{l}</SelectItem>)}</SelectContent>
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
        }
      />

      <div className="mb-4 relative max-w-md">
        <Search className="pointer-events-none absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
        <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="بحث..."
          className="h-10 w-full rounded-lg border border-border bg-card pr-10 pl-4 text-sm focus:border-accent focus:outline-none focus:ring-2 focus:ring-accent/20" />
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
                <th className="p-4 text-right font-semibold"></th>
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
                    <span className={`inline-flex rounded-md px-2 py-1 text-xs font-semibold ${STATUS_COLOR[s.status]}`}>
                      {STATUS_LABEL[s.status]}
                    </span>
                  </td>
                  <td className="p-4">
                    <Button variant="ghost" size="sm" onClick={() => onDelete(s.id)}
                      className="text-destructive hover:bg-destructive/10 hover:text-destructive">
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
