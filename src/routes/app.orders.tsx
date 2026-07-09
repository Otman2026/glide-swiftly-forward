import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { PageHeader, EmptyState } from "@/components/dashboard-layout";
import { ClipboardList, Plus, Search, Trash2, Loader2, Check, X, Truck, Printer } from "lucide-react";
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

export const Route = createFileRoute("/app/orders")({ component: OrdersPage });

type Status = "pending" | "confirmed" | "assigned" | "in_transit" | "delivered" | "cancelled";
type TType = "national" | "international" | "own_account" | "third_party";

type Scope = "local" | "national" | "international";
type Order = {
  id: string; order_number: string; transport_type: TType; origin: string; destination: string;
  pickup_date: string | null; delivery_date: string | null; price: number | null; currency: string | null;
  status: Status; customer_id: string; tenant_id: string;
  goods_description: string | null; weight_tons: number | null; notes: string | null;
  scope: Scope | null;
  origin_country: string | null; origin_city: string | null;
  destination_country: string | null; destination_city: string | null;
  customers?: { name: string } | null;
};

const TYPE_LABEL: Record<TType, string> = { national: "وطني", international: "دولي", own_account: "حساب خاص", third_party: "حساب الغير" };
const STATUS_LABEL: Record<Status, string> = {
  pending: "قيد الانتظار", confirmed: "مؤكد", assigned: "مُعيَّن",
  in_transit: "في الطريق", delivered: "مُسلَّم", cancelled: "ملغى",
};
const STATUS_COLOR: Record<Status, string> = {
  pending: "bg-muted text-muted-foreground",
  confirmed: "bg-primary/10 text-primary",
  assigned: "bg-accent/10 text-accent",
  in_transit: "bg-warning/10 text-warning-foreground",
  delivered: "bg-success/10 text-success",
  cancelled: "bg-destructive/10 text-destructive",
};

const emptyForm = {
  order_number: "", customer_id: "", transport_type: "national" as TType,
  origin: "", destination: "", pickup_date: "", delivery_date: "",
  price: "", currency: "MAD", status: "pending" as Status,
  goods_description: "", weight_tons: "",
  origin_country: DEFAULT_COUNTRY as string | null,
  origin_city: null as string | null,
  destination_country: DEFAULT_COUNTRY as string | null,
  destination_city: null as string | null,
};

function OrdersPage() {
  const nav = useNavigate();
  const [rows, setRows] = useState<Order[]>([]);
  const [customers, setCustomers] = useState<{ id: string; name: string }[]>([]);
  const [loading, setLoading] = useState(true);
  const [q, setQ] = useState("");
  const [statusFilter, setStatusFilter] = useState<"all" | Status>("all");
  const [open, setOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState(emptyForm);

  const load = async () => {
    setLoading(true);
    const [{ data, error }, { data: cust }] = await Promise.all([
      supabase.from("transport_orders")
        .select("id,order_number,transport_type,origin,destination,pickup_date,delivery_date,price,currency,status,customer_id,tenant_id,goods_description,weight_tons,notes,scope,origin_country,origin_city,destination_country,destination_city,customers(name)")
        .order("created_at", { ascending: false }),
      supabase.from("customers").select("id,name").order("name"),
    ]);
    if (error) toast.error(error.message);
    else setRows((data ?? []) as unknown as Order[]);
    setCustomers(cust ?? []);
    setLoading(false);
  };
  useEffect(() => { load(); }, []);

  const onCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.customer_id) return toast.error("اختر عميلاً");
    setSaving(true);
    const { data: profile } = await supabase.from("profiles").select("tenant_id").maybeSingle();
    if (!profile?.tenant_id) { toast.error("لا توجد شركة"); setSaving(false); return; }
    if (!form.origin_city || !form.destination_city) { toast.error("اختر مدينة الانطلاق والوصول"); setSaving(false); return; }
    const scope = scopeFor(form.origin_country, form.destination_country, form.origin_city, form.destination_city);
    const { error } = await supabase.from("transport_orders").insert({
      tenant_id: profile.tenant_id, customer_id: form.customer_id,
      order_number: form.order_number, transport_type: form.transport_type,
      origin: form.origin, destination: form.destination,
      origin_country: form.origin_country, origin_city: form.origin_city,
      destination_country: form.destination_country, destination_city: form.destination_city,
      scope,
      pickup_date: form.pickup_date || null, delivery_date: form.delivery_date || null,
      price: form.price ? Number(form.price) : null, currency: form.currency,
      status: form.status,
      goods_description: form.goods_description || null,
      weight_tons: form.weight_tons ? Number(form.weight_tons) : null,
    });
    setSaving(false);
    if (error) return toast.error(error.message);
    toast.success("تم إنشاء أمر النقل");
    setOpen(false); setForm(emptyForm); load();
  };

  const setStatus = async (id: string, status: Status, msg: string) => {
    const { error } = await supabase.from("transport_orders").update({ status }).eq("id", id);
    if (error) toast.error(error.message); else { toast.success(msg); load(); }
  };

  const onApprove = (o: Order) => setStatus(o.id, "confirmed", "تم اعتماد الطلب");
  const onReject = (o: Order) => {
    if (!confirm(`رفض الطلب ${o.order_number}؟`)) return;
    setStatus(o.id, "cancelled", "تم رفض الطلب");
  };

  const onConvert = async (o: Order) => {
    if (!confirm(`تحويل الأمر ${o.order_number} إلى شحنة؟`)) return;
    const shipNumber = `SHP-${o.order_number}`;
    const { error: e1 } = await supabase.from("shipments").insert({
      tenant_id: o.tenant_id, order_id: o.id, shipment_number: shipNumber,
      origin: o.origin, destination: o.destination, status: "planned",
    });
    if (e1) return toast.error(e1.message);
    await supabase.from("transport_orders").update({ status: "assigned" }).eq("id", o.id);
    toast.success(`تم إنشاء الشحنة ${shipNumber}`);
    load();
  };

  const onDelete = async (id: string) => {
    if (!confirm("حذف هذا الأمر؟")) return;
    const { error } = await supabase.from("transport_orders").delete().eq("id", id);
    if (error) toast.error(error.message); else { toast.success("تم الحذف"); load(); }
  };

  const onPrint = (o: Order) => {
    printHTML(`أمر نقل ${o.order_number}`, `
      <h1>أمر نقل رقم ${esc(o.order_number)}</h1>
      <h2>${esc(TYPE_LABEL[o.transport_type])} — ${esc(o.customers?.name)}</h2>
      <dl class="kv">
        <dt>العميل</dt><dd>${esc(o.customers?.name)}</dd>
        <dt>نوع النقل</dt><dd>${esc(TYPE_LABEL[o.transport_type])}</dd>
        <dt>نقطة التحميل</dt><dd>${esc(o.origin)}</dd>
        <dt>نقطة التسليم</dt><dd>${esc(o.destination)}</dd>
        <dt>تاريخ التحميل</dt><dd dir="ltr">${esc(o.pickup_date)}</dd>
        <dt>تاريخ التسليم</dt><dd dir="ltr">${esc(o.delivery_date)}</dd>
        <dt>وصف البضاعة</dt><dd>${esc(o.goods_description)}</dd>
        <dt>الوزن</dt><dd>${o.weight_tons ? `${o.weight_tons} طن` : "—"}</dd>
        <dt>السعر</dt><dd>${o.price ? `${Number(o.price).toLocaleString()} ${esc(o.currency)}` : "—"}</dd>
        <dt>الحالة</dt><dd>${esc(STATUS_LABEL[o.status])}</dd>
      </dl>`);
  };




  const filtered = rows.filter((r) => {
    if (statusFilter !== "all" && r.status !== statusFilter) return false;
    if (!q) return true;
    return (r.order_number + " " + r.origin + " " + r.destination + " " + (r.customers?.name ?? "")).toLowerCase().includes(q.toLowerCase());
  });

  return (
    <>
      <PageHeader title="أوامر النقل (TMS)" subtitle="طلب → اعتماد → تحويل إلى شحنة"
        action={
          <div className="flex flex-wrap gap-2">
            <ExportBar
              filename="orders"
              title="أوامر النقل"
              rows={filtered}
              columns={[
                { key: "order_number", label: "الرقم" },
                { key: "customer", label: "العميل", format: (r) => r.customers?.name ?? "" },
                { key: "type", label: "النوع", format: (r) => TYPE_LABEL[r.transport_type] },
                { key: "origin", label: "من" },
                { key: "destination", label: "إلى" },
                { key: "pickup_date", label: "تحميل" },
                { key: "delivery_date", label: "تسليم" },
                { key: "price", label: "السعر" },
                { key: "status", label: "الحالة", format: (r) => STATUS_LABEL[r.status] },
              ]}
            />
            <Button onClick={() => setOpen(true)} className="gap-2 bg-accent text-accent-foreground hover:bg-accent/90">
              <Plus className="h-4 w-4" /> أمر جديد
            </Button>
          </div>
        }
      />

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent dir="rtl" className="max-w-2xl">
          <DialogHeader><DialogTitle>إنشاء أمر نقل</DialogTitle></DialogHeader>
          {customers.length === 0 ? (
            <p className="text-sm text-muted-foreground">أضف عميلاً أولاً من CRM.</p>
          ) : (
            <form onSubmit={onCreate} className="space-y-4">
              <div className="grid grid-cols-2 gap-3">
                <div><Label>رقم الأمر *</Label>
                  <Input required dir="ltr" value={form.order_number} onChange={(e) => setForm({ ...form, order_number: e.target.value })} /></div>
                <div><Label>العميل *</Label>
                  <Select value={form.customer_id} onValueChange={(v) => setForm({ ...form, customer_id: v })}>
                    <SelectTrigger><SelectValue placeholder="اختر" /></SelectTrigger>
                    <SelectContent>{customers.map((c) => <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>)}</SelectContent>
                  </Select></div>
              </div>
              <div><Label>نوع النقل</Label>
                <Select value={form.transport_type} onValueChange={(v) => setForm({ ...form, transport_type: v as TType })}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>{Object.entries(TYPE_LABEL).map(([k, l]) => <SelectItem key={k} value={k}>{l}</SelectItem>)}</SelectContent>
                </Select></div>
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
                <div><Label>تاريخ التحميل</Label>
                  <Input type="date" value={form.pickup_date} onChange={(e) => setForm({ ...form, pickup_date: e.target.value })} /></div>
                <div><Label>تاريخ التسليم</Label>
                  <Input type="date" value={form.delivery_date} onChange={(e) => setForm({ ...form, delivery_date: e.target.value })} /></div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div><Label>وصف البضاعة</Label>
                  <Input value={form.goods_description} onChange={(e) => setForm({ ...form, goods_description: e.target.value })} /></div>
                <div><Label>الوزن (طن)</Label>
                  <Input type="number" step="0.01" value={form.weight_tons} onChange={(e) => setForm({ ...form, weight_tons: e.target.value })} /></div>
              </div>
              <div className="grid grid-cols-3 gap-3">
                <div className="col-span-2"><Label>السعر</Label>
                  <Input type="number" step="0.01" value={form.price} onChange={(e) => setForm({ ...form, price: e.target.value })} /></div>
                <div><Label>العملة</Label>
                  <Input value={form.currency} onChange={(e) => setForm({ ...form, currency: e.target.value })} /></div>
              </div>
              <DialogFooter>
                <Button type="submit" disabled={saving} className="gap-2 bg-accent text-accent-foreground hover:bg-accent/90">
                  {saving && <Loader2 className="h-4 w-4 animate-spin" />} حفظ
                </Button>
              </DialogFooter>
            </form>
          )}
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
        <EmptyState icon={ClipboardList} title="لا توجد أوامر نقل" description="أنشئ أول أمر لبدء العمليات." />
      ) : (
        <div className="rounded-2xl border border-border bg-card overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-secondary/50 text-xs uppercase text-muted-foreground">
              <tr>
                <th className="p-4 text-right font-semibold">رقم</th>
                <th className="p-4 text-right font-semibold">العميل</th>
                <th className="p-4 text-right font-semibold">النوع</th>
                <th className="p-4 text-right font-semibold">من</th>
                <th className="p-4 text-right font-semibold">إلى</th>
                <th className="p-4 text-right font-semibold">السعر</th>
                <th className="p-4 text-right font-semibold">الحالة</th>
                <th className="p-4 text-right font-semibold">إجراءات</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((o) => (
                <tr key={o.id} className="border-t border-border hover:bg-secondary/30">
                  <td className="p-4 font-mono font-semibold text-primary" dir="ltr">{o.order_number}</td>
                  <td className="p-4">{o.customers?.name ?? "—"}</td>
                  <td className="p-4 text-xs">
                    <div>{TYPE_LABEL[o.transport_type]}</div>
                    {o.scope && (
                      <span className={`mt-1 inline-flex rounded-full px-2 py-0.5 text-[10px] font-bold ${
                        o.scope === "international" ? "bg-warning/20 text-warning-foreground" :
                        o.scope === "national" ? "bg-success/15 text-success" :
                        "bg-chart-3/15 text-chart-3"
                      }`}>{SCOPE_LABELS[o.scope]}</span>
                    )}
                  </td>
                  <td className="p-4">{o.origin}</td>
                  <td className="p-4">{o.destination}</td>
                  <td className="p-4 font-semibold">{o.price ? `${Number(o.price).toLocaleString()} ${o.currency}` : "—"}</td>
                  <td className="p-4">
                    <span className={`inline-flex rounded-md px-2 py-1 text-xs font-semibold ${STATUS_COLOR[o.status]}`}>
                      {STATUS_LABEL[o.status]}
                    </span>
                  </td>
                  <td className="p-4">
                    <div className="flex flex-wrap gap-1">
                      {o.status === "pending" && (
                        <>
                          <Button variant="ghost" size="sm" onClick={() => onApprove(o)} title="اعتماد" className="text-success"><Check className="h-4 w-4" /></Button>
                          <Button variant="ghost" size="sm" onClick={() => onReject(o)} title="رفض" className="text-destructive"><X className="h-4 w-4" /></Button>
                        </>
                      )}
                      {(o.status === "confirmed" || o.status === "pending") && (
                        <Button variant="ghost" size="sm" onClick={() => onConvert(o)} title="تحويل لشحنة" className="text-accent"><Truck className="h-4 w-4" /></Button>
                      )}
                      <Button variant="ghost" size="sm" onClick={() => onPrint(o)} title="طباعة"><Printer className="h-4 w-4" /></Button>
                      <Button variant="ghost" size="sm" onClick={() => onDelete(o.id)} title="حذف"
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
