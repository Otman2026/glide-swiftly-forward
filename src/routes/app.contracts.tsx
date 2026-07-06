import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { PageHeader, EmptyState } from "@/components/dashboard-layout";
import { FileText, Plus, Search, Trash2, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle, DialogTrigger,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";

export const Route = createFileRoute("/app/contracts")({ component: ContractsPage });

type Contract = {
  id: string;
  contract_number: string;
  title: string;
  status: "draft" | "active" | "expired" | "cancelled";
  start_date: string | null;
  end_date: string | null;
  value: number | null;
  currency: string | null;
  customer_id: string;
  customers?: { name: string } | null;
};

const STATUS_LABEL: Record<Contract["status"], string> = {
  draft: "مسودة", active: "نشط", expired: "منتهي", cancelled: "ملغى",
};
const STATUS_COLOR: Record<Contract["status"], string> = {
  draft: "bg-muted text-muted-foreground",
  active: "bg-success/10 text-success",
  expired: "bg-warning/10 text-warning-foreground",
  cancelled: "bg-destructive/10 text-destructive",
};

function ContractsPage() {
  const [rows, setRows] = useState<Contract[]>([]);
  const [customers, setCustomers] = useState<{ id: string; name: string }[]>([]);
  const [loading, setLoading] = useState(true);
  const [q, setQ] = useState("");
  const [open, setOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({
    contract_number: "", title: "", customer_id: "", status: "draft",
    start_date: "", end_date: "", value: "", currency: "MAD",
  });

  const load = async () => {
    setLoading(true);
    const [{ data: c, error: e1 }, { data: cust }] = await Promise.all([
      supabase.from("contracts")
        .select("id,contract_number,title,status,start_date,end_date,value,currency,customer_id,customers(name)")
        .order("created_at", { ascending: false }),
      supabase.from("customers").select("id,name").order("name"),
    ]);
    if (e1) toast.error(e1.message);
    else setRows((c ?? []) as unknown as Contract[]);
    setCustomers(cust ?? []);
    setLoading(false);
  };
  useEffect(() => { load(); }, []);

  const onCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.customer_id) return toast.error("اختر عميلاً");
    setSaving(true);
    const { data: profile } = await supabase.from("profiles").select("tenant_id").maybeSingle();
    if (!profile?.tenant_id) { toast.error("لا توجد شركة مرتبطة بحسابك"); setSaving(false); return; }
    const { error } = await supabase.from("contracts").insert({
      tenant_id: profile.tenant_id,
      customer_id: form.customer_id,
      contract_number: form.contract_number,
      title: form.title,
      status: form.status as Contract["status"],
      start_date: form.start_date || null,
      end_date: form.end_date || null,
      value: form.value ? Number(form.value) : null,
      currency: form.currency,
    });
    setSaving(false);
    if (error) return toast.error(error.message);
    toast.success("تم إنشاء العقد");
    setOpen(false);
    setForm({ contract_number: "", title: "", customer_id: "", status: "draft", start_date: "", end_date: "", value: "", currency: "MAD" });
    load();
  };

  const onDelete = async (id: string) => {
    if (!confirm("حذف هذا العقد؟")) return;
    const { error } = await supabase.from("contracts").delete().eq("id", id);
    if (error) toast.error(error.message); else { toast.success("تم الحذف"); load(); }
  };

  const filtered = rows.filter((r) => q ? (r.title + r.contract_number).toLowerCase().includes(q.toLowerCase()) : true);

  return (
    <>
      <PageHeader
        title="العقود"
        subtitle="إدارة عقود العملاء: النشطة، المسودة، المنتهية، مع القيمة المالية"
        action={
          <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger asChild>
              <Button className="gap-2 bg-accent text-accent-foreground hover:bg-accent/90">
                <Plus className="h-4 w-4" /> عقد جديد
              </Button>
            </DialogTrigger>
            <DialogContent dir="rtl">
              <DialogHeader><DialogTitle>إنشاء عقد</DialogTitle></DialogHeader>
              {customers.length === 0 ? (
                <p className="text-sm text-muted-foreground">أضف عميلاً أولاً من شاشة CRM قبل إنشاء عقد.</p>
              ) : (
                <form onSubmit={onCreate} className="space-y-4">
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <Label>رقم العقد *</Label>
                      <Input required dir="ltr" value={form.contract_number}
                        onChange={(e) => setForm({ ...form, contract_number: e.target.value })} />
                    </div>
                    <div>
                      <Label>العميل *</Label>
                      <Select value={form.customer_id} onValueChange={(v) => setForm({ ...form, customer_id: v })}>
                        <SelectTrigger><SelectValue placeholder="اختر عميل" /></SelectTrigger>
                        <SelectContent>
                          {customers.map((c) => <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>)}
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
                  <div>
                    <Label>عنوان العقد *</Label>
                    <Input required value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} />
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <div><Label>تاريخ البداية</Label>
                      <Input type="date" value={form.start_date} onChange={(e) => setForm({ ...form, start_date: e.target.value })} /></div>
                    <div><Label>تاريخ النهاية</Label>
                      <Input type="date" value={form.end_date} onChange={(e) => setForm({ ...form, end_date: e.target.value })} /></div>
                  </div>
                  <div className="grid grid-cols-3 gap-3">
                    <div className="col-span-2"><Label>القيمة</Label>
                      <Input type="number" step="0.01" value={form.value} onChange={(e) => setForm({ ...form, value: e.target.value })} /></div>
                    <div><Label>العملة</Label>
                      <Input value={form.currency} onChange={(e) => setForm({ ...form, currency: e.target.value })} /></div>
                  </div>
                  <div>
                    <Label>الحالة</Label>
                    <Select value={form.status} onValueChange={(v) => setForm({ ...form, status: v })}>
                      <SelectTrigger><SelectValue /></SelectTrigger>
                      <SelectContent>
                        {Object.entries(STATUS_LABEL).map(([k, l]) => <SelectItem key={k} value={k}>{l}</SelectItem>)}
                      </SelectContent>
                    </Select>
                  </div>
                  <DialogFooter>
                    <Button type="submit" disabled={saving} className="gap-2 bg-accent text-accent-foreground hover:bg-accent/90">
                      {saving && <Loader2 className="h-4 w-4 animate-spin" />} حفظ
                    </Button>
                  </DialogFooter>
                </form>
              )}
            </DialogContent>
          </Dialog>
        }
      />

      <div className="mb-4 relative max-w-md">
        <Search className="pointer-events-none absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
        <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="بحث برقم/عنوان العقد..."
          className="h-10 w-full rounded-lg border border-border bg-card pr-10 pl-4 text-sm focus:border-accent focus:outline-none focus:ring-2 focus:ring-accent/20" />
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-16"><Loader2 className="h-6 w-6 animate-spin text-accent" /></div>
      ) : filtered.length === 0 ? (
        <EmptyState icon={FileText} title="لا توجد عقود" description="أنشئ أول عقد مع عملائك من زر (عقد جديد)." />
      ) : (
        <div className="rounded-2xl border border-border bg-card overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-secondary/50 text-xs uppercase text-muted-foreground">
              <tr>
                <th className="p-4 text-right font-semibold">رقم العقد</th>
                <th className="p-4 text-right font-semibold">العنوان</th>
                <th className="p-4 text-right font-semibold">العميل</th>
                <th className="p-4 text-right font-semibold">من</th>
                <th className="p-4 text-right font-semibold">إلى</th>
                <th className="p-4 text-right font-semibold">القيمة</th>
                <th className="p-4 text-right font-semibold">الحالة</th>
                <th className="p-4 text-right font-semibold">إجراءات</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((c) => (
                <tr key={c.id} className="border-t border-border hover:bg-secondary/30">
                  <td className="p-4 font-mono font-semibold text-primary" dir="ltr">{c.contract_number}</td>
                  <td className="p-4 font-semibold">{c.title}</td>
                  <td className="p-4">{c.customers?.name ?? "—"}</td>
                  <td className="p-4" dir="ltr">{c.start_date ?? "—"}</td>
                  <td className="p-4" dir="ltr">{c.end_date ?? "—"}</td>
                  <td className="p-4 font-semibold">{c.value ? `${c.value.toLocaleString()} ${c.currency}` : "—"}</td>
                  <td className="p-4">
                    <span className={`inline-flex rounded-md px-2 py-1 text-xs font-semibold ${STATUS_COLOR[c.status]}`}>
                      {STATUS_LABEL[c.status]}
                    </span>
                  </td>
                  <td className="p-4">
                    <Button variant="ghost" size="sm" onClick={() => onDelete(c.id)}
                      className="text-destructive hover:bg-destructive/10 hover:text-destructive">
                      <Trash2 className="h-4 w-4" />
                    </Button>
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
