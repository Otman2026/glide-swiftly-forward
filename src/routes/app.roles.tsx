import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { PageHeader } from "@/components/dashboard-layout";
import { Shield, Loader2, Check, X, Users as UsersIcon } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

export const Route = createFileRoute("/app/roles")({ component: RolesPage });

type RoleKey =
  | "system_owner" | "company_admin" | "ops_manager" | "fleet_manager"
  | "maintenance" | "accountant" | "receptionist" | "driver";

type RoleDef = {
  key: RoleKey;
  label: string;
  description: string;
  color: string;
};

const ROLES: RoleDef[] = [
  { key: "company_admin", label: "مدير الشركة", description: "صلاحيات كاملة داخل الشركة، إدارة المستخدمين والأدوار والفوترة.", color: "bg-primary/10 text-primary border-primary/30" },
  { key: "ops_manager", label: "مدير العمليات", description: "إدارة الأوامر، الشحنات، الرحلات، والتعيينات اليومية.", color: "bg-accent/10 text-accent border-accent/30" },
  { key: "fleet_manager", label: "مسؤول الأسطول", description: "إدارة المركبات، السائقين، الوثائق، وتنبيهات الانتهاء.", color: "bg-blue-500/10 text-blue-600 border-blue-500/30" },
  { key: "maintenance", label: "مسؤول الصيانة", description: "أوامر الصيانة، قطع الغيار، الوقود، والأعطال.", color: "bg-orange-500/10 text-orange-600 border-orange-500/30" },
  { key: "accountant", label: "المحاسب", description: "الفواتير، المصاريف، المدفوعات، والتقارير المالية.", color: "bg-emerald-500/10 text-emerald-600 border-emerald-500/30" },
  { key: "receptionist", label: "الاستقبال", description: "إدخال العملاء والأوامر واستقبال الطلبات فقط.", color: "bg-purple-500/10 text-purple-600 border-purple-500/30" },
  { key: "driver", label: "السائق", description: "الوصول لتطبيق السائق: رحلاتي، رفع الوثائق، تحديث الحالة.", color: "bg-muted text-muted-foreground border-border" },
];

type MatrixRow = { module: string; caps: Partial<Record<RoleKey, "R" | "W" | "F" | "-">> };

// R = قراءة, W = قراءة+كتابة, F = كامل (يشمل حذف/إدارة), - = بدون
const MATRIX: MatrixRow[] = [
  { module: "المستخدمون والأدوار",  caps: { company_admin: "F" } },
  { module: "الفوترة والاشتراك",    caps: { company_admin: "F", accountant: "R" } },
  { module: "العملاء (CRM)",         caps: { company_admin: "F", ops_manager: "W", receptionist: "W", accountant: "R" } },
  { module: "العقود",                caps: { company_admin: "F", ops_manager: "W", accountant: "R" } },
  { module: "أوامر النقل",           caps: { company_admin: "F", ops_manager: "F", receptionist: "W", accountant: "R" } },
  { module: "الشحنات",               caps: { company_admin: "F", ops_manager: "F", fleet_manager: "W", accountant: "R" } },
  { module: "الرحلات",               caps: { company_admin: "F", ops_manager: "F", fleet_manager: "W", driver: "R" } },
  { module: "تتبع GPS",              caps: { company_admin: "R", ops_manager: "R", fleet_manager: "R" } },
  { module: "المركبات",              caps: { company_admin: "F", fleet_manager: "F", maintenance: "R" } },
  { module: "السائقون",              caps: { company_admin: "F", fleet_manager: "F", ops_manager: "R" } },
  { module: "الوقود",                caps: { company_admin: "F", fleet_manager: "W", maintenance: "W", accountant: "R" } },
  { module: "الصيانة",               caps: { company_admin: "F", maintenance: "F", fleet_manager: "R", accountant: "R" } },
  { module: "الحوادث والمخالفات",    caps: { company_admin: "F", fleet_manager: "W", ops_manager: "R" } },
  { module: "المستودعات والمخزون",   caps: { company_admin: "F", ops_manager: "W", accountant: "R" } },
  { module: "الوثائق",               caps: { company_admin: "F", ops_manager: "W", fleet_manager: "W", accountant: "R", driver: "R" } },
  { module: "الفواتير والمالية",     caps: { company_admin: "F", accountant: "F", ops_manager: "R" } },
  { module: "التقارير و KPI",        caps: { company_admin: "F", ops_manager: "R", fleet_manager: "R", accountant: "R" } },
];

const CAP_META: Record<"R" | "W" | "F" | "-", { label: string; cls: string }> = {
  F: { label: "كامل",    cls: "bg-success/15 text-success" },
  W: { label: "كتابة",   cls: "bg-primary/15 text-primary" },
  R: { label: "قراءة",   cls: "bg-muted text-muted-foreground" },
  "-": { label: "—",     cls: "" },
};

function RolesPage() {
  const [counts, setCounts] = useState<Record<string, number>>({});
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      const { data: u } = await supabase.auth.getUser();
      if (!u.user) { setLoading(false); return; }
      const { data: prof } = await supabase.from("profiles").select("tenant_id").eq("id", u.user.id).maybeSingle();
      if (!prof?.tenant_id) { setLoading(false); return; }
      const { data, error } = await supabase.from("user_roles").select("role").eq("tenant_id", prof.tenant_id);
      if (error) toast.error(error.message);
      const map: Record<string, number> = {};
      (data ?? []).forEach((r) => { map[r.role] = (map[r.role] ?? 0) + 1; });
      setCounts(map);
      setLoading(false);
    })();
  }, []);

  return (
    <>
      <PageHeader
        title="الأدوار والصلاحيات"
        subtitle="مرجع كامل لأدوار المنصة، وصف كل دور، ومصفوفة الصلاحيات على الوحدات"
        action={
          <Link
            to="/app/users"
            className="inline-flex items-center gap-2 rounded-lg bg-accent px-4 py-2 text-sm font-semibold text-accent-foreground hover:bg-accent/90"
          >
            <UsersIcon className="h-4 w-4" /> إدارة المستخدمين
          </Link>
        }
      />

      {loading ? (
        <div className="flex justify-center py-16"><Loader2 className="h-6 w-6 animate-spin text-accent" /></div>
      ) : (
        <>
          {/* بطاقات الأدوار */}
          <div className="mb-6 grid gap-3 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
            {ROLES.map((r) => (
              <div key={r.key} className={`rounded-2xl border-2 p-4 ${r.color}`}>
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Shield className="h-4 w-4" />
                    <span className="font-bold">{r.label}</span>
                  </div>
                  <span className="rounded-full bg-background/70 px-2 py-0.5 text-xs font-mono font-bold">
                    {counts[r.key] ?? 0}
                  </span>
                </div>
                <p className="mt-2 text-xs opacity-80 leading-relaxed">{r.description}</p>
              </div>
            ))}
          </div>

          {/* مصفوفة الصلاحيات */}
          <div className="rounded-2xl border border-border bg-card overflow-x-auto">
            <div className="border-b border-border p-4">
              <h2 className="text-sm font-bold">مصفوفة الصلاحيات</h2>
              <p className="mt-1 text-xs text-muted-foreground">
                كامل = قراءة/كتابة/حذف · كتابة = إضافة وتعديل · قراءة = عرض فقط
              </p>
            </div>
            <table className="w-full text-xs">
              <thead className="bg-secondary/50 text-muted-foreground">
                <tr>
                  <th className="p-3 text-right font-semibold sticky right-0 bg-secondary/50 min-w-[180px]">الوحدة</th>
                  {ROLES.map((r) => (
                    <th key={r.key} className="p-3 text-center font-semibold min-w-[90px]">
                      {r.label}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {MATRIX.map((row) => (
                  <tr key={row.module} className="border-t border-border hover:bg-secondary/30">
                    <td className="p-3 font-semibold sticky right-0 bg-card">{row.module}</td>
                    {ROLES.map((r) => {
                      const cap = row.caps[r.key] ?? "-";
                      const meta = CAP_META[cap];
                      return (
                        <td key={r.key} className="p-3 text-center">
                          {cap === "-" ? (
                            <X className="mx-auto h-3.5 w-3.5 text-muted-foreground/40" />
                          ) : (
                            <span className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 font-bold ${meta.cls}`}>
                              <Check className="h-3 w-3" /> {meta.label}
                            </span>
                          )}
                        </td>
                      );
                    })}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <p className="mt-4 text-xs text-muted-foreground">
            الصلاحيات مطبَّقة على مستوى قاعدة البيانات عبر Row-Level Security مع دالة <code dir="ltr">has_role()</code>. لإسناد أو إزالة دور من مستخدم استخدم صفحة{" "}
            <Link to="/app/users" className="text-accent underline">المستخدمين</Link>.
          </p>
        </>
      )}
    </>
  );
}
