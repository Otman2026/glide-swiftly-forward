import { createFileRoute } from "@tanstack/react-router";
import { PageHeader } from "@/components/dashboard-layout";
import {
  Truck,
  Package,
  Route as RouteIcon,
  Users,
  Wallet,
  Fuel,
  TrendingUp,
  TrendingDown,
  CheckCircle2,
  Clock,
  AlertTriangle,
} from "lucide-react";

export const Route = createFileRoute("/app/")({
  component: DashboardHome,
});

const KPIS = [
  { label: "شاحنة نشطة", value: "48", trend: "+3", up: true, icon: Truck, color: "text-primary" },
  { label: "شحنة اليوم", value: "127", trend: "+12%", up: true, icon: Package, color: "text-accent" },
  { label: "رحلة قيد التنفيذ", value: "34", trend: "-2", up: false, icon: RouteIcon, color: "text-chart-3" },
  { label: "عميل نشط", value: "89", trend: "+5", up: true, icon: Users, color: "text-success" },
  { label: "الإيرادات الشهرية", value: "428K", trend: "+18%", up: true, icon: Wallet, color: "text-primary" },
  { label: "استهلاك الوقود", value: "12.4L/100", trend: "-3%", up: true, icon: Fuel, color: "text-accent" },
];

const RECENT_TRIPS = [
  { id: "TR-2841", from: "الدار البيضاء", to: "طنجة", driver: "أحمد بن علي", status: "في الطريق", statusColor: "warning" },
  { id: "TR-2840", from: "الرباط", to: "مراكش", driver: "محمد الأمين", status: "تم التسليم", statusColor: "success" },
  { id: "TR-2839", from: "فاس", to: "أكادير", driver: "يوسف الإدريسي", status: "تم التحميل", statusColor: "primary" },
  { id: "TR-2838", from: "طنجة", to: "الدار البيضاء", driver: "خالد العلوي", status: "في الطريق", statusColor: "warning" },
];

function DashboardHome() {
  return (
    <>
      <PageHeader
        title="مرحباً بك في SAIFO TRANSPORT ERP"
        subtitle="نظرة عامة على عمليات شركتك اليوم"
      />

      {/* KPI Grid */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6">
        {KPIS.map((k) => (
          <div key={k.label} className="rounded-2xl border border-border bg-card p-5 transition hover:shadow-elegant">
            <div className="flex items-start justify-between">
              <div className={`flex h-10 w-10 items-center justify-center rounded-xl bg-secondary ${k.color}`}>
                <k.icon className="h-5 w-5" />
              </div>
              <div className={`flex items-center gap-1 text-xs font-bold ${k.up ? "text-success" : "text-destructive"}`}>
                {k.up ? <TrendingUp className="h-3 w-3" /> : <TrendingDown className="h-3 w-3" />}
                {k.trend}
              </div>
            </div>
            <div className="mt-4 text-2xl font-black text-foreground">{k.value}</div>
            <div className="mt-1 text-xs text-muted-foreground">{k.label}</div>
          </div>
        ))}
      </div>

      {/* Charts placeholder + Recent */}
      <div className="mt-6 grid gap-6 lg:grid-cols-3">
        <div className="rounded-2xl border border-border bg-card p-6 lg:col-span-2">
          <div className="mb-4 flex items-center justify-between">
            <div>
              <h3 className="text-lg font-bold text-foreground">تطور الإيرادات</h3>
              <p className="text-xs text-muted-foreground">آخر 30 يوم</p>
            </div>
            <select className="rounded-lg border border-border bg-secondary/50 px-3 py-1.5 text-sm">
              <option>30 يوم</option>
              <option>90 يوم</option>
              <option>سنة</option>
            </select>
          </div>
          <div className="flex h-64 items-end gap-2">
            {Array.from({ length: 30 }).map((_, i) => {
              const h = 30 + Math.abs(Math.sin(i * 0.7)) * 65 + Math.random() * 15;
              return (
                <div
                  key={i}
                  className="flex-1 rounded-t-md gradient-brand opacity-80 transition hover:opacity-100"
                  style={{ height: `${h}%` }}
                />
              );
            })}
          </div>
        </div>

        <div className="rounded-2xl border border-border bg-card p-6">
          <h3 className="mb-4 text-lg font-bold text-foreground">حالة الأسطول</h3>
          <div className="space-y-3">
            {[
              { label: "في الرحلات", value: 34, total: 48, icon: RouteIcon, color: "bg-accent" },
              { label: "متاح", value: 11, total: 48, icon: CheckCircle2, color: "bg-success" },
              { label: "صيانة", value: 3, total: 48, icon: Clock, color: "bg-warning" },
              { label: "خارج الخدمة", value: 0, total: 48, icon: AlertTriangle, color: "bg-destructive" },
            ].map((s) => (
              <div key={s.label}>
                <div className="mb-1 flex items-center justify-between text-sm">
                  <span className="flex items-center gap-2 font-medium">
                    <s.icon className="h-4 w-4 text-muted-foreground" />
                    {s.label}
                  </span>
                  <span className="font-bold">{s.value}</span>
                </div>
                <div className="h-2 overflow-hidden rounded-full bg-secondary">
                  <div className={`h-full ${s.color}`} style={{ width: `${(s.value / s.total) * 100}%` }} />
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Recent trips */}
      <div className="mt-6 rounded-2xl border border-border bg-card">
        <div className="flex items-center justify-between border-b border-border p-6">
          <h3 className="text-lg font-bold text-foreground">آخر الرحلات</h3>
          <button className="text-sm font-semibold text-accent hover:underline">عرض الكل</button>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-secondary/50 text-xs uppercase text-muted-foreground">
              <tr>
                <th className="p-4 text-right font-semibold">رقم الرحلة</th>
                <th className="p-4 text-right font-semibold">الانطلاق</th>
                <th className="p-4 text-right font-semibold">الوصول</th>
                <th className="p-4 text-right font-semibold">السائق</th>
                <th className="p-4 text-right font-semibold">الحالة</th>
              </tr>
            </thead>
            <tbody>
              {RECENT_TRIPS.map((t) => (
                <tr key={t.id} className="border-t border-border hover:bg-secondary/30">
                  <td className="p-4 font-mono font-semibold text-primary">{t.id}</td>
                  <td className="p-4">{t.from}</td>
                  <td className="p-4">{t.to}</td>
                  <td className="p-4">{t.driver}</td>
                  <td className="p-4">
                    <span
                      className={`inline-flex rounded-md px-2 py-1 text-xs font-semibold ${
                        t.statusColor === "success"
                          ? "bg-success/10 text-success"
                          : t.statusColor === "warning"
                            ? "bg-warning/10 text-warning-foreground"
                            : "bg-primary/10 text-primary"
                      }`}
                    >
                      {t.status}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </>
  );
}
