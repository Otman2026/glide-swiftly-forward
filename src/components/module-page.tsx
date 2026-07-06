import type { LucideIcon } from "lucide-react";
import { PageHeader, EmptyState } from "@/components/dashboard-layout";
import { Button } from "@/components/ui/button";
import { Plus } from "lucide-react";

export function ModulePage({
  title,
  subtitle,
  icon,
  emptyTitle,
  emptyDesc,
  stats,
}: {
  title: string;
  subtitle: string;
  icon: LucideIcon;
  emptyTitle: string;
  emptyDesc: string;
  stats?: { label: string; value: string; tint?: string }[];
}) {
  return (
    <>
      <PageHeader
        title={title}
        subtitle={subtitle}
        action={
          <Button className="gap-2 bg-accent text-accent-foreground hover:bg-accent/90">
            <Plus className="h-4 w-4" />
            إضافة
          </Button>
        }
      />
      {stats && (
        <div className="mb-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {stats.map((s) => (
            <div key={s.label} className="rounded-2xl border border-border bg-card p-5">
              <div className={`inline-flex rounded-md px-2 py-1 text-[10px] font-bold ${s.tint ?? "bg-primary/10 text-primary"}`}>
                {s.label}
              </div>
              <div className="mt-3 text-3xl font-black text-foreground">{s.value}</div>
            </div>
          ))}
        </div>
      )}
      <EmptyState icon={icon} title={emptyTitle} description={emptyDesc} />
    </>
  );
}
