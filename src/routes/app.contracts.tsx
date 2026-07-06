import { createFileRoute } from "@tanstack/react-router";
import { PageHeader, EmptyState } from "@/components/dashboard-layout";
import { FileText, Plus } from "lucide-react";
import { Button } from "@/components/ui/button";

export const Route = createFileRoute("/app/contracts")({
  component: () => (
    <>
      <PageHeader
        title="إدارة العقود"
        subtitle="عقود سنوية، شهرية، دائمة ومؤقتة مع تواريخ البداية والانتهاء والأسعار والشروط"
        action={
          <Button className="gap-2 bg-accent text-accent-foreground hover:bg-accent/90">
            <Plus className="h-4 w-4" />
            عقد جديد
          </Button>
        }
      />
      <div className="grid gap-4 md:grid-cols-4">
        {[
          { label: "عقود نشطة", value: "34", tint: "bg-success/10 text-success" },
          { label: "عقود سنوية", value: "18", tint: "bg-primary/10 text-primary" },
          { label: "عقود شهرية", value: "12", tint: "bg-accent/10 text-accent" },
          { label: "قاربت على الانتهاء", value: "4", tint: "bg-warning/10 text-warning-foreground" },
        ].map((s) => (
          <div key={s.label} className="rounded-2xl border border-border bg-card p-5">
            <div className={`inline-flex rounded-lg px-2 py-1 text-[10px] font-bold ${s.tint}`}>
              {s.label}
            </div>
            <div className="mt-3 text-3xl font-black text-foreground">{s.value}</div>
          </div>
        ))}
      </div>
      <div className="mt-6">
        <EmptyState
          icon={FileText}
          title="لا توجد عقود بعد"
          description="أضف عقودك الأولى لبدء إدارة الأسعار وشروط النقل بشكل احترافي."
          action={
            <Button className="gap-2 bg-accent text-accent-foreground hover:bg-accent/90">
              <Plus className="h-4 w-4" />
              إنشاء عقد
            </Button>
          }
        />
      </div>
    </>
  ),
});
