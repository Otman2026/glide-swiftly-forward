import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { PageHeader, EmptyState } from "@/components/dashboard-layout";
import { UserCog, Plus, Loader2, Trash2, CheckCircle2, XCircle, Printer, Download } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle, DialogTrigger,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { exportToCSV } from "@/lib/csv";
import { printHTML, esc } from "@/lib/print";
import { SearchInput, matchQuery } from "@/components/search-input";

export const Route = createFileRoute("/app/hr")({
  component: HRPage,
});

type Employee = {
  id: string; employee_code: string | null; full_name: string;
  position: string | null; department: string | null; phone: string | null;
  email: string | null; hire_date: string | null; base_salary: number; status: string;
};
type Attendance = { id: string; employee_id: string; work_date: string; check_in: string | null; check_out: string | null; status: string };
type Leave = { id: string; employee_id: string; leave_type: string; start_date: string; end_date: string; status: string; reason: string | null };
type Payroll = { id: string; employee_id: string; period_month: number; period_year: number; base_salary: number; allowances: number; bonuses: number; deductions: number; net_salary: number; status: string };

const LEAVE_TYPES = [
  { k: "annual", label: "سنوية" },
  { k: "sick", label: "مرضية" },
  { k: "unpaid", label: "بدون راتب" },
  { k: "other", label: "أخرى" },
];

function HRPage() {
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [attendance, setAttendance] = useState<Attendance[]>([]);
  const [leaves, setLeaves] = useState<Leave[]>([]);
  const [payroll, setPayroll] = useState<Payroll[]>([]);
  const [loading, setLoading] = useState(true);
  const [tenantId, setTenantId] = useState<string | null>(null);

  const load = async () => {
    setLoading(true);
    const { data: profile } = await supabase.from("profiles").select("tenant_id").maybeSingle();
    setTenantId(profile?.tenant_id ?? null);
    const [e, a, l, p] = await Promise.all([
      supabase.from("employees").select("*").is("archived_at", null).order("created_at", { ascending: false }),
      supabase.from("attendance").select("*").order("work_date", { ascending: false }).limit(200),
      supabase.from("leaves").select("*").order("start_date", { ascending: false }),
      supabase.from("payroll").select("*").order("period_year", { ascending: false }).order("period_month", { ascending: false }),
    ]);
    setEmployees((e.data as Employee[]) ?? []);
    setAttendance((a.data as Attendance[]) ?? []);
    setLeaves((l.data as Leave[]) ?? []);
    setPayroll((p.data as Payroll[]) ?? []);
    setLoading(false);
  };

  useEffect(() => { load(); }, []);

  const empName = (id: string) => employees.find((x) => x.id === id)?.full_name ?? "—";

  return (
    <>
      <PageHeader title="الموارد البشرية" subtitle="الموظفون، الحضور، الإجازات، والرواتب" />

      <div className="grid gap-3 sm:grid-cols-4 mb-6">
        <Stat label="الموظفون" value={employees.length} />
        <Stat label="الحضور اليوم" value={attendance.filter((a) => a.work_date === new Date().toISOString().slice(0, 10) && a.status === "present").length} />
        <Stat label="إجازات قيد الموافقة" value={leaves.filter((l) => l.status === "pending").length} />
        <Stat label="إجمالي الرواتب (شهر)" value={payroll.filter((p) => p.period_month === new Date().getMonth() + 1 && p.period_year === new Date().getFullYear()).reduce((s, p) => s + Number(p.net_salary), 0).toFixed(0) + " MAD"} />
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-16"><Loader2 className="h-6 w-6 animate-spin text-accent" /></div>
      ) : (
        <Tabs defaultValue="employees" dir="rtl">
          <TabsList>
            <TabsTrigger value="employees">الموظفون</TabsTrigger>
            <TabsTrigger value="attendance">الحضور</TabsTrigger>
            <TabsTrigger value="leaves">الإجازات</TabsTrigger>
            <TabsTrigger value="payroll">الرواتب</TabsTrigger>
          </TabsList>

          <TabsContent value="employees" className="mt-4">
            <EmployeesTab employees={employees} tenantId={tenantId} onChange={load} />
          </TabsContent>
          <TabsContent value="attendance" className="mt-4">
            <AttendanceTab employees={employees} rows={attendance} tenantId={tenantId} empName={empName} onChange={load} />
          </TabsContent>
          <TabsContent value="leaves" className="mt-4">
            <LeavesTab employees={employees} rows={leaves} tenantId={tenantId} empName={empName} onChange={load} />
          </TabsContent>
          <TabsContent value="payroll" className="mt-4">
            <PayrollTab employees={employees} rows={payroll} tenantId={tenantId} empName={empName} onChange={load} />
          </TabsContent>
        </Tabs>
      )}
    </>
  );
}

function Stat({ label, value }: { label: string; value: string | number }) {
  return (
    <div className="rounded-2xl border border-border bg-card p-4">
      <div className="text-xs text-muted-foreground">{label}</div>
      <div className="mt-1 text-2xl font-black">{value}</div>
    </div>
  );
}

// ---------- Employees ----------
function EmployeesTab({ employees, tenantId, onChange }: { employees: Employee[]; tenantId: string | null; onChange: () => void }) {
  const [open, setOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [q, setQ] = useState("");
  const [form, setForm] = useState({ full_name: "", employee_code: "", position: "", department: "", phone: "", email: "", hire_date: "", base_salary: "" });
  const filtered = useMemo(() => matchQuery(employees, q, ["full_name", "employee_code", "position", "department"]), [employees, q]);

  const onCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!tenantId) return toast.error("لا توجد شركة");
    setSaving(true);
    const { error } = await supabase.from("employees").insert({
      tenant_id: tenantId, full_name: form.full_name, employee_code: form.employee_code || null,
      position: form.position || null, department: form.department || null, phone: form.phone || null,
      email: form.email || null, hire_date: form.hire_date || null, base_salary: form.base_salary ? Number(form.base_salary) : 0,
    });
    setSaving(false);
    if (error) return toast.error(error.message);
    toast.success("تم إضافة الموظف");
    setOpen(false);
    setForm({ full_name: "", employee_code: "", position: "", department: "", phone: "", email: "", hire_date: "", base_salary: "" });
    onChange();
  };

  const onArchive = async (id: string) => {
    if (!confirm("حذف/أرشفة هذا الموظف؟")) return;
    const { error } = await supabase.from("employees").update({ archived_at: new Date().toISOString() }).eq("id", id);
    if (error) toast.error(error.message); else { toast.success("تمت الأرشفة"); onChange(); }
  };

  const onExport = () => exportToCSV(employees, [
    { key: "employee_code", label: "الرقم" }, { key: "full_name", label: "الاسم" },
    { key: "position", label: "المنصب" }, { key: "department", label: "القسم" },
    { key: "phone", label: "الهاتف" }, { key: "email", label: "البريد" },
    { key: "hire_date", label: "التوظيف" }, { key: "base_salary", label: "الراتب" },
  ], "employees");

  return (
    <>
      <div className="mb-3 flex justify-between gap-2">
        <div className="flex flex-wrap items-center gap-2">
          <SearchInput value={q} onChange={setQ} placeholder="ابحث بالاسم أو الرقم أو القسم…" />
          <Button variant="outline" onClick={onExport} className="gap-2"><Download className="h-4 w-4" /> CSV</Button>
        </div>
        <Dialog open={open} onOpenChange={setOpen}>
          <DialogTrigger asChild>
            <Button className="gap-2 bg-accent text-accent-foreground hover:bg-accent/90"><Plus className="h-4 w-4" /> موظف جديد</Button>
          </DialogTrigger>
          <DialogContent dir="rtl">
            <DialogHeader><DialogTitle>إضافة موظف</DialogTitle></DialogHeader>
            <form onSubmit={onCreate} className="space-y-3">
              <div className="grid grid-cols-2 gap-3">
                <div><Label>الاسم الكامل *</Label><Input required value={form.full_name} onChange={(e) => setForm({ ...form, full_name: e.target.value })} /></div>
                <div><Label>الرقم الوظيفي</Label><Input dir="ltr" value={form.employee_code} onChange={(e) => setForm({ ...form, employee_code: e.target.value })} /></div>
                <div><Label>المنصب</Label><Input value={form.position} onChange={(e) => setForm({ ...form, position: e.target.value })} /></div>
                <div><Label>القسم</Label><Input value={form.department} onChange={(e) => setForm({ ...form, department: e.target.value })} /></div>
                <div><Label>الهاتف</Label><Input dir="ltr" value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} /></div>
                <div><Label>البريد</Label><Input type="email" dir="ltr" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} /></div>
                <div><Label>تاريخ التوظيف</Label><Input type="date" value={form.hire_date} onChange={(e) => setForm({ ...form, hire_date: e.target.value })} /></div>
                <div><Label>الراتب الأساسي</Label><Input type="number" step="0.01" dir="ltr" value={form.base_salary} onChange={(e) => setForm({ ...form, base_salary: e.target.value })} /></div>
              </div>
              <DialogFooter><Button type="submit" disabled={saving} className="gap-2 bg-accent text-accent-foreground hover:bg-accent/90">{saving && <Loader2 className="h-4 w-4 animate-spin" />} حفظ</Button></DialogFooter>
            </form>
          </DialogContent>
        </Dialog>
      </div>
      {filtered.length === 0 ? (
        <EmptyState icon={UserCog} title="لا يوجد موظفون" description="ابدأ بإضافة أول موظف." />
      ) : (
        <div className="rounded-2xl border border-border bg-card overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-secondary/50 text-xs uppercase text-muted-foreground">
              <tr>
                <th className="p-3 text-right">الرقم</th><th className="p-3 text-right">الاسم</th>
                <th className="p-3 text-right">المنصب</th><th className="p-3 text-right">القسم</th>
                <th className="p-3 text-right">الهاتف</th><th className="p-3 text-right">الراتب</th>
                <th className="p-3 text-right">إجراءات</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((e) => (
                <tr key={e.id} className="border-t border-border hover:bg-secondary/30">
                  <td className="p-3 font-mono text-xs">{e.employee_code ?? "—"}</td>
                  <td className="p-3 font-semibold">{e.full_name}</td>
                  <td className="p-3">{e.position ?? "—"}</td>
                  <td className="p-3">{e.department ?? "—"}</td>
                  <td className="p-3 text-muted-foreground" dir="ltr">{e.phone ?? "—"}</td>
                  <td className="p-3 font-bold" dir="ltr">{Number(e.base_salary).toFixed(0)}</td>
                  <td className="p-3">
                    <Button variant="ghost" size="sm" onClick={() => onArchive(e.id)} className="text-destructive hover:bg-destructive/10 hover:text-destructive"><Trash2 className="h-4 w-4" /></Button>
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

// ---------- Attendance ----------
function AttendanceTab({ employees, rows, tenantId, empName, onChange }: { employees: Employee[]; rows: Attendance[]; tenantId: string | null; empName: (id: string) => string; onChange: () => void }) {
  const [empId, setEmpId] = useState("");

  const checkIn = async () => {
    if (!empId || !tenantId) return toast.error("اختر موظفاً");
    const today = new Date().toISOString().slice(0, 10);
    const { error } = await supabase.from("attendance").insert({ tenant_id: tenantId, employee_id: empId, work_date: today, check_in: new Date().toISOString(), status: "present" });
    if (error) toast.error(error.message); else { toast.success("تم تسجيل الحضور"); onChange(); }
  };

  const checkOut = async (id: string) => {
    const { error } = await supabase.from("attendance").update({ check_out: new Date().toISOString() }).eq("id", id);
    if (error) toast.error(error.message); else { toast.success("تم تسجيل الانصراف"); onChange(); }
  };

  return (
    <>
      <div className="mb-3 flex gap-2">
        <div className="w-64">
          <Select value={empId} onValueChange={setEmpId}>
            <SelectTrigger><SelectValue placeholder="اختر موظفاً" /></SelectTrigger>
            <SelectContent>{employees.map((e) => <SelectItem key={e.id} value={e.id}>{e.full_name}</SelectItem>)}</SelectContent>
          </Select>
        </div>
        <Button onClick={checkIn} className="gap-2 bg-accent text-accent-foreground hover:bg-accent/90"><CheckCircle2 className="h-4 w-4" /> تسجيل حضور</Button>
      </div>
      {rows.length === 0 ? (
        <EmptyState icon={UserCog} title="لا توجد سجلات" description="ابدأ بتسجيل الحضور اليومي." />
      ) : (
        <div className="rounded-2xl border border-border bg-card overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-secondary/50 text-xs uppercase text-muted-foreground">
              <tr>
                <th className="p-3 text-right">التاريخ</th><th className="p-3 text-right">الموظف</th>
                <th className="p-3 text-right">حضور</th><th className="p-3 text-right">انصراف</th>
                <th className="p-3 text-right">الحالة</th><th className="p-3 text-right">إجراء</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((r) => (
                <tr key={r.id} className="border-t border-border hover:bg-secondary/30">
                  <td className="p-3" dir="ltr">{r.work_date}</td>
                  <td className="p-3 font-semibold">{empName(r.employee_id)}</td>
                  <td className="p-3" dir="ltr">{r.check_in ? new Date(r.check_in).toLocaleTimeString() : "—"}</td>
                  <td className="p-3" dir="ltr">{r.check_out ? new Date(r.check_out).toLocaleTimeString() : "—"}</td>
                  <td className="p-3">{r.status}</td>
                  <td className="p-3">
                    {!r.check_out && <Button variant="outline" size="sm" onClick={() => checkOut(r.id)}>انصراف</Button>}
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

// ---------- Leaves ----------
function LeavesTab({ employees, rows, tenantId, empName, onChange }: { employees: Employee[]; rows: Leave[]; tenantId: string | null; empName: (id: string) => string; onChange: () => void }) {
  const [open, setOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({ employee_id: "", leave_type: "annual", start_date: "", end_date: "", reason: "" });

  const onCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!tenantId) return;
    setSaving(true);
    const { error } = await supabase.from("leaves").insert({ tenant_id: tenantId, ...form });
    setSaving(false);
    if (error) return toast.error(error.message);
    toast.success("تم تسجيل الطلب");
    setOpen(false);
    setForm({ employee_id: "", leave_type: "annual", start_date: "", end_date: "", reason: "" });
    onChange();
  };

  const setStatus = async (id: string, status: string) => {
    const { error } = await supabase.from("leaves").update({ status }).eq("id", id);
    if (error) toast.error(error.message); else { toast.success("تم التحديث"); onChange(); }
  };

  return (
    <>
      <div className="mb-3 flex justify-end">
        <Dialog open={open} onOpenChange={setOpen}>
          <DialogTrigger asChild>
            <Button className="gap-2 bg-accent text-accent-foreground hover:bg-accent/90"><Plus className="h-4 w-4" /> طلب إجازة</Button>
          </DialogTrigger>
          <DialogContent dir="rtl">
            <DialogHeader><DialogTitle>طلب إجازة</DialogTitle></DialogHeader>
            <form onSubmit={onCreate} className="space-y-3">
              <div><Label>الموظف *</Label>
                <Select value={form.employee_id} onValueChange={(v) => setForm({ ...form, employee_id: v })}>
                  <SelectTrigger><SelectValue placeholder="اختر" /></SelectTrigger>
                  <SelectContent>{employees.map((e) => <SelectItem key={e.id} value={e.id}>{e.full_name}</SelectItem>)}</SelectContent>
                </Select>
              </div>
              <div className="grid grid-cols-3 gap-3">
                <div><Label>النوع</Label>
                  <Select value={form.leave_type} onValueChange={(v) => setForm({ ...form, leave_type: v })}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>{LEAVE_TYPES.map((t) => <SelectItem key={t.k} value={t.k}>{t.label}</SelectItem>)}</SelectContent>
                  </Select>
                </div>
                <div><Label>من *</Label><Input type="date" required value={form.start_date} onChange={(e) => setForm({ ...form, start_date: e.target.value })} /></div>
                <div><Label>إلى *</Label><Input type="date" required value={form.end_date} onChange={(e) => setForm({ ...form, end_date: e.target.value })} /></div>
              </div>
              <div><Label>السبب</Label><Input value={form.reason} onChange={(e) => setForm({ ...form, reason: e.target.value })} /></div>
              <DialogFooter><Button type="submit" disabled={saving} className="gap-2 bg-accent text-accent-foreground hover:bg-accent/90">{saving && <Loader2 className="h-4 w-4 animate-spin" />} حفظ</Button></DialogFooter>
            </form>
          </DialogContent>
        </Dialog>
      </div>
      {rows.length === 0 ? (
        <EmptyState icon={UserCog} title="لا توجد إجازات" description="لم يتم تقديم أي طلب بعد." />
      ) : (
        <div className="rounded-2xl border border-border bg-card overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-secondary/50 text-xs uppercase text-muted-foreground">
              <tr>
                <th className="p-3 text-right">الموظف</th><th className="p-3 text-right">النوع</th>
                <th className="p-3 text-right">من</th><th className="p-3 text-right">إلى</th>
                <th className="p-3 text-right">الحالة</th><th className="p-3 text-right">إجراءات</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((r) => (
                <tr key={r.id} className="border-t border-border hover:bg-secondary/30">
                  <td className="p-3 font-semibold">{empName(r.employee_id)}</td>
                  <td className="p-3">{LEAVE_TYPES.find((t) => t.k === r.leave_type)?.label ?? r.leave_type}</td>
                  <td className="p-3" dir="ltr">{r.start_date}</td>
                  <td className="p-3" dir="ltr">{r.end_date}</td>
                  <td className="p-3">
                    <span className={`rounded-full px-2 py-1 text-xs font-semibold ${r.status === "approved" ? "bg-success/10 text-success" : r.status === "rejected" ? "bg-destructive/10 text-destructive" : "bg-warning/10 text-warning"}`}>
                      {r.status === "approved" ? "موافقة" : r.status === "rejected" ? "مرفوضة" : "قيد المراجعة"}
                    </span>
                  </td>
                  <td className="p-3 flex gap-1">
                    {r.status === "pending" && <>
                      <Button size="sm" variant="outline" onClick={() => setStatus(r.id, "approved")} className="text-success"><CheckCircle2 className="h-4 w-4" /></Button>
                      <Button size="sm" variant="outline" onClick={() => setStatus(r.id, "rejected")} className="text-destructive"><XCircle className="h-4 w-4" /></Button>
                    </>}
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

// ---------- Payroll ----------
function PayrollTab({ employees, rows, tenantId, empName, onChange }: { employees: Employee[]; rows: Payroll[]; tenantId: string | null; empName: (id: string) => string; onChange: () => void }) {
  const [open, setOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const now = new Date();
  const [form, setForm] = useState({ employee_id: "", period_month: String(now.getMonth() + 1), period_year: String(now.getFullYear()), base_salary: "", allowances: "0", bonuses: "0", deductions: "0" });

  const net = useMemo(() => (Number(form.base_salary || 0) + Number(form.allowances || 0) + Number(form.bonuses || 0) - Number(form.deductions || 0)), [form]);

  useEffect(() => {
    if (form.employee_id) {
      const emp = employees.find((e) => e.id === form.employee_id);
      if (emp && !form.base_salary) setForm((f) => ({ ...f, base_salary: String(emp.base_salary) }));
    }
  }, [form.employee_id]);

  const onCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!tenantId) return;
    setSaving(true);
    const { error } = await supabase.from("payroll").insert({
      tenant_id: tenantId, employee_id: form.employee_id,
      period_month: Number(form.period_month), period_year: Number(form.period_year),
      base_salary: Number(form.base_salary), allowances: Number(form.allowances),
      bonuses: Number(form.bonuses), deductions: Number(form.deductions), net_salary: net,
    });
    setSaving(false);
    if (error) return toast.error(error.message);
    toast.success("تم إنشاء كشف الراتب");
    setOpen(false);
    setForm({ employee_id: "", period_month: String(now.getMonth() + 1), period_year: String(now.getFullYear()), base_salary: "", allowances: "0", bonuses: "0", deductions: "0" });
    onChange();
  };

  const markPaid = async (id: string) => {
    const { error } = await supabase.from("payroll").update({ status: "paid", paid_at: new Date().toISOString() }).eq("id", id);
    if (error) toast.error(error.message); else { toast.success("تم الصرف"); onChange(); }
  };

  const onDelete = async (id: string) => {
    if (!confirm("حذف كشف الراتب؟")) return;
    const { error } = await supabase.from("payroll").delete().eq("id", id);
    if (error) toast.error(error.message); else { toast.success("تم الحذف"); onChange(); }
  };

  const printPayslip = (p: Payroll) => {
    printHTML(`قسيمة راتب — ${empName(p.employee_id)}`, `
      <h1>قسيمة راتب</h1>
      <h2>${esc(empName(p.employee_id))} — ${p.period_month}/${p.period_year}</h2>
      <dl class="kv">
        <dt>الراتب الأساسي</dt><dd>${Number(p.base_salary).toFixed(2)} MAD</dd>
        <dt>البدلات</dt><dd>${Number(p.allowances).toFixed(2)} MAD</dd>
        <dt>المكافآت</dt><dd>${Number(p.bonuses).toFixed(2)} MAD</dd>
        <dt>الخصومات</dt><dd>-${Number(p.deductions).toFixed(2)} MAD</dd>
        <dt><b>الصافي</b></dt><dd><b>${Number(p.net_salary).toFixed(2)} MAD</b></dd>
        <dt>الحالة</dt><dd>${p.status === "paid" ? "مدفوعة" : "مسودة"}</dd>
      </dl>
    `);
  };

  return (
    <>
      <div className="mb-3 flex justify-end">
        <Dialog open={open} onOpenChange={setOpen}>
          <DialogTrigger asChild>
            <Button className="gap-2 bg-accent text-accent-foreground hover:bg-accent/90"><Plus className="h-4 w-4" /> كشف راتب</Button>
          </DialogTrigger>
          <DialogContent dir="rtl">
            <DialogHeader><DialogTitle>إنشاء كشف راتب</DialogTitle></DialogHeader>
            <form onSubmit={onCreate} className="space-y-3">
              <div><Label>الموظف *</Label>
                <Select value={form.employee_id} onValueChange={(v) => setForm({ ...form, employee_id: v })}>
                  <SelectTrigger><SelectValue placeholder="اختر" /></SelectTrigger>
                  <SelectContent>{employees.map((e) => <SelectItem key={e.id} value={e.id}>{e.full_name}</SelectItem>)}</SelectContent>
                </Select>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div><Label>الشهر</Label><Input type="number" min="1" max="12" dir="ltr" value={form.period_month} onChange={(e) => setForm({ ...form, period_month: e.target.value })} /></div>
                <div><Label>السنة</Label><Input type="number" dir="ltr" value={form.period_year} onChange={(e) => setForm({ ...form, period_year: e.target.value })} /></div>
                <div><Label>الأساسي</Label><Input type="number" step="0.01" dir="ltr" value={form.base_salary} onChange={(e) => setForm({ ...form, base_salary: e.target.value })} /></div>
                <div><Label>البدلات</Label><Input type="number" step="0.01" dir="ltr" value={form.allowances} onChange={(e) => setForm({ ...form, allowances: e.target.value })} /></div>
                <div><Label>المكافآت</Label><Input type="number" step="0.01" dir="ltr" value={form.bonuses} onChange={(e) => setForm({ ...form, bonuses: e.target.value })} /></div>
                <div><Label>الخصومات</Label><Input type="number" step="0.01" dir="ltr" value={form.deductions} onChange={(e) => setForm({ ...form, deductions: e.target.value })} /></div>
              </div>
              <div className="rounded-lg bg-secondary/50 p-3 text-center">
                <div className="text-xs text-muted-foreground">صافي الراتب</div>
                <div className="text-2xl font-black text-success" dir="ltr">{net.toFixed(2)} MAD</div>
              </div>
              <DialogFooter><Button type="submit" disabled={saving} className="gap-2 bg-accent text-accent-foreground hover:bg-accent/90">{saving && <Loader2 className="h-4 w-4 animate-spin" />} حفظ</Button></DialogFooter>
            </form>
          </DialogContent>
        </Dialog>
      </div>
      {rows.length === 0 ? (
        <EmptyState icon={UserCog} title="لا توجد كشوف رواتب" description="ابدأ بإنشاء أول كشف." />
      ) : (
        <div className="rounded-2xl border border-border bg-card overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-secondary/50 text-xs uppercase text-muted-foreground">
              <tr>
                <th className="p-3 text-right">الموظف</th><th className="p-3 text-right">الفترة</th>
                <th className="p-3 text-right">الأساسي</th><th className="p-3 text-right">البدلات</th>
                <th className="p-3 text-right">الخصومات</th><th className="p-3 text-right">الصافي</th>
                <th className="p-3 text-right">الحالة</th><th className="p-3 text-right">إجراءات</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((r) => (
                <tr key={r.id} className="border-t border-border hover:bg-secondary/30">
                  <td className="p-3 font-semibold">{empName(r.employee_id)}</td>
                  <td className="p-3" dir="ltr">{r.period_month}/{r.period_year}</td>
                  <td className="p-3" dir="ltr">{Number(r.base_salary).toFixed(0)}</td>
                  <td className="p-3" dir="ltr">{Number(r.allowances).toFixed(0)}</td>
                  <td className="p-3 text-destructive" dir="ltr">-{Number(r.deductions).toFixed(0)}</td>
                  <td className="p-3 font-black text-success" dir="ltr">{Number(r.net_salary).toFixed(0)}</td>
                  <td className="p-3">
                    <span className={`rounded-full px-2 py-1 text-xs font-semibold ${r.status === "paid" ? "bg-success/10 text-success" : "bg-warning/10 text-warning"}`}>
                      {r.status === "paid" ? "مدفوع" : "مسودة"}
                    </span>
                  </td>
                  <td className="p-3 flex gap-1">
                    <Button size="sm" variant="ghost" onClick={() => printPayslip(r)}><Printer className="h-4 w-4" /></Button>
                    {r.status !== "paid" && <Button size="sm" variant="outline" onClick={() => markPaid(r.id)} className="text-success"><CheckCircle2 className="h-4 w-4" /></Button>}
                    <Button size="sm" variant="ghost" onClick={() => onDelete(r.id)} className="text-destructive hover:bg-destructive/10 hover:text-destructive"><Trash2 className="h-4 w-4" /></Button>
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
