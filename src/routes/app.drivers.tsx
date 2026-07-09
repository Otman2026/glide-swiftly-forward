import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { PageHeader, EmptyState } from "@/components/dashboard-layout";
import { UserCog, Plus, Search, Loader2, Pencil, Archive, ArchiveRestore, FileText, Route as RouteIcon, TrendingUp, Download, Printer } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { DocumentsDialog } from "@/components/documents-dialog";
import { exportToCSV } from "@/lib/csv";
import { printHTML, esc } from "@/lib/print";
import { ExportBar } from "@/components/export-bar";
import { StatCard } from "@/components/stat-card";

export const Route = createFileRoute("/app/drivers")({ component: DriversPage });

type Driver = {
  id: string;
  full_name: string;
  phone: string | null;
  national_id: string | null;
  license_number: string | null;
  license_expiry: string | null;
  hire_date: string | null;
  status: "active" | "on_leave" | "inactive";
  archived_at: string | null;
};

const STATUS_LABEL: Record<Driver["status"], string> = { active: "نشط", on_leave: "في إجازة", inactive: "غير نشط" };
const STATUS_COLOR: Record<Driver["status"], string> = {
  active: "bg-success/10 text-success",
  on_leave: "bg-warning/10 text-warning-foreground",
  inactive: "bg-muted text-muted-foreground",
};

const emptyForm = { full_name: "", phone: "", national_id: "", license_number: "", license_expiry: "", hire_date: "", status: "active" };

function DriversPage() {
  const [rows, setRows] = useState<Driver[]>([]);
  const [loading, setLoading] = useState(true);
  const [q, setQ] = useState("");
  const [showArchived, setShowArchived] = useState(false);
  const [open, setOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState(emptyForm);
  const [docsFor, setDocsFor] = useState<Driver | null>(null);
  const [perfFor, setPerfFor] = useState<Driver | null>(null);

  const load = async () => {
    setLoading(true);
    const { data, error } = await supabase.from("drivers")
      .select("id,full_name,phone,national_id,license_number,license_expiry,hire_date,status,archived_at")
      .order("created_at", { ascending: false });
    if (error) toast.error(error.message); else setRows((data ?? []) as Driver[]);
    setLoading(false);
  };
  useEffect(() => { load(); }, []);

  const openCreate = () => { setEditingId(null); setForm(emptyForm); setOpen(true); };
  const openEdit = (d: Driver) => {
    setEditingId(d.id);
    setForm({
      full_name: d.full_name, phone: d.phone ?? "", national_id: d.national_id ?? "",
      license_number: d.license_number ?? "", license_expiry: d.license_expiry ?? "",
      hire_date: d.hire_date ?? "", status: d.status,
    });
    setOpen(true);
  };

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    const payload = {
      full_name: form.full_name, phone: form.phone || null, national_id: form.national_id || null,
      license_number: form.license_number || null, license_expiry: form.license_expiry || null,
      hire_date: form.hire_date || null, status: form.status as Driver["status"],
    };
    if (editingId) {
      const { error } = await supabase.from("drivers").update(payload).eq("id", editingId);
      setSaving(false);
      if (error) return toast.error(error.message);
      toast.success("تم التحديث");
    } else {
      const { data: profile } = await supabase.from("profiles").select("tenant_id").maybeSingle();
      if (!profile?.tenant_id) { toast.error("لا توجد شركة"); setSaving(false); return; }
      const { error } = await supabase.from("drivers").insert({ ...payload, tenant_id: profile.tenant_id });
      setSaving(false);
      if (error) return toast.error(error.message);
      toast.success("تمت الإضافة");
    }
    setOpen(false); load();
  };

  const onArchive = async (d: Driver) => {
    const val = d.archived_at ? null : new Date().toISOString();
    const { error } = await supabase.from("drivers").update({ archived_at: val }).eq("id", d.id);
    if (error) toast.error(error.message); else { toast.success(d.archived_at ? "تم استرجاعه" : "تمت أرشفته"); load(); }
  };

  const filtered = useMemo(() => rows.filter((r) => {
    if (!showArchived && r.archived_at) return false;
    if (showArchived && !r.archived_at) return false;
    if (q && !r.full_name.toLowerCase().includes(q.toLowerCase())) return false;
    return true;
  }), [rows, q, showArchived]);

  const onExport = () => {
    exportToCSV(filtered, [
      { key: "full_name", label: "الاسم" },
      { key: "phone", label: "الهاتف" },
      { key: "national_id", label: "الهوية" },
      { key: "license_number", label: "رقم الرخصة" },
      { key: "license_expiry", label: "انتهاء الرخصة" },
      { key: "status", label: "الحالة", get: (r) => STATUS_LABEL[r.status] },
    ], `drivers-${new Date().toISOString().slice(0, 10)}`);
  };

  const onPrint = () => {
    const body = `<h1>قائمة السائقين</h1><h2>${filtered.length} سائق</h2>
      <table><thead><tr><th>الاسم</th><th>الهاتف</th><th>الرخصة</th><th>انتهاء</th><th>الحالة</th></tr></thead>
      <tbody>${filtered.map((r) => `<tr><td>${esc(r.full_name)}</td><td>${esc(r.phone)}</td><td>${esc(r.license_number)}</td><td>${esc(r.license_expiry)}</td><td>${esc(STATUS_LABEL[r.status])}</td></tr>`).join("")}</tbody></table>`;
    printHTML("قائمة السائقين", body);
  };

  const isLicenseExpiringSoon = (d: string | null) => {
    if (!d) return false;
    const diff = (new Date(d).getTime() - Date.now()) / (1000 * 60 * 60 * 24);
    return diff < 60;
  };

  return (
    <>
      <PageHeader
        title="السائقون"
        subtitle="الملفات، الرخص، الشهادات، الحوادث، المخالفات والأداء"
        action={
          <div className="flex flex-wrap gap-2">
            <ExportBar
              filename="drivers"
              title="السائقون"
              rows={filtered}
              columns={[
                { key: "full_name", label: "الاسم" },
                { key: "phone", label: "الهاتف" },
                { key: "national_id", label: "الرقم الوطني" },
                { key: "license_number", label: "رقم الرخصة" },
                { key: "license_expiry", label: "انتهاء الرخصة" },
                { key: "hire_date", label: "تاريخ التوظيف" },
                { key: "status", label: "الحالة", format: (r) => STATUS_LABEL[r.status] ?? r.status },
              ]}
            />
            <Button onClick={openCreate} className="gap-2 bg-accent text-accent-foreground hover:bg-accent/90"><Plus className="h-4 w-4" /> سائق جديد</Button>
          </div>
        }
      />

      <div className="mb-4 flex flex-wrap gap-3 items-center">
        <div className="relative flex-1 min-w-[240px] max-w-md">
          <Search className="pointer-events-none absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="بحث بالاسم..."
            className="h-10 w-full rounded-lg border border-border bg-card pr-10 pl-4 text-sm focus:border-accent focus:outline-none focus:ring-2 focus:ring-accent/20" />
        </div>
        <Button variant={showArchived ? "default" : "outline"} onClick={() => setShowArchived(!showArchived)} className="gap-2">
          <Archive className="h-4 w-4" /> {showArchived ? "عرض النشطين" : "عرض المؤرشفين"}
        </Button>
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-16"><Loader2 className="h-6 w-6 animate-spin text-accent" /></div>
      ) : filtered.length === 0 ? (
        <EmptyState icon={UserCog} title="لا يوجد سائقون" description="أضف أول سائق لبدء تعيينه." />
      ) : (
        <div className="rounded-2xl border border-border bg-card overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-secondary/50 text-xs uppercase text-muted-foreground">
              <tr>
                <th className="p-4 text-right">الاسم</th>
                <th className="p-4 text-right">الهاتف</th>
                <th className="p-4 text-right">الرخصة</th>
                <th className="p-4 text-right">انتهاء الرخصة</th>
                <th className="p-4 text-right">الحالة</th>
                <th className="p-4 text-right">إجراءات</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((d) => (
                <tr key={d.id} className="border-t border-border hover:bg-secondary/30">
                  <td className="p-4 font-semibold">{d.full_name}</td>
                  <td className="p-4 text-muted-foreground" dir="ltr">{d.phone ?? "—"}</td>
                  <td className="p-4 font-mono text-xs">{d.license_number ?? "—"}</td>
                  <td className="p-4" dir="ltr">
                    {d.license_expiry ?? "—"}
                    {isLicenseExpiringSoon(d.license_expiry) && <span className="mr-2 rounded bg-destructive/10 px-2 py-0.5 text-xs text-destructive">قريب الانتهاء</span>}
                  </td>
                  <td className="p-4"><span className={`rounded-md px-2 py-1 text-xs font-semibold ${STATUS_COLOR[d.status]}`}>{STATUS_LABEL[d.status]}</span></td>
                  <td className="p-4">
                    <div className="flex gap-1">
                      <Button variant="ghost" size="sm" title="تعديل" onClick={() => openEdit(d)}><Pencil className="h-4 w-4" /></Button>
                      <Button variant="ghost" size="sm" title="الوثائق" onClick={() => setDocsFor(d)}><FileText className="h-4 w-4" /></Button>
                      <Link to="/app/trips" title="تعيين رحلة"><Button variant="ghost" size="sm"><RouteIcon className="h-4 w-4" /></Button></Link>
                      <Button variant="ghost" size="sm" title="تقييم الأداء" onClick={() => setPerfFor(d)}><TrendingUp className="h-4 w-4" /></Button>
                      <Button variant="ghost" size="sm" title={d.archived_at ? "استرجاع" : "أرشفة"} onClick={() => onArchive(d)}>
                        {d.archived_at ? <ArchiveRestore className="h-4 w-4" /> : <Archive className="h-4 w-4" />}
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
          <DialogHeader><DialogTitle>{editingId ? "تعديل سائق" : "إضافة سائق"}</DialogTitle></DialogHeader>
          <form onSubmit={onSubmit} className="space-y-4">
            <div><Label>الاسم الكامل *</Label><Input required value={form.full_name} onChange={(e) => setForm({ ...form, full_name: e.target.value })} /></div>
            <div className="grid grid-cols-2 gap-3">
              <div><Label>الهاتف</Label><Input dir="ltr" value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} /></div>
              <div><Label>رقم الهوية</Label><Input dir="ltr" value={form.national_id} onChange={(e) => setForm({ ...form, national_id: e.target.value })} /></div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div><Label>رقم الرخصة</Label><Input dir="ltr" value={form.license_number} onChange={(e) => setForm({ ...form, license_number: e.target.value })} /></div>
              <div><Label>انتهاء الرخصة</Label><Input type="date" value={form.license_expiry} onChange={(e) => setForm({ ...form, license_expiry: e.target.value })} /></div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div><Label>تاريخ التوظيف</Label><Input type="date" value={form.hire_date} onChange={(e) => setForm({ ...form, hire_date: e.target.value })} /></div>
              <div>
                <Label>الحالة</Label>
                <Select value={form.status} onValueChange={(v) => setForm({ ...form, status: v })}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {Object.entries(STATUS_LABEL).map(([k, l]) => <SelectItem key={k} value={k}>{l}</SelectItem>)}
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

      {docsFor && (
        <DocumentsDialog open={!!docsFor} onOpenChange={(o) => !o && setDocsFor(null)}
          scope="driver_id" refId={docsFor.id} entityLabel={docsFor.full_name} />
      )}
      {perfFor && <PerformanceDialog driver={perfFor} onClose={() => setPerfFor(null)} />}
    </>
  );
}

function PerformanceDialog({ driver, onClose }: { driver: Driver; onClose: () => void }) {
  const [stats, setStats] = useState<{
    trips: number; completedTrips: number;
    incidents: number; incidentCost: number;
    violations: number; fineTotal: number;
    fuelLiters: number; fuelCost: number;
  } | null>(null);

  useEffect(() => {
    (async () => {
      const [t, i, v, f] = await Promise.all([
        supabase.from("trips").select("id,status").eq("driver_id", driver.id),
        supabase.from("incidents").select("repair_cost").eq("driver_id", driver.id),
        supabase.from("violations").select("fine_amount").eq("driver_id", driver.id),
        supabase.from("fuel_logs").select("liters,cost").eq("driver_id", driver.id),
      ]);
      setStats({
        trips: (t.data ?? []).length,
        completedTrips: (t.data ?? []).filter((x: any) => x.status === "completed").length,
        incidents: (i.data ?? []).length,
        incidentCost: (i.data ?? []).reduce((s: number, x: any) => s + Number(x.repair_cost ?? 0), 0),
        violations: (v.data ?? []).length,
        fineTotal: (v.data ?? []).reduce((s: number, x: any) => s + Number(x.fine_amount ?? 0), 0),
        fuelLiters: (f.data ?? []).reduce((s: number, x: any) => s + Number(x.liters ?? 0), 0),
        fuelCost: (f.data ?? []).reduce((s: number, x: any) => s + Number(x.cost ?? 0), 0),
      });
    })();
  }, [driver.id]);

  const score = stats
    ? Math.max(0, Math.min(100, 100 - stats.incidents * 15 - stats.violations * 5))
    : 0;

  return (
    <Dialog open onOpenChange={onClose}>
      <DialogContent dir="rtl" className="max-w-lg">
        <DialogHeader><DialogTitle>تقييم أداء — {driver.full_name}</DialogTitle></DialogHeader>
        {!stats ? (
          <div className="flex justify-center py-8"><Loader2 className="h-5 w-5 animate-spin text-accent" /></div>
        ) : (
          <div className="space-y-4">
            <div className="rounded-2xl border border-border bg-gradient-to-br from-accent/10 to-transparent p-6 text-center">
              <div className="text-xs text-muted-foreground">درجة الأداء</div>
              <div className={`mt-1 text-5xl font-black ${score >= 80 ? "text-success" : score >= 50 ? "text-warning-foreground" : "text-destructive"}`}>{score}</div>
              <div className="text-xs text-muted-foreground mt-1">من 100</div>
            </div>
            <div className="grid grid-cols-2 gap-3 text-sm">
              <StatCard label="عدد الرحلات" value={stats.trips} tone="info" />
              <StatCard label="رحلات مكتملة" value={stats.completedTrips} tone="success" />
              <StatCard label="الحوادث" value={stats.incidents} hint={`${stats.incidentCost.toFixed(0)} MAD`} tone="danger" />
              <StatCard label="المخالفات" value={stats.violations} hint={`${stats.fineTotal.toFixed(0)} MAD`} tone="warning" />
              <StatCard label="استهلاك الوقود" value={`${stats.fuelLiters.toFixed(0)}L`} hint={`${stats.fuelCost.toFixed(0)} MAD`} tone="brand" />
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}

