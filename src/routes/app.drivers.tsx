import { createFileRoute } from "@tanstack/react-router";
import { PageHeader } from "@/components/dashboard-layout";
import { UserCog, Plus, Star, Phone } from "lucide-react";
import { Button } from "@/components/ui/button";

export const Route = createFileRoute("/app/drivers")({
  component: DriversPage,
});

const DRIVERS = [
  { name: "أحمد بن علي", license: "C+E", rating: 4.9, phone: "+212 6XX-XXXX", trips: 342, status: "متاح" },
  { name: "محمد الأمين", license: "C+E", rating: 4.7, phone: "+212 6XX-XXXX", trips: 298, status: "في رحلة" },
  { name: "يوسف الإدريسي", license: "C", rating: 4.8, phone: "+212 6XX-XXXX", trips: 187, status: "في رحلة" },
  { name: "خالد العلوي", license: "C+E", rating: 4.6, phone: "+212 6XX-XXXX", trips: 421, status: "متاح" },
  { name: "عبد الرحمن السعيدي", license: "C", rating: 4.5, phone: "+212 6XX-XXXX", trips: 156, status: "إجازة" },
];

function DriversPage() {
  return (
    <>
      <PageHeader
        title="إدارة السائقين"
        subtitle="ملفات كاملة: رخص، شهادات، تقييم، مخالفات وحوادث"
        action={
          <Button className="gap-2 bg-accent text-accent-foreground hover:bg-accent/90">
            <Plus className="h-4 w-4" />
            سائق جديد
          </Button>
        }
      />

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        {DRIVERS.map((d) => (
          <div key={d.name} className="rounded-2xl border border-border bg-card p-5 transition hover:shadow-elegant">
            <div className="flex items-start justify-between">
              <div className="flex items-center gap-3">
                <div className="flex h-12 w-12 items-center justify-center rounded-full gradient-brand font-bold text-white">
                  {d.name.charAt(0)}
                </div>
                <div>
                  <div className="font-bold text-foreground">{d.name}</div>
                  <div className="flex items-center gap-1 text-xs text-muted-foreground">
                    <Phone className="h-3 w-3" />
                    {d.phone}
                  </div>
                </div>
              </div>
              <span
                className={`inline-flex rounded-md px-2 py-1 text-[10px] font-bold ${
                  d.status === "متاح"
                    ? "bg-success/10 text-success"
                    : d.status === "في رحلة"
                      ? "bg-accent/10 text-accent"
                      : "bg-muted text-muted-foreground"
                }`}
              >
                {d.status}
              </span>
            </div>
            <div className="mt-4 grid grid-cols-3 gap-2 border-t border-border pt-4">
              <div>
                <div className="text-[10px] uppercase text-muted-foreground">الرخصة</div>
                <div className="font-bold text-primary">{d.license}</div>
              </div>
              <div>
                <div className="text-[10px] uppercase text-muted-foreground">الرحلات</div>
                <div className="font-bold">{d.trips}</div>
              </div>
              <div>
                <div className="text-[10px] uppercase text-muted-foreground">التقييم</div>
                <div className="flex items-center gap-1 font-bold text-accent">
                  <Star className="h-3 w-3 fill-accent" />
                  {d.rating}
                </div>
              </div>
            </div>
          </div>
        ))}
      </div>
    </>
  );
}
