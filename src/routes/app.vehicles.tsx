import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { PageHeader, EmptyState } from "@/components/dashboard-layout";
import { Truck, Plus, Search, Trash2, Loader2 } from "lucide-react";
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

export const Route = createFileRoute("/app/vehicles")({ component: VehiclesPage });

type Vehicle = {
  id: string;
  plate_number: string;
  brand: string | null;
  model: string | null;
  year: number | null;
  type: string | null;
  capacity_tons: number | null;
  status: "available" | "in_use" | "maintenance" | "out_of_service";
};

const STATUS_LABEL: Record<Vehicle["status"], string> = {
  available: "متاح",
  in_use: "قيد الاستخدام",
  maintenance: "صيانة",
  out_of_service: "خارج الخدمة",
};

const STATUS_COLOR: Record<Vehicle["status"], string> = {
  available: "bg-success/10 text-success",
  in_use: "bg-accent/10 text-accent",
  maintenance: "bg-warning/10 text-warning-foreground",
  out_of_service: "bg-destructive/10 text-destructive",
};

function VehiclesPage() {
  const [rows, setRows] = useState<Vehicle[]>([]);
  const [loading, setLoading] = useState(true);
  const [q, setQ] = useState("");
  const [open, setOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({
    plate_number: "", brand: "", model: "", year: "", type: "شاحنة", capacity_tons: "", status: "available",
  });

  const load = async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from("vehicles")
      .select("id,plate_number,brand,model,year,type,capacity_tons,status")
      .order("created_at", { ascending: false });
    if (error) toast.error(error.message);
    else setRows((data ?? []) as Vehicle[]);
    setLoading(false);
  };
  useEffect(() => { load(); }, []);

  const onCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    const { data: profile } = await supabase.from("profiles").select("tenant_id").maybeSingle();
    if (!profile?.tenant_id) { toast.error("لا توجد شركة مرتبطة بحسابك"); setSaving(false); return; }
    const { error } = await supabase.from("vehicles").insert({
      tenant_id: profile.tenant_id,
      plate_number: form.plate_number,
      brand: form.brand || null,
      model: form.model || null,
      year: form.year ? Number(form.year) : null,
      type: form.type || null,
      capacity_tons: form.capacity_tons ? Number(form.capacity_tons) : null,
      status: form.status as Vehicle["status"],
    });
    setSaving(false);
    if (error) return toast.error(error.message);
    toast.success("تمت إضافة المركبة");
    setOpen(false);
    setForm({ plate_number: "", brand: "", model: "", year: "", type: "شاحنة", capacity_tons: "", status: "available" });
    load();
  };

  const onDelete = async (id: string) => {
    if (!confirm("حذف هذه المركبة؟")) return;
    const { error } = await supabase.from("vehicles").delete().eq("id", id);
    if (error) toast.error(error.message); else { toast.success("تم الحذف"); load(); }
  };

  const filtered = rows.filter((r) => q ? r.plate_number.toLowerCase().includes(q.toLowerCase()) : true);

  return (
    <>
      <PageHeader
        title="أسطول المركبات (FMS)"
        subtitle="إدارة شاملة لكل مركبات الأسطول: الحالة، السعة، الوثائق، التأمين والفحص"
        action={
          <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger asChild>
              <Button className="gap-2 bg-accent text-accent-foreground hover:bg-accent/90">
                <Plus className="h-4 w-4" /> مركبة جديدة
              </Button>
            </DialogTrigger>
            <DialogContent dir="rtl">
              <DialogHeader><DialogTitle>إضافة مركبة</DialogTitle></DialogHeader>
              <form onSubmit={onCreate} className="space-y-4">
                <div>
                  <Label>لوحة الترقيم *</Label>
                  <Input required dir="ltr" value={form.plate_number}
                    onChange={(e) => setForm({ ...form, plate_number: e.target.value })} />
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div><Label>الماركة</Label>
                    <Input value={form.brand} onChange={(e) => setForm({ ...form, brand: e.target.value })} /></div>
                  <div><Label>الموديل</Label>
                    <Input value={form.model} onChange={(e) => setForm({ ...form, model: e.target.value })} /></div>
                </div>
                <div className="grid grid-cols-3 gap-3">
                  <div><Label>السنة</Label>
                    <Input type="number" value={form.year} onChange={(e) => setForm({ ...form, year: e.target.value })} /></div>
                  <div><Label>النوع</Label>
                    <Input value={form.type} onChange={(e) => setForm({ ...form, type: e.target.value })} /></div>
                  <div><Label>الحمولة (طن)</Label>
                    <Input type="number" step="0.1" value={form.capacity_tons}
                      onChange={(e) => setForm({ ...form, capacity_tons: e.target.value })} /></div>
                </div>
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
        <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="بحث بلوحة الترقيم..."
          className="h-10 w-full rounded-lg border border-border bg-card pr-10 pl-4 text-sm focus:border-accent focus:outline-none focus:ring-2 focus:ring-accent/20" />
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-16"><Loader2 className="h-6 w-6 animate-spin text-accent" /></div>
      ) : filtered.length === 0 ? (
        <EmptyState icon={Truck} title="لا توجد مركبات" description="أضف أول مركبة إلى الأسطول لبدء إدارة عملياتك." />
      ) : (
        <div className="rounded-2xl border border-border bg-card overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-secondary/50 text-xs uppercase text-muted-foreground">
              <tr>
                <th className="p-4 text-right font-semibold">اللوحة</th>
                <th className="p-4 text-right font-semibold">الماركة/الموديل</th>
                <th className="p-4 text-right font-semibold">السنة</th>
                <th className="p-4 text-right font-semibold">النوع</th>
                <th className="p-4 text-right font-semibold">الحمولة</th>
                <th className="p-4 text-right font-semibold">الحالة</th>
                <th className="p-4 text-right font-semibold">إجراءات</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((v) => (
                <tr key={v.id} className="border-t border-border hover:bg-secondary/30">
                  <td className="p-4 font-mono font-bold text-primary" dir="ltr">{v.plate_number}</td>
                  <td className="p-4">{[v.brand, v.model].filter(Boolean).join(" ") || "—"}</td>
                  <td className="p-4">{v.year ?? "—"}</td>
                  <td className="p-4">{v.type ?? "—"}</td>
                  <td className="p-4">{v.capacity_tons ? `${v.capacity_tons} طن` : "—"}</td>
                  <td className="p-4">
                    <span className={`inline-flex rounded-md px-2 py-1 text-xs font-semibold ${STATUS_COLOR[v.status]}`}>
                      {STATUS_LABEL[v.status]}
                    </span>
                  </td>
                  <td className="p-4">
                    <Button variant="ghost" size="sm" onClick={() => onDelete(v.id)}
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
