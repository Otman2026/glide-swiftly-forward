import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { PageHeader } from "@/components/dashboard-layout";
import { StatCard } from "@/components/stat-card";
import {
  Truck, Package, ClipboardList, Users, FileText, UserCog,
  Loader2, Route as RouteIcon, Warehouse,
  Wallet, Receipt, Bell, AlertTriangle, TrendingUp, TrendingDown,
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";

export const Route = createFileRoute("/app/")({ component: DashboardHome });

type Stats = {
  customers: number; contracts: number; vehicles: number; drivers: number;
  orders: number; shipments: number; trips: number; warehouses: number;
  revenue: number; expenses: number; unpaidInvoices: number;
};
type Notif = { id: string; title: string; message: string | null; severity: string; created_at: string; link: string | null };

function DashboardHome() {
  const [stats, setStats] = useState<Stats | null>(null);
  const [notifs, setNotifs] = useState<Notif[]>([]);

  useEffect(() => {
    (async () => {
      const opts = { count: "exact" as const, head: true };
      const [c, ct, v, d, o, sh, tr, wh, invPaid, expAll, invUnpaid, notif] = await Promise.all([
        supabase.from("customers").select("*", opts),
        supabase.from("contracts").select("*", opts),
        supabase.from("vehicles").select("*", opts),
        supabase.from("drivers").select("*", opts),
        supabase.from("transport_orders").select("*", opts),
        supabase.from("shipments").select("*", opts),
        supabase.from("trips").select("*", opts),
        supabase.from("warehouses").select("*", opts),
        supabase.from("invoices").select("total,paid_amount").in("status", ["paid", "partial", "sent"]),
        supabase.from("expenses").select("amount"),
        supabase.from("invoices").select("*", { count: "exact", head: true }).in("status", ["sent", "overdue", "partial"]),
        supabase.from("notifications").select("id,title,message,severity,created_at,link").order("created_at", { ascending: false }).limit(5),
      ]);
      const revenue = (invPaid.data ?? []).reduce((s, r) => s + Number(r.paid_amount ?? 0), 0);
      const expenses = (expAll.data ?? []).reduce((s, r) => s + Number(r.amount ?? 0), 0);
      setStats({
        customers: c.count ?? 0, contracts: ct.count ?? 0, vehicles: v.count ?? 0, drivers: d.count ?? 0,
        orders: o.count ?? 0, shipments: sh.count ?? 0, trips: tr.count ?? 0, warehouses: wh.count ?? 0,
        revenue, expenses, unpaidInvoices: invUnpaid.count ?? 0,
      });
      setNotifs(notif.data ?? []);
    })();
  }, []);

  const profit = stats ? stats.revenue - stats.expenses : 0;

  return (
    <>
      <PageHeader title="مرحباً بك في SAIFO TRANSPORT ERP" subtitle="نظرة عامة حية على عمليات شركتك" />
      {!stats ? (
        <div className="flex items-center justify-center py-24"><Loader2 className="h-8 w-8 animate-spin text-accent" /></div>
      ) : (
        <>
          <div className="mb-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <StatCard label="الإيرادات المحصلة" value={stats.revenue} suffix="MAD" icon={Wallet} tone="success" to="/app/invoices" hint="من الفواتير المسددة" />
            <StatCard label="المصروفات" value={stats.expenses} suffix="MAD" icon={Receipt} tone="danger" to="/app/finance" hint="إجمالي المدفوعات" />
            <StatCard label="صافي الأرباح" value={profit} suffix="MAD" icon={profit >= 0 ? TrendingUp : TrendingDown} tone={profit >= 0 ? "brand" : "danger"} hint={profit >= 0 ? "ربحية إيجابية" : "خسارة تشغيلية"} />
            <StatCard label="فواتير غير مدفوعة" value={stats.unpaidInvoices} icon={AlertTriangle} tone="warning" to="/app/invoices" hint="تحتاج متابعة تحصيل" />
          </div>

          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <StatCard label="العملاء" value={stats.customers} icon={Users} tone="success" to="/app/customers" />
            <StatCard label="العقود" value={stats.contracts} icon={FileText} tone="info" to="/app/contracts" />
            <StatCard label="المركبات" value={stats.vehicles} icon={Truck} tone="brand" to="/app/vehicles" />
            <StatCard label="السائقون" value={stats.drivers} icon={UserCog} tone="info" to="/app/drivers" />
            <StatCard label="أوامر النقل" value={stats.orders} icon={ClipboardList} tone="warning" to="/app/orders" />
            <StatCard label="الشحنات" value={stats.shipments} icon={Package} tone="brand" to="/app/shipments" />
            <StatCard label="الرحلات" value={stats.trips} icon={RouteIcon} tone="info" to="/app/trips" />
            <StatCard label="المستودعات" value={stats.warehouses} icon={Warehouse} tone="success" to="/app/warehouses" />
          </div>

          <div className="mt-6 rounded-2xl border border-border bg-card p-6 shadow-sm">
            <div className="mb-4 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-accent/10 text-accent ring-1 ring-accent/20"><Bell className="h-5 w-5" /></div>
                <div>
                  <div className="text-sm font-bold">آخر الإشعارات والتنبيهات</div>
                  <div className="text-xs text-muted-foreground">أهم الأحداث في شركتك</div>
                </div>
              </div>
              <Link to="/app/notifications" className="text-xs font-semibold text-accent hover:underline">عرض الكل ←</Link>
            </div>
            {notifs.length === 0 ? (
              <div className="py-6 text-center text-sm text-muted-foreground">لا توجد إشعارات حالياً</div>
            ) : (
              <ul className="divide-y divide-border">
                {notifs.map((n) => (
                  <li key={n.id} className="flex items-start gap-3 py-3">
                    <div className={`mt-1 h-2 w-2 flex-none rounded-full ${
                      n.severity === "error" ? "bg-destructive" :
                      n.severity === "warning" ? "bg-warning" :
                      n.severity === "success" ? "bg-success" : "bg-primary"
                    }`} />
                    <div className="flex-1 min-w-0">
                      <div className="text-sm font-semibold truncate">{n.title}</div>
                      {n.message && <div className="text-xs text-muted-foreground truncate">{n.message}</div>}
                    </div>
                    <div className="text-xs text-muted-foreground whitespace-nowrap" dir="ltr">
                      {new Date(n.created_at).toLocaleDateString("ar-MA")}
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </>
      )}
    </>
  );
}
