import { createFileRoute } from "@tanstack/react-router";
import { PageHeader } from "@/components/dashboard-layout";
import { Package, Plus } from "lucide-react";
import { Button } from "@/components/ui/button";

export const Route = createFileRoute("/app/shipments")({
  component: ShipmentsPage,
});

const STATUSES = [
  { label: "مسودة", color: "bg-muted text-muted-foreground", count: 4 },
  { label: "بانتظار الموافقة", color: "bg-warning/10 text-warning-foreground", count: 6 },
  { label: "جاهزة للتحميل", color: "bg-primary/10 text-primary", count: 8 },
  { label: "تم التحميل", color: "bg-chart-3/10 text-chart-3", count: 12 },
  { label: "في الطريق", color: "bg-accent/10 text-accent", count: 18 },
  { label: "وصلت", color: "bg-success/10 text-success", count: 9 },
  { label: "تم التسليم", color: "bg-success/10 text-success", count: 142 },
  { label: "ملغاة", color: "bg-destructive/10 text-destructive", count: 3 },
];

function ShipmentsPage() {
  return (
    <>
      <PageHeader
        title="إدارة الشحنات"
        subtitle="تتبع الشحنات من التحميل حتى التسليم بجميع حالاتها"
        action={
          <Button className="gap-2 bg-accent text-accent-foreground hover:bg-accent/90">
            <Plus className="h-4 w-4" />
            شحنة جديدة
          </Button>
        }
      />

      <div className="grid gap-3 sm:grid-cols-2 md:grid-cols-4">
        {STATUSES.map((s) => (
          <div key={s.label} className="rounded-2xl border border-border bg-card p-5">
            <span className={`inline-flex rounded-md px-2 py-1 text-[10px] font-bold ${s.color}`}>
              {s.label}
            </span>
            <div className="mt-3 text-3xl font-black text-foreground">{s.count}</div>
            <div className="mt-1 flex items-center gap-1 text-xs text-muted-foreground">
              <Package className="h-3 w-3" />
              شحنة
            </div>
          </div>
        ))}
      </div>
    </>
  );
}
