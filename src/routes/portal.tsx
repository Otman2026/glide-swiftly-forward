import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import {
  Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle, DialogTrigger,
} from "@/components/ui/dialog";
import { toast } from "sonner";
import { Package, FileText, Truck, Plus, LogOut, Loader2, Home } from "lucide-react";

export const Route = createFileRoute("/portal")({
  component: PortalPage,
});

type Order = { id: string; order_number: string; origin: string; destination: string; status: string; pickup_date: string | null; delivery_date: string | null; price: number | null };
type Shipment = { id: string; shipment_number: string; origin: string; destination: string; status: string; loaded_at: string | null; delivered_at: string | null };
type Invoice = { id: string; invoice_number: string; issue_date: string; total: number; paid_amount: number; status: string };

function PortalPage() {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [profile, setProfile] = useState<{ id: string; full_name: string | null; customer_id: string | null; tenant_id: string | null } | null>(null);
  const [customer, setCustomer] = useState<{ id: string; name: string } | null>(null);
  const [orders, setOrders] = useState<Order[]>([]);
  const [shipments, setShipments] = useState<Shipment[]>([]);
  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [tab, setTab] = useState<"orders" | "shipments" | "invoices">("orders");
  const [open, setOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({ origin: "", destination: "", goods_description: "", weight_tons: "", pickup_date: "", notes: "" });

  useEffect(() => {
    (async () => {
      const { data: u } = await supabase.auth.getUser();
      if (!u.user) {
        navigate({ to: "/auth" });
        return;
      }
      const { data: p } = await supabase
        .from("profiles")
        .select("id, full_name, customer_id, tenant_id")
        .eq("id", u.user.id)
        .maybeSingle();
      if (!p?.customer_id) {
        setLoading(false);
        setProfile(p as typeof profile extends null ? never : { id: string; full_name: string | null; customer_id: string | null; tenant_id: string | null });
        return;
      }
      setProfile(p);
      const [{ data: c }, { data: os }, { data: ss }, { data: is }] = await Promise.all([
        supabase.from("customers").select("id, name").eq("id", p.customer_id).maybeSingle(),
        supabase.from("transport_orders").select("id, order_number, origin, destination, status, pickup_date, delivery_date, price").order("created_at", { ascending: false }),
        supabase.from("shipments").select("id, shipment_number, origin, destination, status, loaded_at, delivered_at").order("created_at", { ascending: false }),
        supabase.from("invoices").select("id, invoice_number, issue_date, total, paid_amount, status").order("issue_date", { ascending: false }),
      ]);
      setCustomer(c as { id: string; name: string } | null);
      setOrders((os ?? []) as Order[]);
      setShipments((ss ?? []) as Shipment[]);
      setInvoices((is ?? []) as Invoice[]);
      setLoading(false);
    })();
  }, [navigate]);

  async function requestOrder() {
    if (!profile?.customer_id || !profile.tenant_id) return;
    if (!form.origin.trim() || !form.destination.trim()) return toast.error("املأ نقطتَي الانطلاق والوصول");
    setSaving(true);
    const { error } = await supabase.from("transport_orders").insert({
      tenant_id: profile.tenant_id,
      customer_id: profile.customer_id,
      order_number: `REQ-${Date.now().toString().slice(-6)}`,
      origin: form.origin,
      destination: form.destination,
      goods_description: form.goods_description || null,
      weight_tons: form.weight_tons ? Number(form.weight_tons) : null,
      pickup_date: form.pickup_date || null,
      status: "pending",
      notes: form.notes || null,
    });
    setSaving(false);
    if (error) return toast.error(error.message);
    toast.success("تم إرسال الطلب");
    setOpen(false);
    setForm({ origin: "", destination: "", goods_description: "", weight_tons: "", pickup_date: "", notes: "" });
    const { data: os } = await supabase.from("transport_orders").select("id, order_number, origin, destination, status, pickup_date, delivery_date, price").order("created_at", { ascending: false });
    setOrders((os ?? []) as Order[]);
  }

  async function signOut() {
    await supabase.auth.signOut();
    navigate({ to: "/auth" });
  }

  if (loading) {
    return <div className="min-h-screen flex items-center justify-center"><Loader2 className="h-8 w-8 animate-spin text-primary" /></div>;
  }

  if (!profile?.customer_id) {
    return (
      <div className="min-h-screen flex items-center justify-center p-6" dir="rtl">
        <div className="max-w-md text-center space-y-4">
          <Package className="h-12 w-12 mx-auto text-muted-foreground" />
          <h1 className="text-2xl font-bold">حسابك غير مرتبط بأي عميل</h1>
          <p className="text-muted-foreground">يجب على مسؤول شركة النقل ربط حسابك بملف العميل الخاص بك.</p>
          <div className="flex gap-2 justify-center">
            <Button asChild variant="outline"><Link to="/app"><Home className="ms-2 h-4 w-4" />الرئيسية</Link></Button>
            <Button variant="outline" onClick={signOut}><LogOut className="ms-2 h-4 w-4" />خروج</Button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-secondary/30" dir="rtl">
      <header className="bg-primary text-primary-foreground p-4 flex justify-between items-center">
        <div>
          <h1 className="text-xl font-bold">بوابة العميل</h1>
          <p className="text-sm opacity-90">{customer?.name}</p>
        </div>
        <div className="flex gap-2">
          <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger asChild>
              <Button variant="secondary" size="sm"><Plus className="ms-2 h-4 w-4" />طلب نقل جديد</Button>
            </DialogTrigger>
            <DialogContent dir="rtl">
              <DialogHeader><DialogTitle>طلب نقل جديد</DialogTitle></DialogHeader>
              <div className="grid gap-3">
                <div><Label>من</Label><Input value={form.origin} onChange={(e) => setForm({ ...form, origin: e.target.value })} /></div>
                <div><Label>إلى</Label><Input value={form.destination} onChange={(e) => setForm({ ...form, destination: e.target.value })} /></div>
                <div><Label>وصف البضاعة</Label><Input value={form.goods_description} onChange={(e) => setForm({ ...form, goods_description: e.target.value })} /></div>
                <div className="grid grid-cols-2 gap-3">
                  <div><Label>الوزن (طن)</Label><Input type="number" step="0.1" value={form.weight_tons} onChange={(e) => setForm({ ...form, weight_tons: e.target.value })} /></div>
                  <div><Label>تاريخ التحميل</Label><Input type="date" value={form.pickup_date} onChange={(e) => setForm({ ...form, pickup_date: e.target.value })} /></div>
                </div>
                <div><Label>ملاحظات</Label><Textarea value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })} rows={2} /></div>
              </div>
              <DialogFooter>
                <Button variant="outline" onClick={() => setOpen(false)}>إلغاء</Button>
                <Button onClick={requestOrder} disabled={saving}>{saving && <Loader2 className="ms-2 h-4 w-4 animate-spin" />}إرسال</Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
          <Button variant="ghost" size="sm" onClick={signOut}><LogOut className="h-4 w-4" /></Button>
        </div>
      </header>

      <div className="p-4 max-w-6xl mx-auto">
        <div className="flex gap-2 mb-4 border-b">
          {([["orders", "أوامري", ClipCount(orders.length)], ["shipments", "شحناتي", ClipCount(shipments.length)], ["invoices", "فواتيري", ClipCount(invoices.length)]] as const).map(([k, l, c]) => (
            <button key={k} onClick={() => setTab(k)} className={`px-4 py-2 border-b-2 -mb-px transition-colors ${tab === k ? "border-primary text-primary font-semibold" : "border-transparent text-muted-foreground"}`}>
              {l} {c}
            </button>
          ))}
        </div>

        {tab === "orders" && (
          <TableCard cols={["رقم", "من", "إلى", "التحميل", "التسليم", "السعر", "الحالة"]}
            empty={{ icon: Package, text: "لا توجد أوامر نقل" }}
            rows={orders.map((o) => [o.order_number, o.origin, o.destination, o.pickup_date ?? "—", o.delivery_date ?? "—", o.price ? Number(o.price).toFixed(2) : "—", <Badge variant="outline">{o.status}</Badge>])} />
        )}
        {tab === "shipments" && (
          <TableCard cols={["رقم", "من", "إلى", "التحميل", "التسليم", "الحالة"]}
            empty={{ icon: Truck, text: "لا توجد شحنات" }}
            rows={shipments.map((s) => [s.shipment_number, s.origin, s.destination, s.loaded_at ?? "—", s.delivered_at ?? "—", <Badge variant="outline">{s.status}</Badge>])} />
        )}
        {tab === "invoices" && (
          <TableCard cols={["رقم", "التاريخ", "الإجمالي", "المدفوع", "الحالة"]}
            empty={{ icon: FileText, text: "لا توجد فواتير" }}
            rows={invoices.map((i) => [i.invoice_number, i.issue_date, Number(i.total).toFixed(2), Number(i.paid_amount).toFixed(2), <Badge variant={i.status === "paid" ? "default" : "outline"}>{i.status}</Badge>])} />
        )}
      </div>
    </div>
  );
}

function ClipCount(n: number) { return <span className="ms-1 text-xs text-muted-foreground">({n})</span>; }

function TableCard({ cols, rows, empty }: { cols: string[]; rows: React.ReactNode[][]; empty: { icon: React.ComponentType<{ className?: string }>; text: string } }) {
  const Icon = empty.icon;
  if (rows.length === 0) return (
    <div className="rounded-lg border bg-card p-12 text-center">
      <Icon className="h-10 w-10 mx-auto text-muted-foreground mb-2" />
      <p className="text-muted-foreground">{empty.text}</p>
    </div>
  );
  return (
    <div className="rounded-lg border bg-card overflow-x-auto">
      <table className="w-full text-sm">
        <thead className="bg-secondary/50"><tr>{cols.map((c) => <th key={c} className="p-3 text-right">{c}</th>)}</tr></thead>
        <tbody>{rows.map((r, i) => <tr key={i} className="border-t">{r.map((cell, j) => <td key={j} className="p-3">{cell}</td>)}</tr>)}</tbody>
      </table>
    </div>
  );
}
