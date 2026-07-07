import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { PageHeader } from "@/components/dashboard-layout";
import { Truck, Package, ClipboardList, Users, FileText, UserCog, TrendingUp, Loader2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";

export const Route = createFileRoute("/app/")({ component: DashboardHome });

type Stats = {
  customers: number;
  contracts: number;
  vehicles: number;
  drivers: number;
  orders: number;
  shipments: number;
  revenue: number;
};

function DashboardHome() {
  const [stats, setStats] = useState<Stats | null>(null);

  useEffect(() => {
    (async () => {
      const opts = { count: "exact" as const, head: true };
      const [c, ct, v, d, o, sh, rev] = await Promise.all([
        supabase.from("customers").select("*", opts),
        supabase.from("contracts").select("*", opts),
        supabase.from("vehicles").select("*", opts),
        supabase.from("drivers").select("*", opts),
        supabase.from("transport_orders").select("*", opts),
        supabase.from("shipments").select("*", opts),
        supabase.from("transport_orders").select("price").eq("status", "delivered"),
      ]);
      setStats({
        customers: c.count ?? 0,
        contracts: ct.count ?? 0,
        vehicles: v.count ?? 0,
        drivers: d.count ?? 0,
        orders: o.count ?? 0,
        shipments: sh.count ?? 0,
        revenue: (rev.data ?? []).reduce((s, r) => s + Number(r.price ?? 0), 0),
      });
    })();
  }, []);

  const KPIS = stats
    ? [
        { label: "العملاء", value: String(stats.customers), icon: Users, color: "text-success" },
        { label: "العقود", value: String(stats.contracts), icon: FileText, color: "text-primary" },
        { label: "المركبات", value: String(stats.vehicles), icon: Truck, color: "text-primary" },
        { label: "السائقون", value: String(stats.drivers), icon: UserCog, color: "text-accent" },
        { label: "أوامر النقل", value: String(stats.orders), icon: ClipboardList, color: "text-chart-3" },
        { label: "الشحنات", value: String(stats.shipments), icon: Package, color: "text-accent" },
      ]
    : [];

  return (
    <>
      <PageHeader
        title="مرحباً بك في SAIFO TRANSPORT ERP"
        subtitle="نظرة عامة حية على عمليات شركتك"
      />

      {!stats ? (
        <div className="flex items-center justify-center py-24">
          <Loader2 className="h-8 w-8 animate-spin text-accent" />
        </div>
      ) : (
        <>
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6">
            {KPIS.map((k) => (
              <div key={k.label} className="rounded-2xl border border-border bg-card p-5 transition hover:shadow-elegant">
                <div className={`flex h-10 w-10 items-center justify-center rounded-xl bg-secondary ${k.color}`}>
                  <k.icon className="h-5 w-5" />
                </div>
                <div className="mt-4 text-3xl font-black text-foreground">{k.value}</div>
                <div className="mt-1 text-xs text-muted-foreground">{k.label}</div>
              </div>
            ))}
          </div>

          <div className="mt-6 rounded-2xl border border-border bg-card p-6">
            <div className="flex items-center gap-3">
              <div className="flex h-12 w-12 items-center justify-center rounded-xl gradient-accent text-white">
                <TrendingUp className="h-6 w-6" />
              </div>
              <div>
                <div className="text-sm text-muted-foreground">إجمالي الإيرادات (أوامر مُسلَّمة)</div>
                <div className="text-3xl font-black text-primary">
                  {stats.revenue.toLocaleString()} <span className="text-lg">MAD</span>
                </div>
              </div>
            </div>
          </div>
        </>
      )}
    </>
  );
}
