import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { PageHeader, EmptyState } from "@/components/dashboard-layout";
import { ClipboardList, Plus, Search, Trash2, Loader2 } from "lucide-react";
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

export const Route = createFileRoute("/app/orders")({ component: OrdersPage });

type Order = {
  id: string;
  order_number: string;
  transport_type: "national" | "international" | "own_account" | "third_party";
  origin: string;
  destination: string;
  pickup_date: string | null;
  delivery_date: string | null;
  price: number | null;
  currency: string | null;
  status: "pending" | "confirmed" | "assigned" | "in_transit" | "delivered" | "cancelled";
  customer_id: string;
  customers?: { name: string } | null;
};

const TYPE_LABEL = {
  national: "وطني", international: "دولي", own_account: "حساب خاص", third_party: "حساب الغير",
} as const;

const STATUS_LABEL: Record<Order["status"], string> = {
  pending: "قيد الانتظار", confirmed: "مؤكد", assigned: "معيَّن",
  in_transit: "في الطريق", delivered: "مُسلَّم", cancelled: "ملغى",
};
const STATUS_COLOR: Record<Order["status"], string> = {
  pending: "bg-muted text-muted-foreground",
  confirmed: "bg-primary/10 text-primary",
  assigned: "bg-accent/10 text-accent",
  in_transit: "bg-warning/10 text-warning-foreground",
  delivered: "bg-success/10 text-success",
  cancelled: "bg-destructive/10 text-destructive",
};

function OrdersPage() {
  const [rows, setRows] = useState<Order[]>([]);
  const [customers, setCustomers] = useState<{ id: string; name: string }[]>([]);
  const [loading, setLoading] = useState(true);
  const [q, setQ] = useState("");
  const [open, setOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({
    order_number: "", customer_id: "", transport_type: "national",
    origin: "", destination: "", pickup_date: "", delivery_date: "",
    price: "", currency: "MAD", status: "pending",
  });

  const load = async () => {
    setLoading(true);
    const [{ data, error }, { data: cust }] = await Promise.all([
      supabase.from("transport_orders")
        .select("id,order_number,transport_type,origin,destination,pickup_date,delivery_date,price,currency,status,customer_id,customers(name)")
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
    if (!profile?.tenant_id) { toast.error("لا توجد شركة مرتبطة بحسابك"); setSaving(false); return; }
    const { error } = await supabase.from("transport_orders").insert({
      tenant_id: profile.tenant_id,
      customer_id: form.customer_id,
      order_number: form.order_number,
      transport_type: form.transport_type as Order["transport_type"],
      origin: form.origin,
      destination: form.destination,
      pickup_date: form.pickup_date || null,
      delivery_date: form.delivery_date || null,
      price: form.price ? Number(form.price) : null,
      currency: form.currency,
      status: form.status as Order["status"],
    });
    setSaving(false);
    if (error) return toast.error(error.message);
    toast.success("تم إنشاء أمر النقل");
    setOpen(false);
    setForm({ order_number: "", customer_id: "", transport_type: "national", origin: "", destination: "", pickup_date: "", delivery_date: "", price: "", currency: "MAD", status: "pending" });
    load();
  };

  const onDelete = async (id: string) => {
    if (!confirm("حذف هذا الأمر؟")) return;
    const { error } = await supabase.from("transport_orders").delete().eq("id", id);
    if (error) toast.error(error.message); else { toast.success("تم الحذف"); load(); }
  };

  const filtered = rows.filter((r) => q ? (r.order_number + r.origin + r.destination).toLowerCase().includes(q.toLowerCase()) : true);

  return (
    <>
      <PageHeader
        title="أوامر النقل (TMS)"
        subtitle="نقل وطني، دولي، حساب خاص، وحساب الغير — إدارة موحَّدة"
        action={
          <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger asChild>
              <Button className="gap-2 bg-accent text-accent-foreground hover:bg-accent/90">
                <Plus className="h-4 w-4" /> أمر نقل جديد
              </Button>
            </DialogTrigger>
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
                  <div>
                    <Label>نوع النقل</Label>
                    <Select value={form.transport_type} onValueChange={(v) => setForm({ ...form, transport_type: v })}>
                      <SelectTrigger><SelectValue /></SelectTrigger>
                      <SelectContent>{Object.entries(TYPE_LABEL).map(([k, l]) => <SelectItem key={k} value={k}>{l}</SelectItem>)}</SelectContent>
                    </Select>
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <div><Label>نقطة التحميل *</Label>
                      <Input required value={form.origin} onChange={(e) => setForm({ ...form, origin: e.target.value })} /></div>
                    <div><Label>نقطة التسليم *</Label>
                      <Input required value={form.destination} onChange={(e) => setForm({ ...form, destination: e.target.value })} /></div>
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <div><Label>تاريخ التحميل</Label>
                      <Input type="date" value={form.pickup_date} onChange={(e) => setForm({ ...form, pickup_date: e.target.value })} /></div>
                    <div><Label>تاريخ التسليم</Label>
                      <Input type="date" value={form.delivery_date} onChange={(e) => setForm({ ...form, delivery_date: e.target.value })} /></div>
                  </div>
                  <div className="grid grid-cols-3 gap-3">
                    <div className="col-span-2"><Label>السعر</Label>
                      <Input type="number" step="0.01" value={form.price} onChange={(e) => setForm({ ...form, price: e.target.value })} /></div>
                    <div><Label>العملة</Label>
                      <Input value={form.currency} onChange={(e) => setForm({ ...form, currency: e.target.value })} /></div>
                  </div>
                  <div>
                    <Label>الحالة</Label>
                    <Select value={form.status} onValueChange={(v) => setForm({ ...form, status: v })}>
                      <SelectTrigger><SelectValue /></SelectTrigger>
                      <SelectContent>{Object.entries(STATUS_LABEL).map(([k, l]) => <SelectItem key={k} value={k}>{l}</SelectItem>)}</SelectContent>
                    </Select>
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
        <EmptyState icon={ClipboardList} title="لا توجد أوامر نقل" description="أنشئ أول أمر نقل لبدء تنفيذ عملياتك." />
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
                <th className="p-4 text-right font-semibold">تسليم</th>
                <th className="p-4 text-right font-semibold">السعر</th>
                <th className="p-4 text-right font-semibold">الحالة</th>
                <th className="p-4 text-right font-semibold"></th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((o) => (
                <tr key={o.id} className="border-t border-border hover:bg-secondary/30">
                  <td className="p-4 font-mono font-semibold text-primary" dir="ltr">{o.order_number}</td>
                  <td className="p-4">{o.customers?.name ?? "—"}</td>
                  <td className="p-4 text-xs">{TYPE_LABEL[o.transport_type]}</td>
                  <td className="p-4">{o.origin}</td>
                  <td className="p-4">{o.destination}</td>
                  <td className="p-4" dir="ltr">{o.delivery_date ?? "—"}</td>
                  <td className="p-4 font-semibold">{o.price ? `${o.price.toLocaleString()} ${o.currency}` : "—"}</td>
                  <td className="p-4">
                    <span className={`inline-flex rounded-md px-2 py-1 text-xs font-semibold ${STATUS_COLOR[o.status]}`}>
                      {STATUS_LABEL[o.status]}
                    </span>
                  </td>
                  <td className="p-4">
                    <Button variant="ghost" size="sm" onClick={() => onDelete(o.id)}
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
