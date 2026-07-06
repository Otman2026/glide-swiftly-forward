import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { PageHeader, EmptyState } from "@/components/dashboard-layout";
import { Users, Plus, Search, Trash2, Loader2 } from "lucide-react";
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
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";

export const Route = createFileRoute("/app/customers")({
  component: CustomersPage,
});

type Customer = {
  id: string;
  name: string;
  email: string | null;
  phone: string | null;
  city: string | null;
  country: string | null;
  tax_id: string | null;
  created_at: string;
};

function CustomersPage() {
  const [rows, setRows] = useState<Customer[]>([]);
  const [loading, setLoading] = useState(true);
  const [q, setQ] = useState("");
  const [open, setOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({
    name: "",
    email: "",
    phone: "",
    city: "",
    country: "المغرب",
    tax_id: "",
  });

  const load = async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from("customers")
      .select("id,name,email,phone,city,country,tax_id,created_at")
      .order("created_at", { ascending: false });
    if (error) toast.error(error.message);
    else setRows(data ?? []);
    setLoading(false);
  };

  useEffect(() => {
    load();
  }, []);

  const onCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    const { data: profile } = await supabase
      .from("profiles")
      .select("tenant_id")
      .maybeSingle();
    if (!profile?.tenant_id) {
      toast.error("لا توجد شركة مرتبطة بحسابك");
      setSaving(false);
      return;
    }
    const { error } = await supabase.from("customers").insert({
      tenant_id: profile.tenant_id,
      name: form.name,
      email: form.email || null,
      phone: form.phone || null,
      city: form.city || null,
      country: form.country || null,
      tax_id: form.tax_id || null,
    });
    setSaving(false);
    if (error) {
      toast.error(error.message);
      return;
    }
    toast.success("تم إضافة العميل");
    setOpen(false);
    setForm({ name: "", email: "", phone: "", city: "", country: "المغرب", tax_id: "" });
    load();
  };

  const onDelete = async (id: string) => {
    if (!confirm("حذف هذا العميل؟")) return;
    const { error } = await supabase.from("customers").delete().eq("id", id);
    if (error) toast.error(error.message);
    else {
      toast.success("تم الحذف");
      load();
    }
  };

  const filtered = rows.filter((r) =>
    q ? r.name.toLowerCase().includes(q.toLowerCase()) : true,
  );

  return (
    <>
      <PageHeader
        title="إدارة العملاء (CRM)"
        subtitle="ملفات عملاء متكاملة مع سجل تعاملات، عقود، فواتير، ووثائق"
        action={
          <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger asChild>
              <Button className="gap-2 bg-accent text-accent-foreground hover:bg-accent/90">
                <Plus className="h-4 w-4" />
                عميل جديد
              </Button>
            </DialogTrigger>
            <DialogContent dir="rtl">
              <DialogHeader>
                <DialogTitle>إضافة عميل جديد</DialogTitle>
              </DialogHeader>
              <form onSubmit={onCreate} className="space-y-4">
                <div>
                  <Label>اسم العميل / الشركة *</Label>
                  <Input
                    required
                    value={form.name}
                    onChange={(e) => setForm({ ...form, name: e.target.value })}
                  />
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <Label>البريد الإلكتروني</Label>
                    <Input
                      type="email"
                      dir="ltr"
                      value={form.email}
                      onChange={(e) => setForm({ ...form, email: e.target.value })}
                    />
                  </div>
                  <div>
                    <Label>الهاتف</Label>
                    <Input
                      dir="ltr"
                      value={form.phone}
                      onChange={(e) => setForm({ ...form, phone: e.target.value })}
                    />
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <Label>المدينة</Label>
                    <Input
                      value={form.city}
                      onChange={(e) => setForm({ ...form, city: e.target.value })}
                    />
                  </div>
                  <div>
                    <Label>البلد</Label>
                    <Input
                      value={form.country}
                      onChange={(e) => setForm({ ...form, country: e.target.value })}
                    />
                  </div>
                </div>
                <div>
                  <Label>الرقم الضريبي / ICE</Label>
                  <Input
                    dir="ltr"
                    value={form.tax_id}
                    onChange={(e) => setForm({ ...form, tax_id: e.target.value })}
                  />
                </div>
                <DialogFooter>
                  <Button type="submit" disabled={saving} className="gap-2 bg-accent text-accent-foreground hover:bg-accent/90">
                    {saving && <Loader2 className="h-4 w-4 animate-spin" />}
                    حفظ
                  </Button>
                </DialogFooter>
              </form>
            </DialogContent>
          </Dialog>
        }
      />

      <div className="mb-4 flex flex-wrap items-center gap-3">
        <div className="relative flex-1 min-w-64">
          <Search className="pointer-events-none absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <input
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="بحث عن عميل..."
            className="h-10 w-full rounded-lg border border-border bg-card pr-10 pl-4 text-sm focus:border-accent focus:outline-none focus:ring-2 focus:ring-accent/20"
          />
        </div>
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-16">
          <Loader2 className="h-6 w-6 animate-spin text-accent" />
        </div>
      ) : filtered.length === 0 ? (
        <EmptyState
          icon={Users}
          title="لا يوجد عملاء بعد"
          description="ابدأ بإضافة أول عميل لشركتك من زر (عميل جديد)."
        />
      ) : (
        <div className="rounded-2xl border border-border bg-card">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-secondary/50 text-xs uppercase text-muted-foreground">
                <tr>
                  <th className="p-4 text-right font-semibold">الاسم</th>
                  <th className="p-4 text-right font-semibold">الهاتف</th>
                  <th className="p-4 text-right font-semibold">البريد</th>
                  <th className="p-4 text-right font-semibold">المدينة</th>
                  <th className="p-4 text-right font-semibold">الرقم الضريبي</th>
                  <th className="p-4 text-right font-semibold">إجراءات</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map((c) => (
                  <tr key={c.id} className="border-t border-border hover:bg-secondary/30">
                    <td className="p-4 font-semibold">{c.name}</td>
                    <td className="p-4 text-muted-foreground" dir="ltr">{c.phone ?? "—"}</td>
                    <td className="p-4 text-muted-foreground" dir="ltr">{c.email ?? "—"}</td>
                    <td className="p-4">{c.city ?? "—"}</td>
                    <td className="p-4 font-mono text-xs">{c.tax_id ?? "—"}</td>
                    <td className="p-4">
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => onDelete(c.id)}
                        className="text-destructive hover:bg-destructive/10 hover:text-destructive"
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </>
  );
}
