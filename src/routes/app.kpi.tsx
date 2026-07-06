import { createFileRoute } from "@tanstack/react-router";
import { PageHeader } from "@/components/dashboard-layout";
import { BarChart3, Truck, Users, Star, Fuel, TrendingUp } from "lucide-react";

export const Route = createFileRoute("/app/kpi")({
  component: KpiPage,
});

function KpiPage() {
  return (
    <>
      <PageHeader
        title="لوحة KPI الاحترافية"
        subtitle="مؤشرات الأداء الفورية لكل عمليات الشركة"
      />

      <div className="grid gap-4 md:grid-cols-3">
        {[
          { title: "نسبة استغلال الأسطول", value: "87%", target: 90, icon: Truck, color: "text-primary" },
          { title: "الالتزام بالمواعيد", value: "94%", target: 95, icon: TrendingUp, color: "text-success" },
          { title: "متوسط تقييم السائقين", value: "4.7/5", target: 4.5, icon: Star, color: "text-accent" },
        ].map((k) => (
          <div key={k.title} className="rounded-2xl border border-border bg-card p-6">
            <div className="mb-3 flex items-center justify-between">
              <div className={`flex h-10 w-10 items-center justify-center rounded-xl bg-secondary ${k.color}`}>
                <k.icon className="h-5 w-5" />
              </div>
              <span className="text-xs text-muted-foreground">الهدف: {k.target}</span>
            </div>
            <div className="text-4xl font-black text-foreground">{k.value}</div>
            <div className="mt-1 text-sm font-semibold text-muted-foreground">{k.title}</div>
          </div>
        ))}
      </div>

      <div className="mt-6 grid gap-6 lg:grid-cols-2">
        <RankCard
          title="أفضل العملاء (إيرادات)"
          icon={Users}
          rows={[
            { name: "مجموعة الأطلس اللوجستية", value: "412K" },
            { name: "شركة النقل الوطنية", value: "245K" },
            { name: "المؤسسة المغربية للتوزيع", value: "156K" },
            { name: "شركة الصحراء للنقل", value: "89K" },
          ]}
        />
        <RankCard
          title="أفضل السائقين (رحلات + تقييم)"
          icon={Star}
          rows={[
            { name: "خالد العلوي", value: "421 رحلة" },
            { name: "أحمد بن علي", value: "342 رحلة" },
            { name: "محمد الأمين", value: "298 رحلة" },
            { name: "يوسف الإدريسي", value: "187 رحلة" },
          ]}
        />
        <RankCard
          title="أكثر الشاحنات ربحية"
          icon={Truck}
          rows={[
            { name: "12345-أ-6 · Volvo FH16", value: "+84K" },
            { name: "23456-ب-6 · Mercedes Actros", value: "+72K" },
            { name: "45678-د-6 · Schmitz", value: "+51K" },
          ]}
        />
        <RankCard
          title="أعلى استهلاك وقود"
          icon={Fuel}
          rows={[
            { name: "34567-ج-6 · Renault T", value: "14.8L/100" },
            { name: "56789-هـ-6 · Iveco Stralis", value: "13.9L/100" },
            { name: "67890-و-6 · MAN TGX", value: "13.2L/100" },
          ]}
        />
      </div>

      <div className="mt-6 rounded-2xl border-2 border-dashed border-border bg-card p-8 text-center">
        <BarChart3 className="mx-auto h-10 w-10 text-muted-foreground" />
        <div className="mt-2 font-bold">تقارير متقدمة قادمة</div>
        <div className="text-sm text-muted-foreground">
          تحليلات AI، توقع الصيانة، اقتراح أفضل شاحنة وسائق لكل رحلة.
        </div>
      </div>
    </>
  );
}

function RankCard({
  title,
  icon: Icon,
  rows,
}: {
  title: string;
  icon: typeof Star;
  rows: { name: string; value: string }[];
}) {
  return (
    <div className="rounded-2xl border border-border bg-card p-6">
      <div className="mb-4 flex items-center gap-2">
        <Icon className="h-5 w-5 text-accent" />
        <h3 className="font-bold text-foreground">{title}</h3>
      </div>
      <div className="space-y-2">
        {rows.map((r, i) => (
          <div key={r.name} className="flex items-center justify-between rounded-lg bg-secondary/50 p-3">
            <div className="flex items-center gap-3">
              <div className="flex h-7 w-7 items-center justify-center rounded-full bg-primary text-xs font-bold text-primary-foreground">
                {i + 1}
              </div>
              <span className="text-sm font-semibold">{r.name}</span>
            </div>
            <span className="text-sm font-bold text-accent">{r.value}</span>
          </div>
        ))}
      </div>
    </div>
  );
}
