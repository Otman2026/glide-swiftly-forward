import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { PageHeader, EmptyState } from "@/components/dashboard-layout";
import { UserCog, Plus, Search, Trash2, Loader2 } from "lucide-react";
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

export const Route = createFileRoute("/app/drivers")({ component: DriversPage });

type Driver = {
  id: string;
  full_name: string;
  phone: string | null;
  license_number: string | null;
  license_expiry: string | null;
  status: "active" | "on_leave" | "inactive";
};

const STATUS_LABEL: Record<Driver["status"], string> = {
  active: "نشط", on_leave: "في إجازة", inactive: "غير نشط",
};
const STATUS_COLOR: Record<Driver["status"], string> = {
  active: "bg-success/10 text-success",
  on_leave: "bg-warning/10 text-warning-foreground",
  inactive: "bg-muted text-muted-foreground",
};

function DriversPage() {
  const [rows, setRows] = useState<Driver[]>([]);
  const [loading, setLoading] = useState(true);
  const [q, setQ] = useState("");
  const [open, setOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({
    full_name: "", phone: "", license_number: "", license_expiry: "", status: "active",
  });

  const load = async () => {
    setLoading(true);
    const { data, error } = await supabase.from("drivers")
      .select("id,full_name,phone,license_number,license_expiry,status")
      .order("created_at", { ascending: false });
    if (error) toast.error(error.message); else setRows((data ?? []) as Driver[]);
    setLoading(false);
  };
  useEffect(() => { load(); }, []);

  const onCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    const { data: profile } = await supabase.from("profiles").select("tenant_id").maybeSingle();
    if (!profile?.tenant_id) { toast.error("لا توجد شركة مرتبطة بحسابك"); setSaving(false); return; }
    const { error } = await supabase.from("drivers").insert({
      tenant_id: profile.tenant_id,
      full_name: form.full_name,
      phone: form.phone || null,
      license_number: form.license_number || null,
      license_expiry: form.license_expiry || null,
      status: form.status as Driver["status"],
    });
    setSaving(false);
    if (error) return toast.error(error.message);
    toast.success("تمت إضافة السائق");
    setOpen(false);
    setForm({ full_name: "", phone: "", license_number: "", license_expiry: "", status: "active" });
    load();
  };

  const onDelete = async (id: string) => {
    if (!confirm("حذف هذا السائق؟")) return;
    const { error } = await supabase.from("drivers").delete().eq("id", id);
    if (error) toast.error(error.message); else { toast.success("تم الحذف"); load(); }
  };

  const filtered = rows.filter((r) => q ? r.full_name.toLowerCase().includes(q.toLowerCase()) : true);

  return (
    <>
      <PageHeader
        title="السائقون"
        subtitle="ملفات السائقين، الرخص، تواريخ الانتهاء، والحالة التشغيلية"
        action={
          <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger asChild>
              <Button className="gap-2 bg-accent text-accent-foreground hover:bg-accent/90">
                <Plus className="h-4 w-4" /> سائق جديد
              </Button>
            </DialogTrigger>
            <DialogContent dir="rtl">
              <DialogHeader><DialogTitle>إضافة سائق</DialogTitle></DialogHeader>
              <form onSubmit={onCreate} className="space-y-4">
                <div>
                  <Label>الاسم الكامل *</Label>
                  <Input required value={form.full_name} onChange={(e) => setForm({ ...form, full_name: e.target.value })} />
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div><Label>الهاتف</Label>
                    <Input dir="ltr" value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} /></div>
                  <div><Label>رقم الرخصة</Label>
                    <Input dir="ltr" value={form.license_number} onChange={(e) => setForm({ ...form, license_number: e.target.value })} /></div>
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div><Label>تاريخ انتهاء الرخصة</Label>
                    <Input type="date" value={form.license_expiry} onChange={(e) => setForm({ ...form, license_expiry: e.target.value })} /></div>
                  <div>
                    <Label>الحالة</Label>
                    <Select value={form.status} onValueChange={(v) => setForm({ ...form, status: v })}>
                      <SelectTrigger><SelectValue /></SelectTrigger>
                      <SelectContent>
                        {Object.entries(STATUS_LABEL).map(([k, l]) => (
                          <SelectItem key={k} value={k}>{l}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>
                <DialogFooter>
                  <Button type="submit" disabled={saving} className="gap-2 bg-accent text-accent-foreground hover:bg-accent/90">
                    {saving && <Loader2 className="h-4 w-4 animate-spin" />} حفظ
                  </Button>
                </DialogFooter>
              </form>
            </DialogContent>
          </Dialog>
        }
      />

      <div className="mb-4 relative max-w-md">
        <Search className="pointer-events-none absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
        <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="بحث بالاسم..."
          className="h-10 w-full rounded-lg border border-border bg-card pr-10 pl-4 text-sm focus:border-accent focus:outline-none focus:ring-2 focus:ring-accent/20" />
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-16"><Loader2 className="h-6 w-6 animate-spin text-accent" /></div>
      ) : filtered.length === 0 ? (
        <EmptyState icon={UserCog} title="لا يوجد سائقون" description="أضف أول سائق لبدء تعيينه على الرحلات والشحنات." />
      ) : (
        <div className="rounded-2xl border border-border bg-card overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-secondary/50 text-xs uppercase text-muted-foreground">
              <tr>
                <th className="p-4 text-right font-semibold">الاسم</th>
                <th className="p-4 text-right font-semibold">الهاتف</th>
                <th className="p-4 text-right font-semibold">رقم الرخصة</th>
                <th className="p-4 text-right font-semibold">انتهاء الرخصة</th>
                <th className="p-4 text-right font-semibold">الحالة</th>
                <th className="p-4 text-right font-semibold">إجراءات</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((d) => (
                <tr key={d.id} className="border-t border-border hover:bg-secondary/30">
                  <td className="p-4 font-semibold">{d.full_name}</td>
                  <td className="p-4 text-muted-foreground" dir="ltr">{d.phone ?? "—"}</td>
                  <td className="p-4 font-mono text-xs">{d.license_number ?? "—"}</td>
                  <td className="p-4" dir="ltr">{d.license_expiry ?? "—"}</td>
                  <td className="p-4">
                    <span className={`inline-flex rounded-md px-2 py-1 text-xs font-semibold ${STATUS_COLOR[d.status]}`}>
                      {STATUS_LABEL[d.status]}
                    </span>
                  </td>
                  <td className="p-4">
                    <Button variant="ghost" size="sm" onClick={() => onDelete(d.id)}
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
