import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { PageHeader, EmptyState } from "@/components/dashboard-layout";
import { Shield, RefreshCw, Search } from "lucide-react";
import { toast } from "sonner";

export const Route = createFileRoute("/app/audit")({
  component: AuditPage,
});

type AuditRow = {
  id: string;
  action: string;
  entity_type: string;
  entity_id: string | null;
  user_id: string | null;
  ip_address: string | null;
  old_data: any;
  new_data: any;
  created_at: string;
};

type ProfileMap = Record<string, { full_name: string | null; email: string | null }>;

const ACTION_LABEL: Record<string, string> = {
  create: "إنشاء",
  insert: "إنشاء",
  update: "تعديل",
  delete: "حذف",
  login: "دخول",
  logout: "خروج",
};

const ACTION_COLOR: Record<string, string> = {
  create: "bg-success/10 text-success",
  insert: "bg-success/10 text-success",
  update: "bg-accent/10 text-accent",
  delete: "bg-destructive/10 text-destructive",
  login: "bg-primary/10 text-primary",
  logout: "bg-muted text-muted-foreground",
};

function AuditPage() {
  const [rows, setRows] = useState<AuditRow[]>([]);
  const [profiles, setProfiles] = useState<ProfileMap>({});
  const [loading, setLoading] = useState(true);
  const [q, setQ] = useState("");
  const [action, setAction] = useState<string>("");
  const [entity, setEntity] = useState<string>("");
  const [detail, setDetail] = useState<AuditRow | null>(null);

  const load = async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from("audit_log")
      .select("*")
      .order("created_at", { ascending: false })
      .limit(500);
    if (error) {
      toast.error("تعذر تحميل السجل: " + error.message);
      setLoading(false);
      return;
    }
    const list = (data ?? []) as AuditRow[];
    setRows(list);
    const ids = Array.from(new Set(list.map((r) => r.user_id).filter(Boolean))) as string[];
    if (ids.length) {
      const { data: profs } = await supabase
        .from("profiles")
        .select("id,full_name,email")
        .in("id", ids);
      const map: ProfileMap = {};
      (profs ?? []).forEach((p: any) => {
        map[p.id] = { full_name: p.full_name, email: p.email };
      });
      setProfiles(map);
    }
    setLoading(false);
  };

  useEffect(() => {
    load();
  }, []);

  const entityTypes = Array.from(new Set(rows.map((r) => r.entity_type))).sort();
  const actions = Array.from(new Set(rows.map((r) => r.action))).sort();

  const filtered = rows.filter((r) => {
    if (action && r.action !== action) return false;
    if (entity && r.entity_type !== entity) return false;
    if (q) {
      const s = q.toLowerCase();
      const u = r.user_id ? profiles[r.user_id] : null;
      const hay = [
        r.entity_type,
        r.entity_id ?? "",
        r.action,
        u?.full_name ?? "",
        u?.email ?? "",
        r.ip_address ?? "",
      ]
        .join(" ")
        .toLowerCase();
      if (!hay.includes(s)) return false;
    }
    return true;
  });

  return (
    <div>
      <PageHeader
        title="سجل التدقيق"
        subtitle="سجل جميع العمليات الحساسة على النظام (آخر 500 عملية)"
        action={
          <button
            onClick={load}
            className="flex items-center gap-2 rounded-lg border border-border bg-background px-4 py-2 text-sm font-semibold hover:bg-secondary"
          >
            <RefreshCw className="h-4 w-4" />
            تحديث
          </button>
        }
      />

      <div className="mb-4 flex flex-wrap items-center gap-2 rounded-xl border border-border bg-card p-3">
        <div className="relative min-w-[200px] flex-1">
          <Search className="pointer-events-none absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <input
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="بحث بالمستخدم، الكيان، IP..."
            className="h-10 w-full rounded-lg border border-border bg-background pl-3 pr-10 text-sm"
          />
        </div>
        <select
          value={action}
          onChange={(e) => setAction(e.target.value)}
          className="h-10 rounded-lg border border-border bg-background px-3 text-sm"
        >
          <option value="">كل العمليات</option>
          {actions.map((a) => (
            <option key={a} value={a}>
              {ACTION_LABEL[a] ?? a}
            </option>
          ))}
        </select>
        <select
          value={entity}
          onChange={(e) => setEntity(e.target.value)}
          className="h-10 rounded-lg border border-border bg-background px-3 text-sm"
        >
          <option value="">كل الكيانات</option>
          {entityTypes.map((e) => (
            <option key={e} value={e}>
              {e}
            </option>
          ))}
        </select>
      </div>

      {loading ? (
        <div className="py-16 text-center text-sm text-muted-foreground">جاري التحميل...</div>
      ) : filtered.length === 0 ? (
        <EmptyState
          icon={Shield}
          title="لا توجد سجلات"
          description="لم يتم تسجيل أي عمليات مطابقة. الصلاحية مقصورة على مدير الشركة أو مالك النظام."
        />
      ) : (
        <div className="overflow-x-auto rounded-xl border border-border bg-card">
          <table className="w-full text-sm">
            <thead className="bg-secondary/60 text-xs font-bold text-muted-foreground">
              <tr>
                <th className="px-4 py-3 text-right">التاريخ</th>
                <th className="px-4 py-3 text-right">المستخدم</th>
                <th className="px-4 py-3 text-right">العملية</th>
                <th className="px-4 py-3 text-right">الكيان</th>
                <th className="px-4 py-3 text-right">المعرّف</th>
                <th className="px-4 py-3 text-right">IP</th>
                <th className="px-4 py-3"></th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((r) => {
                const u = r.user_id ? profiles[r.user_id] : null;
                const color = ACTION_COLOR[r.action] ?? "bg-muted text-muted-foreground";
                return (
                  <tr key={r.id} className="border-t border-border">
                    <td className="whitespace-nowrap px-4 py-3 text-xs text-muted-foreground">
                      {new Date(r.created_at).toLocaleString("ar")}
                    </td>
                    <td className="px-4 py-3">
                      <div className="font-semibold">{u?.full_name ?? "—"}</div>
                      <div className="text-[11px] text-muted-foreground">{u?.email ?? ""}</div>
                    </td>
                    <td className="px-4 py-3">
                      <span className={`rounded-full px-2 py-0.5 text-xs font-bold ${color}`}>
                        {ACTION_LABEL[r.action] ?? r.action}
                      </span>
                    </td>
                    <td className="px-4 py-3 font-mono text-xs">{r.entity_type}</td>
                    <td className="px-4 py-3 font-mono text-[11px] text-muted-foreground">
                      {r.entity_id?.slice(0, 8) ?? "—"}
                    </td>
                    <td className="px-4 py-3 font-mono text-xs">{r.ip_address ?? "—"}</td>
                    <td className="px-4 py-3 text-left">
                      <button
                        onClick={() => setDetail(r)}
                        className="text-xs font-semibold text-accent hover:underline"
                      >
                        تفاصيل
                      </button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      {detail && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4"
          onClick={() => setDetail(null)}
        >
          <div
            className="max-h-[85vh] w-full max-w-2xl overflow-y-auto rounded-2xl bg-background p-6 shadow-2xl"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="mb-4 flex items-center justify-between">
              <h3 className="text-lg font-black">تفاصيل السجل</h3>
              <button
                onClick={() => setDetail(null)}
                className="rounded-lg border border-border px-3 py-1 text-sm hover:bg-secondary"
              >
                إغلاق
              </button>
            </div>
            <div className="space-y-3 text-sm">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <div className="text-xs font-bold text-muted-foreground">التاريخ</div>
                  <div>{new Date(detail.created_at).toLocaleString("ar")}</div>
                </div>
                <div>
                  <div className="text-xs font-bold text-muted-foreground">العملية</div>
                  <div>{ACTION_LABEL[detail.action] ?? detail.action}</div>
                </div>
                <div>
                  <div className="text-xs font-bold text-muted-foreground">الكيان</div>
                  <div className="font-mono">{detail.entity_type}</div>
                </div>
                <div>
                  <div className="text-xs font-bold text-muted-foreground">المعرّف</div>
                  <div className="font-mono text-xs">{detail.entity_id ?? "—"}</div>
                </div>
              </div>
              {detail.old_data && (
                <div>
                  <div className="mb-1 text-xs font-bold text-muted-foreground">القيمة القديمة</div>
                  <pre
                    className="max-h-64 overflow-auto rounded-lg bg-secondary/60 p-3 text-[11px]"
                    dir="ltr"
                  >
                    {JSON.stringify(detail.old_data, null, 2)}
                  </pre>
                </div>
              )}
              {detail.new_data && (
                <div>
                  <div className="mb-1 text-xs font-bold text-muted-foreground">القيمة الجديدة</div>
                  <pre
                    className="max-h-64 overflow-auto rounded-lg bg-secondary/60 p-3 text-[11px]"
                    dir="ltr"
                  >
                    {JSON.stringify(detail.new_data, null, 2)}
                  </pre>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
