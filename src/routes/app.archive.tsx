import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { PageHeader, EmptyState } from "@/components/dashboard-layout";
import { Archive, ArchiveRestore, Loader2, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";

export const Route = createFileRoute("/app/archive")({ component: ArchivePage });

type Entity = { key: string; table: string; label: string; label_col: string; secondary_col?: string };

const ENTITIES: Entity[] = [
  { key: "customers", table: "customers", label: "العملاء", label_col: "name", secondary_col: "phone" },
  { key: "drivers", table: "drivers", label: "السائقون", label_col: "full_name", secondary_col: "phone" },
  { key: "vehicles", table: "vehicles", label: "المركبات", label_col: "plate_number", secondary_col: "brand" },
  { key: "employees", table: "employees", label: "الموظفون", label_col: "full_name", secondary_col: "position" },
  { key: "contracts", table: "contracts", label: "العقود", label_col: "id" },
  { key: "invoices", table: "invoices", label: "الفواتير", label_col: "invoice_number", secondary_col: "total_amount" },
  { key: "trips", table: "trips", label: "الرحلات", label_col: "trip_number" },
  { key: "transport_orders", table: "transport_orders", label: "أوامر النقل", label_col: "order_number" },
  { key: "expenses", table: "expenses", label: "المصاريف", label_col: "description", secondary_col: "amount" },
  { key: "cost_centers", table: "cost_centers", label: "مراكز التكلفة", label_col: "name", secondary_col: "code" },
];

function ArchivePage() {
  const [tab, setTab] = useState<Entity>(ENTITIES[0]);
  const [rows, setRows] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  const load = async () => {
    setLoading(true);
    const cols = ["id", "archived_at", "archived_reason", tab.label_col, tab.secondary_col].filter(Boolean).join(",");
    const { data, error } = await (supabase as any).from(tab.table)
      .select(cols).not("archived_at", "is", null)
      .order("archived_at", { ascending: false });
    if (error) toast.error(error.message);
    else setRows(data ?? []);
    setLoading(false);
  };
  useEffect(() => { load(); /* eslint-disable-next-line */ }, [tab.key]);

  const onRestore = async (id: string) => {
    const { error } = await (supabase as any).from(tab.table)
      .update({ archived_at: null, archived_reason: null }).eq("id", id);
    if (error) return toast.error(error.message);
    toast.success("تم الاسترجاع"); load();
  };

  const onDelete = async (id: string) => {
    if (!confirm("حذف نهائي؟ لا يمكن التراجع.")) return;
    const { error } = await (supabase as any).from(tab.table).delete().eq("id", id);
    if (error) return toast.error(error.message);
    toast.success("تم الحذف النهائي"); load();
  };

  return (
    <>
      <PageHeader title="الأرشيف واسترجاع البيانات" subtitle="عرض جميع السجلات المؤرشفة مع إمكانية استعادتها أو حذفها نهائياً." />

      <div className="mb-4 flex flex-wrap gap-2">
        {ENTITIES.map((e) => (
          <button key={e.key}
            onClick={() => setTab(e)}
            className={"rounded-lg border px-3 py-1.5 text-sm " + (tab.key === e.key ? "border-accent bg-accent text-accent-foreground" : "border-border bg-card")}>
            {e.label}
          </button>
        ))}
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-16"><Loader2 className="h-6 w-6 animate-spin text-accent" /></div>
      ) : rows.length === 0 ? (
        <EmptyState icon={Archive} title="لا يوجد سجلات مؤرشفة" description={`لا توجد سجلات مؤرشفة في قسم ${tab.label}.`} />
      ) : (
        <div className="rounded-2xl border border-border bg-card overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-secondary/50 text-xs uppercase text-muted-foreground">
              <tr>
                <th className="p-4 text-right">العنصر</th>
                {tab.secondary_col && <th className="p-4 text-right">{tab.secondary_col}</th>}
                <th className="p-4 text-right">تاريخ الأرشفة</th>
                <th className="p-4 text-right">السبب</th>
                <th className="p-4 text-right">إجراءات</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((r) => (
                <tr key={r.id} className="border-t border-border">
                  <td className="p-4 font-semibold">{r[tab.label_col] ?? "—"}</td>
                  {tab.secondary_col && <td className="p-4 text-muted-foreground">{String(r[tab.secondary_col] ?? "—")}</td>}
                  <td className="p-4 text-muted-foreground">{r.archived_at ? new Date(r.archived_at).toLocaleString("ar") : "—"}</td>
                  <td className="p-4 text-muted-foreground">{r.archived_reason ?? "—"}</td>
                  <td className="p-4">
                    <div className="flex gap-1">
                      <Button variant="ghost" size="sm" onClick={() => onRestore(r.id)} title="استرجاع" className="text-accent">
                        <ArchiveRestore className="h-4 w-4" />
                      </Button>
                      <Button variant="ghost" size="sm" onClick={() => onDelete(r.id)} title="حذف نهائي"
                        className="text-destructive hover:bg-destructive/10">
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </>
  );
}
