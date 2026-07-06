import { createFileRoute } from "@tanstack/react-router";
import { PageHeader } from "@/components/dashboard-layout";
import { ClipboardList, Plus, CheckCircle2, Clock, Truck, Package, Wallet, ArrowLeft } from "lucide-react";
import { Button } from "@/components/ui/button";

export const Route = createFileRoute("/app/orders")({
  component: OrdersPage,
});

const WORKFLOW = [
  { icon: ClipboardList, label: "طلب نقل", count: 8 },
  { icon: CheckCircle2, label: "موافقة", count: 5 },
  { icon: Truck, label: "تخصيص شاحنة", count: 12 },
  { icon: Package, label: "تنفيذ", count: 34 },
  { icon: Clock, label: "تسليم", count: 6 },
  { icon: Wallet, label: "فوترة/تحصيل", count: 22 },
];

function OrdersPage() {
  return (
    <>
      <PageHeader
        title="أوامر النقل"
        subtitle="طلب نقل → موافقة → أمر نقل → تخصيص → تنفيذ → تسليم → فوترة → تحصيل"
        action={
          <Button className="gap-2 bg-accent text-accent-foreground hover:bg-accent/90">
            <Plus className="h-4 w-4" />
            أمر نقل جديد
          </Button>
        }
      />

      <div className="rounded-2xl border border-border bg-card p-6">
        <h3 className="mb-4 text-sm font-bold uppercase tracking-wider text-muted-foreground">
          دورة عمل النقل الاحترافية
        </h3>
        <div className="flex flex-wrap items-center gap-2 md:flex-nowrap">
          {WORKFLOW.map((step, i) => (
            <div key={step.label} className="flex flex-1 items-center">
              <div className="flex flex-1 flex-col items-center rounded-xl border border-border bg-secondary/40 p-4 text-center">
                <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10 text-primary">
                  <step.icon className="h-5 w-5" />
                </div>
                <div className="mt-2 text-xs font-semibold">{step.label}</div>
                <div className="mt-1 text-lg font-black text-accent">{step.count}</div>
              </div>
              {i < WORKFLOW.length - 1 && (
                <ArrowLeft className="mx-1 h-4 w-4 flex-shrink-0 text-muted-foreground" />
              )}
            </div>
          ))}
        </div>
      </div>
    </>
  );
}
