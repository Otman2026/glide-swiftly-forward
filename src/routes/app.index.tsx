import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { PageHeader } from "@/components/dashboard-layout";
import {
  Truck, Package, ClipboardList, Users, FileText, UserCog,
  TrendingUp, TrendingDown, Loader2, Route as RouteIcon, Warehouse,
  Wallet, Receipt, Bell, AlertTriangle,
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

  const KPIS = stats
    ? [
        { label: "العملاء", value: stats.customers, icon: Users, color: "text-success", to: "/app/customers" as const },
        { label: "العقود", value: stats.contracts, icon: FileText, color: "text-primary", to: "/app/contracts" as const },
        { label: "المركبات", value: stats.vehicles, icon: Truck, color: "text-primary", to: "/app/vehicles" as const },
        { label: "السائقون", value: stats.drivers, icon: UserCog, color: "text-accent", to: "/app/drivers" as const },
        { label: "أوامر النقل", value: stats.orders, icon: ClipboardList, color: "text-chart-3", to: "/app/orders" as const },
        { label: "الشحنات", value: stats.shipments, icon: Package, color: "text-accent", to: "/app/shipments" as const },
        { label: "الرحلات", value: stats.trips, icon: RouteIcon, color: "text-primary", to: "/app/trips" as const },
        { label: "المستودعات", value: stats.warehouses, icon: Warehouse, color: "text-success", to: "/app/warehouses" as const },
      ]
    : [];

  const profit = stats ? stats.revenue - stats.expenses : 0;

  return (
    <>
      <PageHeader title="مرحباً بك في SAIFO TRANSPORT ERP" subtitle="نظرة عامة حية على عمليات شركتك" />
      {!stats ? (
        <div className="flex items-center justify-center py-24"><Loader2 className="h-8 w-8 animate-spin text-accent" /></div>
      ) : (
        <>
          {/* Financial KPIs */}
          <div className="mb-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <Link to="/app/invoices" className="rounded-2xl border border-border bg-card p-5 transition hover:shadow-elegant">
              <div className="flex items-center gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-success/10 text-success"><Wallet className="h-5 w-5" /></div>
                <div className="text-xs text-muted-foreground">الإيرادات المحصلة</div>
              </div>
              <div className="mt-3 text-2xl font-black text-success">{stats.revenue.toLocaleString()} <span className="text-sm">MAD</span></div>
            </Link>
            <Link to="/app/finance" className="rounded-2xl border border-border bg-card p-5 transition hover:shadow-elegant">
              <div className="flex items-center gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-destructive/10 text-destructive"><Receipt className="h-5 w-5" /></div>
                <div className="text-xs text-muted-foreground">المصروفات</div>
              </div>
              <div className="mt-3 text-2xl font-black text-destructive">{stats.expenses.toLocaleString()} <span className="text-sm">MAD</span></div>
            </Link>
            <div className="rounded-2xl border border-border bg-card p-5">
              <div className="flex items-center gap-3">
                <div className={`flex h-10 w-10 items-center justify-center rounded-xl ${profit >= 0 ? "bg-primary/10 text-primary" : "bg-destructive/10 text-destructive"}`}>
                  {profit >= 0 ? <TrendingUp className="h-5 w-5" /> : <TrendingDown className="h-5 w-5" />}
                </div>
                <div className="text-xs text-muted-foreground">صافي الأرباح</div>
              </div>
              <div className={`mt-3 text-2xl font-black ${profit >= 0 ? "text-primary" : "text-destructive"}`}>{profit.toLocaleString()} <span className="text-sm">MAD</span></div>
            </div>
            <Link to="/app/invoices" className="rounded-2xl border border-border bg-card p-5 transition hover:shadow-elegant">
              <div className="flex items-center gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-warning/10 text-warning-foreground"><AlertTriangle className="h-5 w-5" /></div>
                <div className="text-xs text-muted-foreground">فواتير غير مدفوعة</div>
              </div>
              <div className="mt-3 text-2xl font-black">{stats.unpaidInvoices}</div>
            </Link>
          </div>

          {/* Operational KPIs */}
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4 xl:grid-cols-4">
            {KPIS.map((k) => (
              <Link key={k.label} to={k.to} className="rounded-2xl border border-border bg-card p-5 transition hover:shadow-elegant hover:-translate-y-0.5">
                <div className={`flex h-10 w-10 items-center justify-center rounded-xl bg-secondary ${k.color}`}>
                  <k.icon className="h-5 w-5" />
                </div>
                <div className="mt-4 text-3xl font-black text-foreground">{k.value}</div>
                <div className="mt-1 text-xs text-muted-foreground">{k.label}</div>
              </Link>
            ))}
          </div>

          {/* Notifications */}
          <div className="mt-6 rounded-2xl border border-border bg-card p-6">
            <div className="mb-4 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-accent/10 text-accent"><Bell className="h-5 w-5" /></div>
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
