import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { PageHeader, EmptyState } from "@/components/dashboard-layout";
import { Wallet, Plus, Loader2, Trash2, TrendingUp, TrendingDown } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";

export const Route = createFileRoute("/app/finance")({
  component: FinancePage,
});

type Expense = {
  id: string;
  expense_date: string;
  category: string;
  description: string | null;
  amount: number;
};

const CATEGORIES = [
  { k: "fuel", label: "الوقود" },
  { k: "salary", label: "الرواتب" },
  { k: "maintenance", label: "الصيانة" },
  { k: "insurance", label: "التأمين" },
  { k: "tolls", label: "الرسوم الطرقية" },
  { k: "other", label: "أخرى" },
];
const CAT_LABEL = Object.fromEntries(CATEGORIES.map((c) => [c.k, c.label]));

function FinancePage() {
  const [expenses, setExpenses] = useState<Expense[]>([]);
  const [revenue, setRevenue] = useState(0);
  const [loading, setLoading] = useState(true);
  const [open, setOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({
    expense_date: new Date().toISOString().slice(0, 10),
    category: "fuel",
    description: "",
    amount: "",
  });

  const load = async () => {
    setLoading(true);
    const [{ data: exp }, { data: orders }] = await Promise.all([
      supabase.from("expenses").select("id,expense_date,category,description,amount").order("expense_date", { ascending: false }),
      supabase.from("transport_orders").select("price").eq("status", "delivered"),
    ]);
    setExpenses(exp ?? []);
    setRevenue((orders ?? []).reduce((s: number, r: any) => s + Number(r.price ?? 0), 0));
    setLoading(false);
  };

  useEffect(() => { load(); }, []);

  const onCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    const { data: profile } = await supabase.from("profiles").select("tenant_id").maybeSingle();
    if (!profile?.tenant_id) { toast.error("لا توجد شركة"); setSaving(false); return; }
    const { error } = await supabase.from("expenses").insert({
      tenant_id: profile.tenant_id,
      expense_date: form.expense_date,
      category: form.category,
      description: form.description || null,
      amount: Number(form.amount),
    });
    setSaving(false);
    if (error) return toast.error(error.message);
    toast.success("تمت الإضافة");
    setOpen(false);
    setForm({ expense_date: new Date().toISOString().slice(0, 10), category: "fuel", description: "", amount: "" });
    load();
  };

  const onDelete = async (id: string) => {
    if (!confirm("حذف؟")) return;
    const { error } = await supabase.from("expenses").delete().eq("id", id);
    if (error) toast.error(error.message); else { toast.success("تم الحذف"); load(); }
  };

  const totalExpense = expenses.reduce((s, r) => s + Number(r.amount), 0);
  const net = revenue - totalExpense;
  const margin = revenue > 0 ? (net / revenue) * 100 : 0;

  const byCategory = useMemo(() => {
    const map = new Map<string, number>();
    expenses.forEach((e) => map.set(e.category, (map.get(e.category) ?? 0) + Number(e.amount)));
    return Array.from(map.entries()).sort((a, b) => b[1] - a[1]);
  }, [expenses]);

  return (
    <>
      <PageHeader
        title="الإيرادات والمصروفات"
        subtitle="الإيرادات من الطلبات المسلّمة، المصروفات حسب الفئة، والربحية"
        action={
          <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger asChild>
              <Button className="gap-2 bg-accent text-accent-foreground hover:bg-accent/90"><Plus className="h-4 w-4" /> مصروف جديد</Button>
            </DialogTrigger>
            <DialogContent dir="rtl">
              <DialogHeader><DialogTitle>تسجيل مصروف</DialogTitle></DialogHeader>
              <form onSubmit={onCreate} className="space-y-4">
                <div className="grid grid-cols-2 gap-3">
                  <div><Label>التاريخ *</Label><Input type="date" required value={form.expense_date} onChange={(e) => setForm({ ...form, expense_date: e.target.value })} /></div>
                  <div><Label>المبلغ (MAD) *</Label><Input type="number" step="0.01" required value={form.amount} onChange={(e) => setForm({ ...form, amount: e.target.value })} /></div>
                </div>
                <div>
                  <Label>الفئة *</Label>
                  <Select value={form.category} onValueChange={(v) => setForm({ ...form, category: v })}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>{CATEGORIES.map((c) => <SelectItem key={c.k} value={c.k}>{c.label}</SelectItem>)}</SelectContent>
                  </Select>
                </div>
                <div><Label>الوصف</Label><Input value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} /></div>
                <DialogFooter><Button type="submit" disabled={saving} className="gap-2 bg-accent text-accent-foreground hover:bg-accent/90">{saving && <Loader2 className="h-4 w-4 animate-spin" />} حفظ</Button></DialogFooter>
              </form>
            </DialogContent>
          </Dialog>
        }
      />

      <div className="grid gap-4 md:grid-cols-4">
        <div className="rounded-2xl border border-border bg-card p-6">
          <div className="text-xs text-muted-foreground">الإيرادات</div>
          <div className="mt-2 text-3xl font-black text-success">{(revenue / 1000).toFixed(1)}K</div>
          <div className="mt-2 flex items-center gap-1 text-xs font-semibold text-success"><TrendingUp className="h-3 w-3" /> طلبات مسلّمة</div>
        </div>
        <div className="rounded-2xl border border-border bg-card p-6">
          <div className="text-xs text-muted-foreground">المصروفات</div>
          <div className="mt-2 text-3xl font-black text-destructive">{(totalExpense / 1000).toFixed(1)}K</div>
          <div className="mt-2 flex items-center gap-1 text-xs font-semibold text-destructive"><TrendingDown className="h-3 w-3" /> {expenses.length} عملية</div>
        </div>
        <div className="rounded-2xl border border-border bg-card p-6">
          <div className="text-xs text-muted-foreground">صافي الربح</div>
          <div className={`mt-2 text-3xl font-black ${net >= 0 ? "text-primary" : "text-destructive"}`}>{(net / 1000).toFixed(1)}K</div>
        </div>
        <div className="rounded-2xl border border-border bg-card p-6">
          <div className="text-xs text-muted-foreground">هامش الربحية</div>
          <div className="mt-2 text-3xl font-black text-accent">{margin.toFixed(1)}%</div>
        </div>
      </div>

      <div className="mt-6 grid gap-6 lg:grid-cols-2">
        <div className="rounded-2xl border border-border bg-card p-6">
          <h3 className="mb-4 font-bold text-foreground">توزيع المصروفات</h3>
          {byCategory.length === 0 ? (
            <p className="text-sm text-muted-foreground">لا توجد مصروفات مسجلة بعد.</p>
          ) : (
            <div className="space-y-3">
              {byCategory.map(([cat, val]) => (
                <div key={cat}>
                  <div className="mb-1 flex items-center justify-between text-sm">
                    <span className="font-medium">{CAT_LABEL[cat] ?? cat}</span>
                    <span className="font-bold">{val.toFixed(0)} MAD</span>
                  </div>
                  <div className="h-2 overflow-hidden rounded-full bg-secondary">
                    <div className="h-full bg-accent" style={{ width: `${totalExpense > 0 ? (val / totalExpense) * 100 : 0}%` }} />
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        <div className="rounded-2xl border border-border bg-card p-6">
          <h3 className="mb-4 font-bold text-foreground">آخر المصروفات</h3>
          {loading ? (
            <div className="flex justify-center py-8"><Loader2 className="h-5 w-5 animate-spin text-accent" /></div>
          ) : expenses.length === 0 ? (
            <EmptyState icon={Wallet} title="لا توجد مصروفات" description="ابدأ بتسجيل أول مصروف." />
          ) : (
            <div className="space-y-2">
              {expenses.slice(0, 8).map((e) => (
                <div key={e.id} className="flex items-center justify-between rounded-lg bg-secondary/50 p-3">
                  <div>
                    <div className="text-sm font-semibold">{CAT_LABEL[e.category] ?? e.category}</div>
                    <div className="text-xs text-muted-foreground">{e.description || "—"} · <span dir="ltr">{e.expense_date}</span></div>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="font-bold text-destructive">-{Number(e.amount).toFixed(0)}</span>
                    <Button variant="ghost" size="sm" onClick={() => onDelete(e.id)} className="text-destructive hover:bg-destructive/10 hover:text-destructive"><Trash2 className="h-4 w-4" /></Button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </>
  );
}
