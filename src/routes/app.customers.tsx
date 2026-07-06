import { createFileRoute } from "@tanstack/react-router";
import { PageHeader, EmptyState } from "@/components/dashboard-layout";
import { Users, Plus, Search, Filter } from "lucide-react";
import { Button } from "@/components/ui/button";

export const Route = createFileRoute("/app/customers")({
  component: CustomersPage,
});

const SAMPLE = [
  { id: "C-001", name: "شركة النقل الوطنية", city: "الدار البيضاء", contracts: 3, revenue: "245K", status: "نشط" },
  { id: "C-002", name: "مجموعة الأطلس اللوجستية", city: "طنجة", contracts: 5, revenue: "412K", status: "نشط" },
  { id: "C-003", name: "شركة الصحراء للنقل", city: "أكادير", contracts: 1, revenue: "89K", status: "نشط" },
  { id: "C-004", name: "المؤسسة المغربية للتوزيع", city: "الرباط", contracts: 2, revenue: "156K", status: "معلق" },
];

function CustomersPage() {
  return (
    <>
      <PageHeader
        title="إدارة العملاء (CRM)"
        subtitle="ملفات عملاء متكاملة مع سجل تعاملات، عقود، فواتير، ووثائق"
        action={
          <Button className="gap-2 bg-accent text-accent-foreground hover:bg-accent/90">
            <Plus className="h-4 w-4" />
            عميل جديد
          </Button>
        }
      />

      <div className="mb-4 flex flex-wrap items-center gap-3">
        <div className="relative flex-1 min-w-64">
          <Search className="pointer-events-none absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <input
            placeholder="بحث عن عميل..."
            className="h-10 w-full rounded-lg border border-border bg-card pr-10 pl-4 text-sm focus:border-accent focus:outline-none focus:ring-2 focus:ring-accent/20"
          />
        </div>
        <Button variant="outline" className="gap-2">
          <Filter className="h-4 w-4" />
          فلترة
        </Button>
      </div>

      <div className="rounded-2xl border border-border bg-card">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-secondary/50 text-xs uppercase text-muted-foreground">
              <tr>
                <th className="p-4 text-right font-semibold">الرقم</th>
                <th className="p-4 text-right font-semibold">الاسم</th>
                <th className="p-4 text-right font-semibold">المدينة</th>
                <th className="p-4 text-right font-semibold">العقود</th>
                <th className="p-4 text-right font-semibold">الإيرادات</th>
                <th className="p-4 text-right font-semibold">الحالة</th>
              </tr>
            </thead>
            <tbody>
              {SAMPLE.map((c) => (
                <tr key={c.id} className="border-t border-border hover:bg-secondary/30">
                  <td className="p-4 font-mono font-semibold text-primary">{c.id}</td>
                  <td className="p-4 font-semibold">{c.name}</td>
                  <td className="p-4 text-muted-foreground">{c.city}</td>
                  <td className="p-4">{c.contracts}</td>
                  <td className="p-4 font-semibold">{c.revenue} MAD</td>
                  <td className="p-4">
                    <span
                      className={`inline-flex rounded-md px-2 py-1 text-xs font-semibold ${
                        c.status === "نشط" ? "bg-success/10 text-success" : "bg-warning/10 text-warning-foreground"
                      }`}
                    >
                      {c.status}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      <div className="mt-6">
        <EmptyState
          icon={Users}
          title="بيانات تجريبية"
          description="هذه بيانات عرض. سيتم ربط الوحدة بقاعدة البيانات مع نظام Multi-Tenant الكامل في الخطوة التالية."
        />
      </div>
    </>
  );
}
