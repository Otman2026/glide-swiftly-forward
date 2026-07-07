import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { PageHeader } from "@/components/dashboard-layout";
import { BarChart3, Truck, Users, Fuel, TrendingUp, Loader2, Package, AlertTriangle, Wrench } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";

export const Route = createFileRoute("/app/kpi")({
  component: KpiPage,
});

type Stats = {
  vehicles: number;
  vehiclesInUse: number;
  drivers: number;
  customers: number;
  orders: number;
  ordersDelivered: number;
  revenue: number;
  expenses: number;
  fuelLiters: number;
  fuelCost: number;
  maintenanceCost: number;
  incidents: number;
  incidentsCost: number;
};

function KpiPage() {
  const [s, setS] = useState<Stats | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      const [v, vu, d, c, o, od, rev, exp, fuel, maint, inc] = await Promise.all([
        supabase.from("vehicles").select("id", { count: "exact", head: true }),
        supabase.from("vehicles").select("id", { count: "exact", head: true }).eq("status", "in_use"),
        supabase.from("drivers").select("id", { count: "exact", head: true }),
        supabase.from("customers").select("id", { count: "exact", head: true }),
        supabase.from("transport_orders").select("id", { count: "exact", head: true }),
        supabase.from("transport_orders").select("total_amount").eq("status", "delivered"),
        supabase.from("transport_orders").select("total_amount").eq("status", "delivered"),
        supabase.from("expenses").select("amount"),
        supabase.from("fuel_logs").select("liters,cost"),
        supabase.from("maintenance_records").select("cost"),
        supabase.from("incidents").select("repair_cost"),
      ]);
      const sum = (arr: any[] | null, k: string) => (arr ?? []).reduce((a, b) => a + Number(b[k] ?? 0), 0);
      setS({
        vehicles: v.count ?? 0,
        vehiclesInUse: vu.count ?? 0,
        drivers: d.count ?? 0,
        customers: c.count ?? 0,
        orders: o.count ?? 0,
        ordersDelivered: (od.data ?? []).length,
        revenue: sum(rev.data, "total_amount"),
        expenses: sum(exp.data, "amount"),
        fuelLiters: sum(fuel.data, "liters"),
        fuelCost: sum(fuel.data, "cost"),
        maintenanceCost: sum(maint.data, "cost"),
        incidents: (inc.data ?? []).length,
        incidentsCost: sum(inc.data, "repair_cost"),
      });
      setLoading(false);
    })();
  }, []);

  if (loading || !s) {
    return (
      <>
        <PageHeader title="مؤشرات الأداء (KPIs)" subtitle="نظرة عامة مباشرة على أداء شركتك" />
        <div className="flex justify-center py-16"><Loader2 className="h-6 w-6 animate-spin text-accent" /></div>
      </>
    );
  }

  const net = s.revenue - s.expenses - s.fuelCost - s.maintenanceCost - s.incidentsCost;
  const utilization = s.vehicles > 0 ? (s.vehiclesInUse / s.vehicles) * 100 : 0;
  const revenuePerVehicle = s.vehicles > 0 ? s.revenue / s.vehicles : 0;

  const cards = [
    { label: "الشاحنات", value: s.vehicles, sub: `${s.vehiclesInUse} في الخدمة`, icon: Truck, tint: "text-accent" },
    { label: "السائقون", value: s.drivers, sub: "نشط", icon: Users, tint: "text-primary" },
    { label: "العملاء", value: s.customers, sub: "في CRM", icon: Users, tint: "text-success" },
    { label: "الطلبات", value: s.orders, sub: `${s.ordersDelivered} مسلّم`, icon: Package, tint: "text-accent" },
    { label: "استهلاك الوقود", value: `${s.fuelLiters.toFixed(0)}L`, sub: `${s.fuelCost.toFixed(0)} MAD`, icon: Fuel, tint: "text-warning-foreground" },
    { label: "الحوادث", value: s.incidents, sub: `${s.incidentsCost.toFixed(0)} MAD`, icon: AlertTriangle, tint: "text-destructive" },
    { label: "الصيانة", value: `${s.maintenanceCost.toFixed(0)}`, sub: "MAD", icon: Wrench, tint: "text-warning-foreground" },
    { label: "معدل استغلال الأسطول", value: `${utilization.toFixed(0)}%`, sub: "", icon: BarChart3, tint: "text-primary" },
  ];

  return (
    <>
      <PageHeader title="مؤشرات الأداء (KPIs)" subtitle="نظرة عامة مباشرة على أداء شركتك من قاعدة البيانات" />

      <div className="mb-6 grid gap-4 md:grid-cols-3">
        <div className="rounded-2xl border border-border bg-card p-6">
          <div className="text-xs text-muted-foreground">إجمالي الإيرادات</div>
          <div className="mt-2 text-3xl font-black text-success">{(s.revenue / 1000).toFixed(1)}K MAD</div>
          <div className="mt-2 flex items-center gap-1 text-xs font-semibold text-success"><TrendingUp className="h-3 w-3" /> من الطلبات المسلّمة</div>
        </div>
        <div className="rounded-2xl border border-border bg-card p-6">
          <div className="text-xs text-muted-foreground">إجمالي التكاليف</div>
          <div className="mt-2 text-3xl font-black text-destructive">{((s.expenses + s.fuelCost + s.maintenanceCost + s.incidentsCost) / 1000).toFixed(1)}K MAD</div>
          <div className="mt-2 text-xs text-muted-foreground">مصاريف + وقود + صيانة + حوادث</div>
        </div>
        <div className="rounded-2xl border border-border bg-card p-6">
          <div className="text-xs text-muted-foreground">صافي الربح</div>
          <div className={`mt-2 text-3xl font-black ${net >= 0 ? "text-primary" : "text-destructive"}`}>{(net / 1000).toFixed(1)}K MAD</div>
          <div className="mt-2 text-xs text-muted-foreground">إيراد/شاحنة: {revenuePerVehicle.toFixed(0)} MAD</div>
        </div>
      </div>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        {cards.map((c) => (
          <div key={c.label} className="rounded-2xl border border-border bg-card p-5">
            <div className="mb-3 flex items-center justify-between">
              <c.icon className={`h-5 w-5 ${c.tint}`} />
              <span className="text-xs text-muted-foreground">{c.sub}</span>
            </div>
            <div className="text-2xl font-black">{c.value}</div>
            <div className="mt-1 text-xs text-muted-foreground">{c.label}</div>
          </div>
        ))}
      </div>
    </>
  );
}
