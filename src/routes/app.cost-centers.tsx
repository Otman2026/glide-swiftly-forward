import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { PageHeader, EmptyState } from "@/components/dashboard-layout";
import { Wallet, Plus, Loader2, Pencil, Trash2, Archive, ArchiveRestore } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/use-auth";
import { SearchInput, matchQuery } from "@/components/search-input";

export const Route = createFileRoute("/app/cost-centers")({ component: CostCentersPage });

type CC = {
  id: string; code: string; name: string; description: string | null;
  budget: number | null; active: boolean; archived_at: string | null;
};

const empty = { code: "", name: "", description: "", budget: "0" };

function CostCentersPage() {
  const { session } = useAuth();
  const [rows, setRows] = useState<CC[]>([]);
  const [totals, setTotals] = useState<Record<string, number>>({});
  const [loading, setLoading] = useState(true);
  const [q, setQ] = useState("");
  const [showArchived, setShowArchived] = useState(false);
  const [open, setOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [editId, setEditId] = useState<string | null>(null);
  const [form, setForm] = useState(empty);

  const load = async () => {
    setLoading(true);
    const { data, error } = await (supabase as any).from("cost_centers").select("*").order("code");
    if (error) toast.error(error.message);
    else {
      setRows(data ?? []);
      // aggregate expenses per cost center
      const { data: exp } = await (supabase as any)
        .from("expenses").select("cost_center_id,amount").not("cost_center_id", "is", null);
      const map: Record<string, number> = {};
      (exp ?? []).forEach((e: any) => { map[e.cost_center_id] = (map[e.cost_center_id] || 0) + Number(e.amount || 0); });
      setTotals(map);
    }
    setLoading(false);
  };
  useEffect(() => { load(); }, []);

  const filtered = useMemo(() => rows.filter((r) => {
    if (showArchived ? !r.archived_at : !!r.archived_at) return false;
    return matchQuery(q, [r.code, r.name, r.description]);
  }), [rows, q, showArchived]);

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!session) return;
    setSaving(true);
    const payload: any = {
      code: form.code, name: form.name, description: form.description || null,
      budget: Number(form.budget || 0),
    };
    let error;
    if (editId) {
      ({ error } = await (supabase as any).from("cost_centers").update(payload).eq("id", editId));
    } else {
      const { data: prof } = await supabase.from("profiles").select("tenant_id").eq("id", session.user.id).single();
      payload.tenant_id = prof?.tenant_id;
      ({ error } = await (supabase as any).from("cost_centers").insert(payload));
    }
    setSaving(false);
    if (error) return toast.error(error.message);
    toast.success("تم الحفظ");
    setOpen(false); setEditId(null); setForm(empty); load();
  };

  const onArchive = async (r: CC) => {
    const val = r.archived_at ? null : new Date().toISOString();
    const { error } = await (supabase as any).from("cost_centers").update({ archived_at: val }).eq("id", r.id);
    if (error) toast.error(error.message);
    else { toast.success(r.archived_at ? "تم الاسترجاع" : "تمت الأرشفة"); load(); }
  };

  const onDelete = async (id: string) => {
    if (!confirm("حذف مركز التكلفة نهائياً؟")) return;
    const { error } = await (supabase as any).from("cost_centers").delete().eq("id", id);
    if (error) toast.error(error.message);
    else { toast.success("تم الحذف"); load(); }
  };

  const openEdit = (r: CC) => {
    setEditId(r.id);
    setForm({ code: r.code, name: r.name, description: r.description ?? "", budget: String(r.budget ?? 0) });
    setOpen(true);
  };

  return (
    <>
      <PageHeader title="مراكز التكلفة" description="إدارة مراكز التكلفة وربطها بالمصاريف والرحلات والمركبات."
        actions={<Button className="gap-2 bg-accent text-accent-foreground hover:bg-accent/90" onClick={() => { setEditId(null); setForm(empty); setOpen(true); }}>
          <Plus className="h-4 w-4" /> مركز جديد</Button>} />

      <div className="mb-4 flex flex-wrap items-center gap-3">
        <SearchInput value={q} onChange={setQ} placeholder="بحث بالكود، الاسم، الوصف..." />
        <label className="flex items-center gap-2 text-sm text-muted-foreground">
          <input type="checkbox" checked={showArchived} onChange={(e) => setShowArchived(e.target.checked)} />
          عرض المؤرشفة
        </label>
        <div className="text-xs text-muted-foreground">{filtered.length} مركز</div>
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-16"><Loader2 className="h-6 w-6 animate-spin text-accent" /></div>
      ) : filtered.length === 0 ? (
        <EmptyState icon={Wallet} title="لا يوجد مراكز تكلفة" description="ابدأ بإضافة مركز تكلفة جديد." />
      ) : (
        <div className="rounded-2xl border border-border bg-card overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-secondary/50 text-xs uppercase text-muted-foreground">
              <tr>
                <th className="p-4 text-right">الكود</th>
                <th className="p-4 text-right">الاسم</th>
                <th className="p-4 text-right">الميزانية</th>
                <th className="p-4 text-right">المصروف</th>
                <th className="p-4 text-right">المتبقي</th>
                <th className="p-4 text-right">الحالة</th>
                <th className="p-4 text-right">إجراءات</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((r) => {
                const spent = totals[r.id] || 0;
                const budget = Number(r.budget || 0);
                const over = budget > 0 && spent > budget;
                return (
                  <tr key={r.id} className={"border-t border-border hover:bg-secondary/30 " + (r.archived_at ? "opacity-60" : "")}>
                    <td className="p-4 font-mono">{r.code}</td>
                    <td className="p-4 font-semibold">{r.name}</td>
                    <td className="p-4">{budget.toLocaleString()}</td>
                    <td className={"p-4 " + (over ? "text-destructive font-semibold" : "")}>{spent.toLocaleString()}</td>
                    <td className="p-4">{(budget - spent).toLocaleString()}</td>
                    <td className="p-4">{r.archived_at ? "مؤرشف" : (r.active ? "نشط" : "متوقف")}</td>
                    <td className="p-4">
                      <div className="flex gap-1">
                        <Button variant="ghost" size="sm" onClick={() => openEdit(r)}><Pencil className="h-4 w-4" /></Button>
                        <Button variant="ghost" size="sm" onClick={() => onArchive(r)} title={r.archived_at ? "استرجاع" : "أرشفة"}>
                          {r.archived_at ? <ArchiveRestore className="h-4 w-4" /> : <Archive className="h-4 w-4" />}
                        </Button>
                        <Button variant="ghost" size="sm" onClick={() => onDelete(r.id)} className="text-destructive hover:bg-destructive/10 hover:text-destructive"><Trash2 className="h-4 w-4" /></Button>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      <Dialog open={open} onOpenChange={(o) => { setOpen(o); if (!o) { setEditId(null); setForm(empty); } }}>
        <DialogContent dir="rtl" className="max-w-lg">
          <DialogHeader><DialogTitle>{editId ? "تعديل مركز تكلفة" : "مركز تكلفة جديد"}</DialogTitle></DialogHeader>
          <form onSubmit={onSubmit} className="space-y-3">
            <div className="grid grid-cols-2 gap-3">
              <div><Label>الكود *</Label><Input required value={form.code} onChange={(e) => setForm({ ...form, code: e.target.value })} /></div>
              <div><Label>الاسم *</Label><Input required value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} /></div>
            </div>
            <div><Label>الميزانية</Label><Input type="number" step="0.01" value={form.budget} onChange={(e) => setForm({ ...form, budget: e.target.value })} /></div>
            <div><Label>الوصف</Label>
              <textarea rows={3} value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })}
                className="w-full rounded-md border border-border bg-background px-3 py-2 text-sm" /></div>
            <DialogFooter>
              <Button type="submit" disabled={saving} className="gap-2 bg-accent text-accent-foreground hover:bg-accent/90">
                {saving && <Loader2 className="h-4 w-4 animate-spin" />} حفظ
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </>
  );
}
