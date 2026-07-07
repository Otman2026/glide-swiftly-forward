import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { PageHeader, EmptyState } from "@/components/dashboard-layout";
import { AlertTriangle, Plus, Loader2, Trash2, Pencil, ImageIcon, Printer, Download } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { DocumentsDialog } from "@/components/documents-dialog";
import { exportToCSV } from "@/lib/csv";
import { printHTML, esc } from "@/lib/print";

export const Route = createFileRoute("/app/accidents")({ component: AccidentsPage });

type Row = {
  id: string;
  incident_date: string;
  location: string | null;
  description: string | null;
  severity: string;
  status: string;
  insurance_company: string | null;
  claim_number: string | null;
  repair_cost: number;
  vehicle_id: string | null;
  driver_id: string | null;
  vehicles?: { plate_number: string } | null;
  drivers?: { full_name: string } | null;
};

const SEV: Record<string, { label: string; cls: string }> = {
  minor: { label: "بسيط", cls: "bg-success/10 text-success" },
  moderate: { label: "متوسط", cls: "bg-warning/10 text-warning-foreground" },
  major: { label: "كبير", cls: "bg-destructive/10 text-destructive" },
};
const STAT: Record<string, { label: string; cls: string }> = {
  open: { label: "مفتوح", cls: "bg-accent/10 text-accent" },
  processing: { label: "قيد المعالجة", cls: "bg-warning/10 text-warning-foreground" },
  closed: { label: "مغلق", cls: "bg-success/10 text-success" },
};

const emptyForm = {
  incident_date: new Date().toISOString().slice(0, 10),
  location: "", description: "", severity: "minor", status: "open",
  insurance_company: "", claim_number: "", repair_cost: "", vehicle_id: "", driver_id: "",
};

function AccidentsPage() {
  const [rows, setRows] = useState<Row[]>([]);
  const [vehicles, setVehicles] = useState<{ id: string; plate_number: string }[]>([]);
  const [drivers, setDrivers] = useState<{ id: string; full_name: string }[]>([]);
  const [loading, setLoading] = useState(true);
  const [open, setOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState(emptyForm);
  const [docsFor, setDocsFor] = useState<Row | null>(null);
  const [statusFilter, setStatusFilter] = useState("all");

  const load = async () => {
    setLoading(true);
    const [{ data }, v, d] = await Promise.all([
      supabase.from("incidents").select("id,incident_date,location,description,severity,status,insurance_company,claim_number,repair_cost,vehicle_id,driver_id,vehicles(plate_number),drivers(full_name)").order("incident_date", { ascending: false }),
      supabase.from("vehicles").select("id,plate_number"),
      supabase.from("drivers").select("id,full_name"),
    ]);
    setRows((data as any) ?? []);
    setVehicles(v.data ?? []); setDrivers(d.data ?? []);
    setLoading(false);
  };
  useEffect(() => { load(); }, []);

  const openCreate = () => { setEditingId(null); setForm(emptyForm); setOpen(true); };
  const openEdit = (r: Row) => {
    setEditingId(r.id);
    setForm({
      incident_date: r.incident_date, location: r.location ?? "",
      description: r.description ?? "", severity: r.severity, status: r.status,
      insurance_company: r.insurance_company ?? "", claim_number: r.claim_number ?? "",
      repair_cost: String(r.repair_cost), vehicle_id: r.vehicle_id ?? "", driver_id: r.driver_id ?? "",
    });
    setOpen(true);
  };

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    const payload = {
      incident_date: form.incident_date, location: form.location || null,
      description: form.description || null, severity: form.severity, status: form.status,
      insurance_company: form.insurance_company || null, claim_number: form.claim_number || null,
      repair_cost: Number(form.repair_cost || 0),
      vehicle_id: form.vehicle_id || null, driver_id: form.driver_id || null,
    };
    if (editingId) {
      const { error } = await supabase.from("incidents").update(payload).eq("id", editingId);
      setSaving(false);
      if (error) return toast.error(error.message);
      toast.success("تم التحديث");
    } else {
      const { data: profile } = await supabase.from("profiles").select("tenant_id").maybeSingle();
      if (!profile?.tenant_id) { toast.error("لا توجد شركة"); setSaving(false); return; }
      const { error } = await supabase.from("incidents").insert({ ...payload, tenant_id: profile.tenant_id });
      setSaving(false);
      if (error) return toast.error(error.message);
      toast.success("تم التسجيل");
    }
    setOpen(false); load();
  };

  const onDelete = async (id: string) => {
    if (!confirm("حذف؟")) return;
    const { error } = await supabase.from("incidents").delete().eq("id", id);
    if (error) toast.error(error.message); else { toast.success("تم الحذف"); load(); }
  };

  const filtered = useMemo(() => rows.filter((r) => statusFilter === "all" || r.status === statusFilter), [rows, statusFilter]);
  const counts = {
    total: rows.length,
    open: rows.filter((r) => r.status === "open").length,
    processing: rows.filter((r) => r.status === "processing").length,
    cost: rows.reduce((s, r) => s + Number(r.repair_cost), 0),
  };

  const onExport = () => {
    exportToCSV(filtered, [
      { key: "incident_date", label: "التاريخ" },
      { key: "vehicle", label: "الشاحنة", get: (r) => r.vehicles?.plate_number ?? "" },
      { key: "driver", label: "السائق", get: (r) => r.drivers?.full_name ?? "" },
      { key: "location", label: "المكان" },
      { key: "severity", label: "الخطورة", get: (r) => SEV[r.severity]?.label ?? r.severity },
      { key: "insurance_company", label: "التأمين" },
      { key: "claim_number", label: "رقم الملف" },
      { key: "repair_cost", label: "تكلفة الإصلاح" },
      { key: "status", label: "الحالة", get: (r) => STAT[r.status]?.label ?? r.status },
    ], `incidents-${new Date().toISOString().slice(0, 10)}`);
  };

  const onPrint = () => {
    const body = `<h1>تقرير الحوادث</h1><h2>${filtered.length} حادث · إجمالي التكلفة ${counts.cost.toFixed(0)} MAD</h2>
      <table><thead><tr><th>التاريخ</th><th>الشاحنة</th><th>السائق</th><th>المكان</th><th>الخطورة</th><th>التأمين</th><th>التكلفة</th><th>الحالة</th></tr></thead>
      <tbody>${filtered.map((r) => `<tr><td>${esc(r.incident_date)}</td><td>${esc(r.vehicles?.plate_number)}</td><td>${esc(r.drivers?.full_name)}</td><td>${esc(r.location)}</td><td>${esc(SEV[r.severity]?.label)}</td><td>${esc(r.insurance_company)}</td><td>${Number(r.repair_cost).toFixed(0)}</td><td>${esc(STAT[r.status]?.label)}</td></tr>`).join("")}</tbody></table>`;
    printHTML("تقرير الحوادث", body);
  };

  return (
    <>
      <PageHeader
        title="إدارة الحوادث"
        subtitle="تسجيل الحوادث مع الصور والوثائق والتأمين"
        action={
          <div className="flex gap-2">
            <Button variant="outline" onClick={onExport} className="gap-2"><Download className="h-4 w-4" /> تصدير</Button>
            <Button variant="outline" onClick={onPrint} className="gap-2"><Printer className="h-4 w-4" /> طباعة</Button>
            <Button onClick={openCreate} className="gap-2 bg-accent text-accent-foreground hover:bg-accent/90"><Plus className="h-4 w-4" /> تسجيل حادث</Button>
          </div>
        }
      />

      <div className="mb-4 grid gap-3 md:grid-cols-4">
        <Card label="إجمالي الحوادث" value={counts.total} />
        <Card label="مفتوحة" value={counts.open} tone="accent" />
        <Card label="قيد المعالجة" value={counts.processing} tone="warning" />
        <Card label="تكلفة الإصلاح" value={`${counts.cost.toFixed(0)} MAD`} tone="destructive" />
      </div>

      <div className="mb-4">
        <Select value={statusFilter} onValueChange={setStatusFilter}>
          <SelectTrigger className="w-48"><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">جميع الحالات</SelectItem>
            {Object.entries(STAT).map(([k, v]) => <SelectItem key={k} value={k}>{v.label}</SelectItem>)}
          </SelectContent>
        </Select>
      </div>

      {loading ? (
        <div className="flex justify-center py-16"><Loader2 className="h-6 w-6 animate-spin text-accent" /></div>
      ) : filtered.length === 0 ? (
        <EmptyState icon={AlertTriangle} title="لا توجد حوادث مسجلة" description="سجل الحوادث لتتبعها مع شركة التأمين." />
      ) : (
        <div className="rounded-2xl border border-border bg-card overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-secondary/50 text-xs uppercase text-muted-foreground">
              <tr>
                <th className="p-4 text-right">التاريخ</th>
                <th className="p-4 text-right">الشاحنة</th>
                <th className="p-4 text-right">السائق</th>
                <th className="p-4 text-right">المكان</th>
                <th className="p-4 text-right">الخطورة</th>
                <th className="p-4 text-right">التأمين</th>
                <th className="p-4 text-right">التكلفة</th>
                <th className="p-4 text-right">الحالة</th>
                <th className="p-4 text-right">إجراءات</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((r) => {
                const s = STAT[r.status] ?? { label: r.status, cls: "bg-secondary" };
                const sv = SEV[r.severity] ?? { label: r.severity, cls: "bg-secondary" };
                return (
                  <tr key={r.id} className="border-t border-border hover:bg-secondary/30">
                    <td className="p-4" dir="ltr">{r.incident_date}</td>
                    <td className="p-4 font-semibold" dir="ltr">{r.vehicles?.plate_number ?? "—"}</td>
                    <td className="p-4">{r.drivers?.full_name ?? "—"}</td>
                    <td className="p-4">{r.location ?? "—"}</td>
                    <td className="p-4"><span className={`rounded-full px-2 py-1 text-xs font-semibold ${sv.cls}`}>{sv.label}</span></td>
                    <td className="p-4 text-xs">{r.insurance_company ?? "—"}</td>
                    <td className="p-4 font-semibold">{Number(r.repair_cost).toFixed(0)}</td>
                    <td className="p-4"><span className={`rounded-full px-2 py-1 text-xs font-semibold ${s.cls}`}>{s.label}</span></td>
                    <td className="p-4">
                      <div className="flex gap-1">
                        <Button variant="ghost" size="sm" title="تعديل" onClick={() => openEdit(r)}><Pencil className="h-4 w-4" /></Button>
                        <Button variant="ghost" size="sm" title="الصور والوثائق" onClick={() => setDocsFor(r)}><ImageIcon className="h-4 w-4" /></Button>
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

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent dir="rtl" className="max-h-[90vh] overflow-y-auto">
          <DialogHeader><DialogTitle>{editingId ? "تعديل حادث" : "تسجيل حادث جديد"}</DialogTitle></DialogHeader>
          <form onSubmit={onSubmit} className="space-y-4">
            <div className="grid grid-cols-2 gap-3">
              <div><Label>التاريخ *</Label><Input type="date" required value={form.incident_date} onChange={(e) => setForm({ ...form, incident_date: e.target.value })} /></div>
              <div><Label>المكان</Label><Input value={form.location} onChange={(e) => setForm({ ...form, location: e.target.value })} /></div>
            </div>
            <div><Label>وصف الحادث</Label><Textarea rows={3} value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} /></div>
            <div className="grid grid-cols-2 gap-3">
              <div><Label>الشاحنة</Label>
                <Select value={form.vehicle_id} onValueChange={(v) => setForm({ ...form, vehicle_id: v })}>
                  <SelectTrigger><SelectValue placeholder="اختر..." /></SelectTrigger>
                  <SelectContent>{vehicles.map((v) => <SelectItem key={v.id} value={v.id}>{v.plate_number}</SelectItem>)}</SelectContent>
                </Select>
              </div>
              <div><Label>السائق</Label>
                <Select value={form.driver_id} onValueChange={(v) => setForm({ ...form, driver_id: v })}>
                  <SelectTrigger><SelectValue placeholder="اختر..." /></SelectTrigger>
                  <SelectContent>{drivers.map((d) => <SelectItem key={d.id} value={d.id}>{d.full_name}</SelectItem>)}</SelectContent>
                </Select>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div><Label>الخطورة</Label>
                <Select value={form.severity} onValueChange={(v) => setForm({ ...form, severity: v })}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>{Object.entries(SEV).map(([k, v]) => <SelectItem key={k} value={k}>{v.label}</SelectItem>)}</SelectContent>
                </Select>
              </div>
              <div><Label>الحالة</Label>
                <Select value={form.status} onValueChange={(v) => setForm({ ...form, status: v })}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>{Object.entries(STAT).map(([k, v]) => <SelectItem key={k} value={k}>{v.label}</SelectItem>)}</SelectContent>
                </Select>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div><Label>شركة التأمين</Label><Input value={form.insurance_company} onChange={(e) => setForm({ ...form, insurance_company: e.target.value })} /></div>
              <div><Label>رقم الملف</Label><Input value={form.claim_number} onChange={(e) => setForm({ ...form, claim_number: e.target.value })} /></div>
            </div>
            <div><Label>تكلفة الإصلاح (MAD)</Label><Input type="number" step="0.01" value={form.repair_cost} onChange={(e) => setForm({ ...form, repair_cost: e.target.value })} /></div>
            <DialogFooter>
              <Button type="submit" disabled={saving} className="gap-2 bg-accent text-accent-foreground hover:bg-accent/90">
                {saving && <Loader2 className="h-4 w-4 animate-spin" />} حفظ
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {docsFor && (
        <DocumentsDialog open={!!docsFor} onOpenChange={(o) => !o && setDocsFor(null)}
          scope="incident_id" refId={docsFor.id}
          entityLabel={`حادث ${docsFor.incident_date} — ${docsFor.vehicles?.plate_number ?? ""}`} />
      )}
    </>
  );
}

function Card({ label, value, tone }: { label: string; value: string | number; tone?: "accent" | "warning" | "destructive" }) {
  const cls = tone === "accent" ? "text-accent" : tone === "warning" ? "text-warning-foreground" : tone === "destructive" ? "text-destructive" : "";
  return (
    <div className="rounded-xl border border-border bg-card p-4">
      <div className="text-xs text-muted-foreground">{label}</div>
      <div className={`mt-1 text-2xl font-black ${cls}`}>{value}</div>
    </div>
  );
}
