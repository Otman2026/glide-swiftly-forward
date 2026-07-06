import { createFileRoute } from "@tanstack/react-router";
import { PageHeader } from "@/components/dashboard-layout";
import { Truck, Plus, Container } from "lucide-react";
import { Button } from "@/components/ui/button";

export const Route = createFileRoute("/app/vehicles")({
  component: VehiclesPage,
});

const TYPES = [
  { label: "شاحنات", count: 24, icon: Truck },
  { label: "جرارات", count: 12, icon: Truck },
  { label: "مقطورات", count: 18, icon: Container },
  { label: "حاويات", count: 32, icon: Container },
  { label: "خفيفة", count: 8, icon: Truck },
];

const SAMPLE = [
  { plate: "12345-أ-6", type: "شاحنة", brand: "Volvo FH16", year: 2022, load: "40T", status: "نشطة" },
  { plate: "23456-ب-6", type: "جرار", brand: "Mercedes Actros", year: 2023, load: "44T", status: "في رحلة" },
  { plate: "34567-ج-6", type: "شاحنة مبردة", brand: "Renault T", year: 2021, load: "26T", status: "صيانة" },
  { plate: "45678-د-6", type: "مقطورة", brand: "Schmitz", year: 2020, load: "30T", status: "نشطة" },
];

function VehiclesPage() {
  return (
    <>
      <PageHeader
        title="إدارة الأسطول"
        subtitle="شاحنات، جرارات، مقطورات، حاويات ومركبات خفيفة مع وثائقها الكاملة"
        action={
          <Button className="gap-2 bg-accent text-accent-foreground hover:bg-accent/90">
            <Plus className="h-4 w-4" />
            مركبة جديدة
          </Button>
        }
      />

      <div className="mb-6 grid gap-3 md:grid-cols-5">
        {TYPES.map((t) => (
          <div key={t.label} className="rounded-2xl border border-border bg-card p-4 text-center">
            <div className="mx-auto mb-2 flex h-10 w-10 items-center justify-center rounded-xl bg-primary/10 text-primary">
              <t.icon className="h-5 w-5" />
            </div>
            <div className="text-2xl font-black text-foreground">{t.count}</div>
            <div className="text-xs text-muted-foreground">{t.label}</div>
          </div>
        ))}
      </div>

      <div className="rounded-2xl border border-border bg-card">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-secondary/50 text-xs uppercase text-muted-foreground">
              <tr>
                <th className="p-4 text-right font-semibold">اللوحة</th>
                <th className="p-4 text-right font-semibold">النوع</th>
                <th className="p-4 text-right font-semibold">الماركة</th>
                <th className="p-4 text-right font-semibold">السنة</th>
                <th className="p-4 text-right font-semibold">الحمولة</th>
                <th className="p-4 text-right font-semibold">الحالة</th>
              </tr>
            </thead>
            <tbody>
              {SAMPLE.map((v) => (
                <tr key={v.plate} className="border-t border-border hover:bg-secondary/30">
                  <td className="p-4 font-mono font-semibold text-primary">{v.plate}</td>
                  <td className="p-4">{v.type}</td>
                  <td className="p-4">{v.brand}</td>
                  <td className="p-4 text-muted-foreground">{v.year}</td>
                  <td className="p-4 font-semibold">{v.load}</td>
                  <td className="p-4">
                    <span
                      className={`inline-flex rounded-md px-2 py-1 text-xs font-semibold ${
                        v.status === "نشطة"
                          ? "bg-success/10 text-success"
                          : v.status === "في رحلة"
                            ? "bg-accent/10 text-accent"
                            : "bg-warning/10 text-warning-foreground"
                      }`}
                    >
                      {v.status}
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
