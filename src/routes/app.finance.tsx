import { createFileRoute } from "@tanstack/react-router";
import { PageHeader } from "@/components/dashboard-layout";
import { Wallet, TrendingUp, TrendingDown } from "lucide-react";

export const Route = createFileRoute("/app/finance")({
  component: FinancePage,
});

function FinancePage() {
  return (
    <>
      <PageHeader
        title="الإيرادات والمصروفات"
        subtitle="الإيرادات، الوقود، الرواتب، الصيانة، التأمين، الرسوم الطرقية، الربحية"
      />

      <div className="grid gap-4 md:grid-cols-4">
        <div className="rounded-2xl border border-border bg-card p-6">
          <div className="text-xs text-muted-foreground">الإيرادات (الشهر)</div>
          <div className="mt-2 text-3xl font-black text-success">428K</div>
          <div className="mt-2 flex items-center gap-1 text-xs font-semibold text-success">
            <TrendingUp className="h-3 w-3" /> +18%
          </div>
        </div>
        <div className="rounded-2xl border border-border bg-card p-6">
          <div className="text-xs text-muted-foreground">المصروفات (الشهر)</div>
          <div className="mt-2 text-3xl font-black text-destructive">284K</div>
          <div className="mt-2 flex items-center gap-1 text-xs font-semibold text-destructive">
            <TrendingUp className="h-3 w-3" /> +6%
          </div>
        </div>
        <div className="rounded-2xl border border-border bg-card p-6">
          <div className="text-xs text-muted-foreground">صافي الربح</div>
          <div className="mt-2 text-3xl font-black text-primary">144K</div>
          <div className="mt-2 flex items-center gap-1 text-xs font-semibold text-success">
            <TrendingUp className="h-3 w-3" /> +32%
          </div>
        </div>
        <div className="rounded-2xl border border-border bg-card p-6">
          <div className="text-xs text-muted-foreground">هامش الربحية</div>
          <div className="mt-2 text-3xl font-black text-accent">33.6%</div>
          <div className="mt-2 flex items-center gap-1 text-xs font-semibold text-success">
            <TrendingUp className="h-3 w-3" /> +4pts
          </div>
        </div>
      </div>

      <div className="mt-6 grid gap-6 lg:grid-cols-2">
        <div className="rounded-2xl border border-border bg-card p-6">
          <h3 className="mb-4 font-bold text-foreground">توزيع المصروفات</h3>
          <div className="space-y-3">
            {[
              { label: "الوقود", value: 128, total: 284, color: "bg-accent" },
              { label: "الرواتب", value: 82, total: 284, color: "bg-primary" },
              { label: "الصيانة", value: 34, total: 284, color: "bg-warning" },
              { label: "التأمين", value: 22, total: 284, color: "bg-chart-3" },
              { label: "الرسوم الطرقية", value: 18, total: 284, color: "bg-success" },
            ].map((e) => (
              <div key={e.label}>
                <div className="mb-1 flex items-center justify-between text-sm">
                  <span className="font-medium">{e.label}</span>
                  <span className="font-bold">{e.value}K MAD</span>
                </div>
                <div className="h-2 overflow-hidden rounded-full bg-secondary">
                  <div className={`h-full ${e.color}`} style={{ width: `${(e.value / e.total) * 100}%` }} />
                </div>
              </div>
            ))}
          </div>
        </div>

        <div className="rounded-2xl border border-border bg-card p-6">
          <h3 className="mb-4 font-bold text-foreground">الأكثر ربحية</h3>
          <div className="space-y-3">
            {[
              { name: "مجموعة الأطلس اللوجستية", value: "+128K" },
              { name: "شركة النقل الوطنية", value: "+94K" },
              { name: "المؤسسة المغربية للتوزيع", value: "+72K" },
              { name: "شركة الصحراء للنقل", value: "+41K" },
            ].map((c, i) => (
              <div key={c.name} className="flex items-center justify-between rounded-lg bg-secondary/50 p-3">
                <div className="flex items-center gap-3">
                  <div className="flex h-8 w-8 items-center justify-center rounded-lg gradient-brand text-xs font-bold text-white">
                    #{i + 1}
                  </div>
                  <span className="font-semibold">{c.name}</span>
                </div>
                <span className="font-bold text-success">{c.value}</span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </>
  );
}
