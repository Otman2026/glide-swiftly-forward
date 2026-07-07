import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { PageHeader, EmptyState } from "@/components/dashboard-layout";
import { Truck, Plus, Search, Loader2, Pencil, Archive, ArchiveRestore, FileText, Wrench, AlertTriangle, Download, Printer } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { DocumentsDialog } from "@/components/documents-dialog";
import { exportToCSV } from "@/lib/csv";
import { printHTML, esc } from "@/lib/print";

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
  archived_at: string | null;
};

const STATUS_LABEL: Record<Vehicle["status"], string> = {
  available: "متاح", in_use: "قيد الاستخدام", maintenance: "صيانة", out_of_service: "خارج الخدمة",
};
const STATUS_COLOR: Record<Vehicle["status"], string> = {
  available: "bg-success/10 text-success",
  in_use: "bg-accent/10 text-accent",
  maintenance: "bg-warning/10 text-warning-foreground",
  out_of_service: "bg-destructive/10 text-destructive",
};

const emptyForm = { plate_number: "", brand: "", model: "", year: "", type: "شاحنة", capacity_tons: "", status: "available" };

function VehiclesPage() {
  const [rows, setRows] = useState<Vehicle[]>([]);
  const [loading, setLoading] = useState(true);
  const [q, setQ] = useState("");
  const [showArchived, setShowArchived] = useState(false);
  const [typeFilter, setTypeFilter] = useState("all");
  const [open, setOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState(emptyForm);

  const [docsFor, setDocsFor] = useState<Vehicle | null>(null);
  const [quickMaint, setQuickMaint] = useState<Vehicle | null>(null);
  const [quickIncident, setQuickIncident] = useState<Vehicle | null>(null);

  const load = async () => {
    setLoading(true);
    const { data, error } = await supabase.from("vehicles")
      .select("id,plate_number,brand,model,year,type,capacity_tons,status,archived_at")
      .order("created_at", { ascending: false });
    if (error) toast.error(error.message); else setRows((data ?? []) as Vehicle[]);
    setLoading(false);
  };
  useEffect(() => { load(); }, []);

  const openCreate = () => { setEditingId(null); setForm(emptyForm); setOpen(true); };
  const openEdit = (v: Vehicle) => {
    setEditingId(v.id);
    setForm({
      plate_number: v.plate_number, brand: v.brand ?? "", model: v.model ?? "",
      year: v.year?.toString() ?? "", type: v.type ?? "شاحنة",
      capacity_tons: v.capacity_tons?.toString() ?? "", status: v.status,
    });
    setOpen(true);
  };

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    const payload = {
      plate_number: form.plate_number,
      brand: form.brand || null,
      model: form.model || null,
      year: form.year ? Number(form.year) : null,
      type: form.type || null,
      capacity_tons: form.capacity_tons ? Number(form.capacity_tons) : null,
      status: form.status as Vehicle["status"],
    };
    if (editingId) {
      const { error } = await supabase.from("vehicles").update(payload).eq("id", editingId);
      setSaving(false);
      if (error) return toast.error(error.message);
      toast.success("تم التحديث");
    } else {
      const { data: profile } = await supabase.from("profiles").select("tenant_id").maybeSingle();
      if (!profile?.tenant_id) { toast.error("لا توجد شركة"); setSaving(false); return; }
      const { error } = await supabase.from("vehicles").insert({ ...payload, tenant_id: profile.tenant_id });
      setSaving(false);
      if (error) return toast.error(error.message);
      toast.success("تمت الإضافة");
    }
    setOpen(false); load();
  };

  const onArchive = async (v: Vehicle) => {
    const val = v.archived_at ? null : new Date().toISOString();
    const { error } = await supabase.from("vehicles").update({ archived_at: val }).eq("id", v.id);
    if (error) toast.error(error.message); else { toast.success(v.archived_at ? "تم استرجاعها" : "تمت أرشفتها"); load(); }
  };

  const filtered = useMemo(() => rows.filter((r) => {
    if (!showArchived && r.archived_at) return false;
    if (showArchived && !r.archived_at) return false;
    if (typeFilter !== "all" && r.type !== typeFilter) return false;
    if (q && !`${r.plate_number} ${r.brand ?? ""} ${r.model ?? ""}`.toLowerCase().includes(q.toLowerCase())) return false;
    return true;
  }), [rows, q, showArchived, typeFilter]);

  const types = Array.from(new Set(rows.map((r) => r.type).filter(Boolean))) as string[];

  const onExport = () => {
    exportToCSV(filtered, [
      { key: "plate_number", label: "اللوحة" },
      { key: "brand", label: "الماركة" },
      { key: "model", label: "الموديل" },
      { key: "year", label: "السنة" },
      { key: "type", label: "النوع" },
      { key: "capacity_tons", label: "الحمولة (طن)" },
      { key: "status", label: "الحالة", get: (r) => STATUS_LABEL[r.status] },
    ], `vehicles-${new Date().toISOString().slice(0, 10)}`);
  };

  const onPrint = () => {
    const body = `<h1>قائمة أسطول المركبات</h1><h2>${filtered.length} مركبة</h2>
      <table><thead><tr><th>اللوحة</th><th>الماركة/الموديل</th><th>السنة</th><th>النوع</th><th>الحمولة</th><th>الحالة</th></tr></thead>
      <tbody>${filtered.map((r) => `<tr><td>${esc(r.plate_number)}</td><td>${esc([r.brand, r.model].filter(Boolean).join(" "))}</td><td>${esc(r.year)}</td><td>${esc(r.type)}</td><td>${esc(r.capacity_tons)}</td><td>${esc(STATUS_LABEL[r.status])}</td></tr>`).join("")}</tbody></table>`;
    printHTML("قائمة المركبات", body);
  };

  return (
    <>
      <PageHeader
        title="أسطول المركبات (FMS)"
        subtitle="شاحنات، جرارات، مقطورات، حاويات، مركبات خفيفة — إدارة كاملة"
        action={
          <div className="flex gap-2">
            <Button variant="outline" onClick={onExport} className="gap-2"><Download className="h-4 w-4" /> تصدير</Button>
            <Button variant="outline" onClick={onPrint} className="gap-2"><Printer className="h-4 w-4" /> طباعة</Button>
            <Button onClick={openCreate} className="gap-2 bg-accent text-accent-foreground hover:bg-accent/90"><Plus className="h-4 w-4" /> مركبة جديدة</Button>
          </div>
        }
      />

      <div className="mb-4 flex flex-wrap gap-3 items-center">
        <div className="relative flex-1 min-w-[240px] max-w-md">
          <Search className="pointer-events-none absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="بحث..."
            className="h-10 w-full rounded-lg border border-border bg-card pr-10 pl-4 text-sm focus:border-accent focus:outline-none focus:ring-2 focus:ring-accent/20" />
        </div>
        <Select value={typeFilter} onValueChange={setTypeFilter}>
          <SelectTrigger className="w-48"><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">جميع الأنواع</SelectItem>
            {types.map((t) => <SelectItem key={t} value={t}>{t}</SelectItem>)}
          </SelectContent>
        </Select>
        <Button variant={showArchived ? "default" : "outline"} onClick={() => setShowArchived(!showArchived)} className="gap-2">
          <Archive className="h-4 w-4" /> {showArchived ? "عرض النشطة" : "عرض المؤرشفة"}
        </Button>
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-16"><Loader2 className="h-6 w-6 animate-spin text-accent" /></div>
      ) : filtered.length === 0 ? (
        <EmptyState icon={Truck} title="لا توجد مركبات" description="أضف أول مركبة إلى الأسطول." />
      ) : (
        <div className="rounded-2xl border border-border bg-card overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-secondary/50 text-xs uppercase text-muted-foreground">
              <tr>
                <th className="p-4 text-right">اللوحة</th>
                <th className="p-4 text-right">الماركة/الموديل</th>
                <th className="p-4 text-right">السنة</th>
                <th className="p-4 text-right">النوع</th>
                <th className="p-4 text-right">الحمولة</th>
                <th className="p-4 text-right">الحالة</th>
                <th className="p-4 text-right">إجراءات</th>
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
                    <div className="flex gap-1">
                      <Button variant="ghost" size="sm" title="تعديل" onClick={() => openEdit(v)}><Pencil className="h-4 w-4" /></Button>
                      <Button variant="ghost" size="sm" title="الوثائق" onClick={() => setDocsFor(v)}><FileText className="h-4 w-4" /></Button>
                      <Button variant="ghost" size="sm" title="تسجيل صيانة" onClick={() => setQuickMaint(v)}><Wrench className="h-4 w-4" /></Button>
                      <Button variant="ghost" size="sm" title="تسجيل حادث" onClick={() => setQuickIncident(v)} className="text-destructive"><AlertTriangle className="h-4 w-4" /></Button>
                      <Button variant="ghost" size="sm" title={v.archived_at ? "استرجاع" : "أرشفة"} onClick={() => onArchive(v)}>
                        {v.archived_at ? <ArchiveRestore className="h-4 w-4" /> : <Archive className="h-4 w-4" />}
                      </Button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent dir="rtl">
          <DialogHeader><DialogTitle>{editingId ? "تعديل مركبة" : "إضافة مركبة"}</DialogTitle></DialogHeader>
          <form onSubmit={onSubmit} className="space-y-4">
            <div><Label>لوحة الترقيم *</Label><Input required dir="ltr" value={form.plate_number} onChange={(e) => setForm({ ...form, plate_number: e.target.value })} /></div>
            <div className="grid grid-cols-2 gap-3">
              <div><Label>الماركة</Label><Input value={form.brand} onChange={(e) => setForm({ ...form, brand: e.target.value })} /></div>
              <div><Label>الموديل</Label><Input value={form.model} onChange={(e) => setForm({ ...form, model: e.target.value })} /></div>
            </div>
            <div className="grid grid-cols-3 gap-3">
              <div><Label>السنة</Label><Input type="number" value={form.year} onChange={(e) => setForm({ ...form, year: e.target.value })} /></div>
              <div><Label>النوع</Label>
                <Select value={form.type} onValueChange={(v) => setForm({ ...form, type: v })}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {["شاحنة", "جرار", "مقطورة", "حاوية", "مركبة خفيفة"].map((t) => <SelectItem key={t} value={t}>{t}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div><Label>الحمولة (طن)</Label><Input type="number" step="0.1" value={form.capacity_tons} onChange={(e) => setForm({ ...form, capacity_tons: e.target.value })} /></div>
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
        </DialogContent>
      </Dialog>

      {docsFor && (
        <DocumentsDialog open={!!docsFor} onOpenChange={(o) => !o && setDocsFor(null)}
          scope="vehicle_id" refId={docsFor.id} entityLabel={docsFor.plate_number} />
      )}
      {quickMaint && <QuickMaintDialog vehicle={quickMaint} onClose={() => setQuickMaint(null)} />}
      {quickIncident && <QuickIncidentDialog vehicle={quickIncident} onClose={() => setQuickIncident(null)} />}
    </>
  );
}

function QuickMaintDialog({ vehicle, onClose }: { vehicle: Vehicle; onClose: () => void }) {
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({
    maintenance_type: "", scheduled_date: new Date().toISOString().slice(0, 10),
    cost: "", workshop: "",
  });
  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    const { data: profile } = await supabase.from("profiles").select("tenant_id").maybeSingle();
    if (!profile?.tenant_id) { toast.error("لا توجد شركة"); setSaving(false); return; }
    const { error } = await supabase.from("maintenance_records").insert({
      tenant_id: profile.tenant_id, vehicle_id: vehicle.id,
      maintenance_type: form.maintenance_type, scheduled_date: form.scheduled_date || null,
      cost: Number(form.cost || 0), workshop: form.workshop || null, status: "scheduled",
    });
    setSaving(false);
    if (error) return toast.error(error.message);
    toast.success("تم تسجيل الصيانة"); onClose();
  };
  return (
    <Dialog open onOpenChange={onClose}>
      <DialogContent dir="rtl">
        <DialogHeader><DialogTitle>تسجيل صيانة — {vehicle.plate_number}</DialogTitle></DialogHeader>
        <form onSubmit={submit} className="space-y-4">
          <div><Label>نوع الصيانة *</Label><Input required value={form.maintenance_type} onChange={(e) => setForm({ ...form, maintenance_type: e.target.value })} /></div>
          <div className="grid grid-cols-2 gap-3">
            <div><Label>التاريخ</Label><Input type="date" value={form.scheduled_date} onChange={(e) => setForm({ ...form, scheduled_date: e.target.value })} /></div>
            <div><Label>التكلفة (MAD)</Label><Input type="number" step="0.01" value={form.cost} onChange={(e) => setForm({ ...form, cost: e.target.value })} /></div>
          </div>
          <div><Label>الورشة</Label><Input value={form.workshop} onChange={(e) => setForm({ ...form, workshop: e.target.value })} /></div>
          <DialogFooter>
            <Button type="submit" disabled={saving} className="bg-accent text-accent-foreground hover:bg-accent/90 gap-2">
              {saving && <Loader2 className="h-4 w-4 animate-spin" />} حفظ
            </Button>
            <Link to="/app/maintenance" className="text-xs text-accent underline self-center">فتح صفحة الصيانة →</Link>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

function QuickIncidentDialog({ vehicle, onClose }: { vehicle: Vehicle; onClose: () => void }) {
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({
    incident_date: new Date().toISOString().slice(0, 10),
    location: "", description: "", severity: "minor", repair_cost: "",
  });
  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    const { data: profile } = await supabase.from("profiles").select("tenant_id").maybeSingle();
    if (!profile?.tenant_id) { toast.error("لا توجد شركة"); setSaving(false); return; }
    const { error } = await supabase.from("incidents").insert({
      tenant_id: profile.tenant_id, vehicle_id: vehicle.id,
      incident_date: form.incident_date, location: form.location || null,
      description: form.description || null, severity: form.severity, status: "open",
      repair_cost: Number(form.repair_cost || 0),
    });
    setSaving(false);
    if (error) return toast.error(error.message);
    toast.success("تم تسجيل الحادث"); onClose();
  };
  return (
    <Dialog open onOpenChange={onClose}>
      <DialogContent dir="rtl">
        <DialogHeader><DialogTitle>تسجيل حادث — {vehicle.plate_number}</DialogTitle></DialogHeader>
        <form onSubmit={submit} className="space-y-4">
          <div className="grid grid-cols-2 gap-3">
            <div><Label>التاريخ *</Label><Input type="date" required value={form.incident_date} onChange={(e) => setForm({ ...form, incident_date: e.target.value })} /></div>
            <div><Label>المكان</Label><Input value={form.location} onChange={(e) => setForm({ ...form, location: e.target.value })} /></div>
          </div>
          <div><Label>الوصف</Label><Input value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} /></div>
          <div className="grid grid-cols-2 gap-3">
            <div><Label>الخطورة</Label>
              <Select value={form.severity} onValueChange={(v) => setForm({ ...form, severity: v })}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="minor">بسيط</SelectItem>
                  <SelectItem value="moderate">متوسط</SelectItem>
                  <SelectItem value="major">كبير</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div><Label>تكلفة الإصلاح</Label><Input type="number" step="0.01" value={form.repair_cost} onChange={(e) => setForm({ ...form, repair_cost: e.target.value })} /></div>
          </div>
          <DialogFooter>
            <Button type="submit" disabled={saving} className="bg-accent text-accent-foreground hover:bg-accent/90 gap-2">
              {saving && <Loader2 className="h-4 w-4 animate-spin" />} حفظ
            </Button>
            <Link to="/app/accidents" className="text-xs text-accent underline self-center">فتح صفحة الحوادث →</Link>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
