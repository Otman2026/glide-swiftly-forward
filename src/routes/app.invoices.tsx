import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { PageHeader, EmptyState } from "@/components/dashboard-layout";
import { FileText, Plus, Loader2, Trash2, Printer, Download } from "lucide-react";
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
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { ExportBar } from "@/components/export-bar";
import { SearchInput, matchQuery } from "@/components/search-input";
import { allocateInvoiceNumber, resolveAssetUrl, formatMoney, type CompanySettings } from "@/lib/company";
import { setPrintBrand } from "@/lib/print";

export const Route = createFileRoute("/app/invoices")({
  component: InvoicesPage,
});

type Invoice = {
  id: string;
  invoice_number: string;
  customer_id: string | null;
  transport_order_id: string | null;
  issue_date: string;
  due_date: string | null;
  status: string;
  subtotal: number;
  tax_rate: number;
  tax_amount: number;
  total: number;
  paid_amount: number;
  notes: string | null;
};

type Item = { description: string; quantity: number; unit_price: number };

const STATUS: Record<string, { label: string; variant: "default" | "secondary" | "destructive" | "outline" }> = {
  draft: { label: "مسودة", variant: "outline" },
  sent: { label: "مُرسلة", variant: "secondary" },
  paid: { label: "مدفوعة", variant: "default" },
  overdue: { label: "متأخرة", variant: "destructive" },
  cancelled: { label: "ملغاة", variant: "outline" },
};

function InvoicesPage() {
  const [loading, setLoading] = useState(true);
  const [rows, setRows] = useState<Invoice[]>([]);
  const [customers, setCustomers] = useState<{ id: string; name: string }[]>([]);
  const [orders, setOrders] = useState<{ id: string; order_number: string; price: number | null }[]>([]);
  const [tenant, setTenant] = useState<CompanySettings | null>(null);
  const [logoUrl, setLogoUrl] = useState<string | null>(null);
  const [stampUrl, setStampUrl] = useState<string | null>(null);

  const [open, setOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({
    invoice_number: "",
    customer_id: "",
    transport_order_id: "",
    issue_date: new Date().toISOString().slice(0, 10),
    due_date: "",
    status: "draft",
    tax_rate: 19,
    notes: "",
  });
  const [items, setItems] = useState<Item[]>([{ description: "", quantity: 1, unit_price: 0 }]);
  const [q, setQ] = useState("");

  const [viewing, setViewing] = useState<Invoice | null>(null);
  const [viewItems, setViewItems] = useState<Array<Item & { id: string; amount: number }>>([]);

  const totals = useMemo(() => {
    const subtotal = items.reduce((s, i) => s + i.quantity * i.unit_price, 0);
    const tax = (subtotal * form.tax_rate) / 100;
    return { subtotal, tax, total: subtotal + tax };
  }, [items, form.tax_rate]);

  async function load() {
    setLoading(true);
    const { data: profile } = await supabase.from("profiles").select("tenant_id").maybeSingle();
    if (profile?.tenant_id) {
      const { data: t } = await supabase.from("tenants").select("*").eq("id", profile.tenant_id).maybeSingle();
      if (t) {
        const co = t as unknown as CompanySettings;
        setTenant(co);
        const [lu, su] = await Promise.all([resolveAssetUrl(co.logo_url), resolveAssetUrl(co.stamp_url)]);
        setLogoUrl(lu); setStampUrl(su);
        setPrintBrand({
          companyName: co.name, logoUrl: lu, stampUrl: su,
          headerNote: co.invoice_header, footerNote: co.invoice_footer,
          bankDetails: co.bank_details, address: co.address, city: co.city,
          contactEmail: co.contact_email, contactPhone: co.contact_phone,
          taxId: co.tax_id, registrationNumber: co.registration_number,
        });
      }
    }
    const [{ data: inv }, { data: cust }, { data: ords }] = await Promise.all([
      supabase.from("invoices").select("*").order("issue_date", { ascending: false }),
      supabase.from("customers").select("id, name").order("name"),
      supabase.from("transport_orders").select("id, order_number, price").order("created_at", { ascending: false }).limit(200),
    ]);
    setRows((inv ?? []) as Invoice[]);
    setCustomers((cust ?? []) as { id: string; name: string }[]);
    setOrders((ords ?? []) as { id: string; order_number: string; price: number | null }[]);
    setLoading(false);
  }

  useEffect(() => {
    load();
  }, []);

  function resetForm() {
    setForm({
      invoice_number: "",
      customer_id: "",
      transport_order_id: "",
      issue_date: new Date().toISOString().slice(0, 10),
      due_date: "",
      status: "draft",
      tax_rate: Number(tenant?.tax_rate ?? 20),
      notes: "",
    });
    setItems([{ description: "", quantity: 1, unit_price: 0 }]);
  }

  async function onOpenChange(v: boolean) {
    setOpen(v);
    if (v) {
      resetForm();
      if (tenant?.id) {
        try {
          const n = await allocateInvoiceNumber(tenant.id);
          setForm((f) => ({ ...f, invoice_number: n }));
        } catch (e: any) {
          toast.error(e?.message ?? "تعذّر توليد رقم الفاتورة");
        }
      }
    }
  }

  function onOrderSelect(orderId: string) {
    const o = orders.find((x) => x.id === orderId);
    if (!o) {
      setForm((f) => ({ ...f, transport_order_id: "" }));
      return;
    }
    setForm((f) => ({ ...f, transport_order_id: orderId }));
    if (o.price && items.length === 1 && !items[0].description) {
      setItems([{ description: `أمر النقل ${o.order_number}`, quantity: 1, unit_price: o.price }]);
    }
  }

  async function submit() {
    if (!tenant) return toast.error("لا يوجد ملف شركة");
    if (!form.invoice_number.trim()) return toast.error("رقم الفاتورة مطلوب");
    if (items.some((i) => !i.description.trim())) return toast.error("اكتب وصف كل بند");
    setSaving(true);
    const { data: user } = await supabase.auth.getUser();
    const payload = {
      tenant_id: tenant.id,
      invoice_number: form.invoice_number.trim(),
      customer_id: form.customer_id || null,
      transport_order_id: form.transport_order_id || null,
      issue_date: form.issue_date,
      due_date: form.due_date || null,
      status: form.status,
      subtotal: totals.subtotal,
      tax_rate: form.tax_rate,
      tax_amount: totals.tax,
      total: totals.total,
      notes: form.notes || null,
      created_by: user.user?.id ?? null,
    };
    const { data: inv, error } = await supabase.from("invoices").insert(payload).select().single();
    if (error) {
      setSaving(false);
      return toast.error(error.message);
    }
    const itemsPayload = items.map((i) => ({
      invoice_id: inv.id,
      description: i.description,
      quantity: i.quantity,
      unit_price: i.unit_price,
      amount: i.quantity * i.unit_price,
    }));
    const { error: e2 } = await supabase.from("invoice_items").insert(itemsPayload);
    setSaving(false);
    if (e2) return toast.error(e2.message);
    toast.success("تم إنشاء الفاتورة");
    setOpen(false);
    load();
  }

  async function remove(id: string) {
    if (!confirm("حذف الفاتورة نهائياً؟")) return;
    const { error } = await supabase.from("invoices").delete().eq("id", id);
    if (error) return toast.error(error.message);
    toast.success("تم الحذف");
    load();
  }

  async function openView(inv: Invoice) {
    setViewing(inv);
    const { data } = await supabase.from("invoice_items").select("*").eq("invoice_id", inv.id);
    setViewItems((data ?? []) as Array<Item & { id: string; amount: number }>);
  }

  const customerMap = useMemo(() => Object.fromEntries(customers.map((c) => [c.id, c.name])), [customers]);
  const filtered = useMemo(
    () =>
      matchQuery(
        rows.map((r) => ({ ...r, _customer: r.customer_id ? customerMap[r.customer_id] ?? "" : "" })),
        q,
        ["invoice_number", "status", "_customer", "issue_date"] as const,
      ),
    [rows, q, customerMap],
  );
  const kpi = useMemo(() => {
    const total = filtered.reduce((s, r) => s + Number(r.total), 0);
    const paid = filtered.reduce((s, r) => s + Number(r.paid_amount), 0);
    return { count: filtered.length, total, paid, due: total - paid };
  }, [filtered]);

  return (
    <>
      <PageHeader
        title="الفواتير"
        subtitle="إصدار وإدارة فواتير النقل — TVA، طباعة، تصدير"
        action={
          <div className="flex flex-wrap gap-2 items-center">
            <SearchInput value={q} onChange={setQ} placeholder="بحث برقم/عميل/حالة…" />
            <ExportBar
              filename="invoices"
              title="الفواتير"
              rows={filtered}
              columns={[
                { key: "invoice_number", label: "رقم الفاتورة" },
                { key: "issue_date", label: "تاريخ الإصدار" },
                { key: "due_date", label: "تاريخ الاستحقاق" },
                { key: "status", label: "الحالة" },
                { key: "subtotal", label: "المجموع الفرعي" },
                { key: "tax_amount", label: "الضريبة" },
                { key: "total", label: "الإجمالي" },
              ]}
            />
            <Dialog open={open} onOpenChange={onOpenChange}>
              <DialogTrigger asChild>
                <Button>
                  <Plus className="ms-2 h-4 w-4" />
                  فاتورة جديدة
                </Button>
              </DialogTrigger>
            <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto" dir="rtl">
              <DialogHeader>
                <DialogTitle>إنشاء فاتورة</DialogTitle>
              </DialogHeader>
              <div className="grid gap-4">
                <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                  <div>
                    <Label>رقم الفاتورة</Label>
                    <Input value={form.invoice_number} onChange={(e) => setForm({ ...form, invoice_number: e.target.value })} />
                  </div>
                  <div>
                    <Label>تاريخ الإصدار</Label>
                    <Input type="date" value={form.issue_date} onChange={(e) => setForm({ ...form, issue_date: e.target.value })} />
                  </div>
                  <div>
                    <Label>تاريخ الاستحقاق</Label>
                    <Input type="date" value={form.due_date} onChange={(e) => setForm({ ...form, due_date: e.target.value })} />
                  </div>
                  <div>
                    <Label>العميل</Label>
                    <Select value={form.customer_id} onValueChange={(v) => setForm({ ...form, customer_id: v })}>
                      <SelectTrigger><SelectValue placeholder="اختر" /></SelectTrigger>
                      <SelectContent>
                        {customers.map((c) => <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>)}
                      </SelectContent>
                    </Select>
                  </div>
                  <div>
                    <Label>أمر النقل (اختياري)</Label>
                    <Select value={form.transport_order_id} onValueChange={onOrderSelect}>
                      <SelectTrigger><SelectValue placeholder="اختر" /></SelectTrigger>
                      <SelectContent>
                        {orders.map((o) => <SelectItem key={o.id} value={o.id}>{o.order_number}</SelectItem>)}
                      </SelectContent>
                    </Select>
                  </div>
                  <div>
                    <Label>الحالة</Label>
                    <Select value={form.status} onValueChange={(v) => setForm({ ...form, status: v })}>
                      <SelectTrigger><SelectValue /></SelectTrigger>
                      <SelectContent>
                        {Object.entries(STATUS).map(([k, v]) => <SelectItem key={k} value={k}>{v.label}</SelectItem>)}
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                <div>
                  <div className="flex items-center justify-between mb-2">
                    <Label>البنود</Label>
                    <Button type="button" variant="outline" size="sm" onClick={() => setItems([...items, { description: "", quantity: 1, unit_price: 0 }])}>
                      <Plus className="ms-1 h-3 w-3" />بند
                    </Button>
                  </div>
                  <div className="space-y-2">
                    {items.map((it, idx) => (
                      <div key={idx} className="grid grid-cols-12 gap-2 items-end">
                        <div className="col-span-6">
                          <Input placeholder="الوصف" value={it.description} onChange={(e) => {
                            const n = [...items]; n[idx] = { ...it, description: e.target.value }; setItems(n);
                          }} />
                        </div>
                        <div className="col-span-2">
                          <Input type="number" step="0.01" placeholder="الكمية" value={it.quantity} onChange={(e) => {
                            const n = [...items]; n[idx] = { ...it, quantity: Number(e.target.value) }; setItems(n);
                          }} />
                        </div>
                        <div className="col-span-3">
                          <Input type="number" step="0.01" placeholder="سعر الوحدة" value={it.unit_price} onChange={(e) => {
                            const n = [...items]; n[idx] = { ...it, unit_price: Number(e.target.value) }; setItems(n);
                          }} />
                        </div>
                        <div className="col-span-1">
                          <Button type="button" variant="ghost" size="icon" onClick={() => setItems(items.filter((_, i) => i !== idx))} disabled={items.length === 1}>
                            <Trash2 className="h-4 w-4 text-destructive" />
                          </Button>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  <div>
                    <Label>نسبة TVA %</Label>
                    <Input type="number" step="0.1" value={form.tax_rate} onChange={(e) => setForm({ ...form, tax_rate: Number(e.target.value) })} />
                  </div>
                  <div className="rounded-lg bg-secondary/50 p-3 text-sm space-y-1">
                    <div className="flex justify-between"><span>المجموع الجزئي:</span><span>{totals.subtotal.toFixed(2)}</span></div>
                    <div className="flex justify-between"><span>TVA:</span><span>{totals.tax.toFixed(2)}</span></div>
                    <div className="flex justify-between font-bold border-t pt-1"><span>الإجمالي:</span><span>{totals.total.toFixed(2)}</span></div>
                  </div>
                </div>

                <div>
                  <Label>ملاحظات</Label>
                  <Textarea value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })} rows={2} />
                </div>
              </div>
              <DialogFooter>
                <Button variant="outline" onClick={() => setOpen(false)}>إلغاء</Button>
                <Button onClick={submit} disabled={saving}>
                  {saving && <Loader2 className="ms-2 h-4 w-4 animate-spin" />}
                  حفظ
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
          </div>
        }
      />

      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-6">
        <KPI label="عدد الفواتير" value={kpi.count.toString()} />
        <KPI label="إجمالي الفواتير" value={kpi.total.toFixed(2)} />
        <KPI label="المحصّل" value={kpi.paid.toFixed(2)} tone="success" />
        <KPI label="المتبقي" value={kpi.due.toFixed(2)} tone="warn" />
      </div>

      {loading ? (
        <div className="flex justify-center py-12"><Loader2 className="h-6 w-6 animate-spin text-muted-foreground" /></div>
      ) : filtered.length === 0 ? (
        <EmptyState icon={FileText} title="لا توجد فواتير" description={q ? "لا نتائج مطابقة للبحث" : "ابدأ بإصدار أول فاتورة نقل"} />
      ) : (
        <div className="rounded-lg border bg-card overflow-hidden">
          <table className="w-full text-sm">
            <thead className="bg-secondary/50 text-right">
              <tr>
                <th className="p-3">رقم</th>
                <th className="p-3">العميل</th>
                <th className="p-3">التاريخ</th>
                <th className="p-3">الاستحقاق</th>
                <th className="p-3">الإجمالي</th>
                <th className="p-3">الحالة</th>
                <th className="p-3"></th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((r) => (
                <tr key={r.id} className="border-t hover:bg-secondary/30 cursor-pointer" onClick={() => openView(r)}>
                  <td className="p-3 font-medium">{r.invoice_number}</td>
                  <td className="p-3">{r.customer_id ? customerMap[r.customer_id] ?? "—" : "—"}</td>
                  <td className="p-3">{r.issue_date}</td>
                  <td className="p-3">{r.due_date ?? "—"}</td>
                  <td className="p-3 font-semibold">{Number(r.total).toFixed(2)}</td>
                  <td className="p-3">
                    <Badge variant={STATUS[r.status]?.variant ?? "outline"}>{STATUS[r.status]?.label ?? r.status}</Badge>
                  </td>
                  <td className="p-3" onClick={(e) => e.stopPropagation()}>
                    <Button variant="ghost" size="icon" onClick={() => remove(r.id)}>
                      <Trash2 className="h-4 w-4 text-destructive" />
                    </Button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* View / Print */}
      <Dialog open={!!viewing} onOpenChange={(v) => !v && setViewing(null)}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto" dir="rtl">
          {viewing && (
            <>
              <DialogHeader className="print:hidden">
                <DialogTitle>فاتورة {viewing.invoice_number}</DialogTitle>
              </DialogHeader>
              <div id="print-area" className="relative p-6 bg-white text-black rounded">
                <div className="flex justify-between items-start mb-6 border-b-2 border-black pb-3 gap-4">
                  <div className="flex items-start gap-3">
                    {logoUrl ? (
                      <img src={logoUrl} alt="logo" className="h-16 max-w-[180px] object-contain" />
                    ) : null}
                    <div>
                      <h2 className="text-2xl font-bold">{tenant?.name ?? "شركة النقل"}</h2>
                      {tenant?.address && <p className="text-xs text-gray-600">{[tenant.address, tenant.city].filter(Boolean).join("، ")}</p>}
                      {tenant?.tax_id && <p className="text-xs text-gray-600">ICE: {tenant.tax_id}</p>}
                      {tenant?.registration_number && <p className="text-xs text-gray-600">RC: {tenant.registration_number}</p>}
                      {(tenant?.contact_phone || tenant?.contact_email) && (
                        <p className="text-xs text-gray-600" dir="ltr">
                          {[tenant?.contact_phone, tenant?.contact_email].filter(Boolean).join(" · ")}
                        </p>
                      )}
                    </div>
                  </div>
                  <div className="text-left">
                    <h3 className="text-xl font-bold">فاتورة</h3>
                    <p className="text-sm">رقم: {viewing.invoice_number}</p>
                    <p className="text-sm">التاريخ: {viewing.issue_date}</p>
                    {viewing.due_date && <p className="text-sm">الاستحقاق: {viewing.due_date}</p>}
                  </div>
                </div>
                {tenant?.invoice_header && (
                  <div className="mb-3 rounded bg-gray-50 border border-gray-200 p-2 text-xs whitespace-pre-line">{tenant.invoice_header}</div>
                )}
                <div className="mb-4 border-t border-b py-2">
                  <p className="text-sm font-semibold">العميل:</p>
                  <p>{viewing.customer_id ? customerMap[viewing.customer_id] ?? "—" : "—"}</p>
                </div>
                <table className="w-full text-sm mb-4">
                  <thead className="bg-gray-100">
                    <tr>
                      <th className="p-2 text-right">الوصف</th>
                      <th className="p-2">الكمية</th>
                      <th className="p-2">السعر</th>
                      <th className="p-2">الإجمالي</th>
                    </tr>
                  </thead>
                  <tbody>
                    {viewItems.map((it) => (
                      <tr key={it.id} className="border-b">
                        <td className="p-2">{it.description}</td>
                        <td className="p-2 text-center">{it.quantity}</td>
                        <td className="p-2 text-center">{Number(it.unit_price).toFixed(2)}</td>
                        <td className="p-2 text-center">{Number(it.amount).toFixed(2)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
                <div className="flex justify-between items-end gap-4">
                  {tenant?.bank_details && (
                    <div className="max-w-xs rounded border border-dashed border-gray-400 p-2 text-xs whitespace-pre-line">
                      <b>البنك:</b> {tenant.bank_details}
                    </div>
                  )}
                  <div className="w-64 space-y-1 text-sm">
                    <div className="flex justify-between"><span>المجموع الجزئي:</span><span>{formatMoney(viewing.subtotal, tenant?.currency)}</span></div>
                    <div className="flex justify-between"><span>TVA {viewing.tax_rate}%:</span><span>{formatMoney(viewing.tax_amount, tenant?.currency)}</span></div>
                    <div className="flex justify-between font-bold text-lg border-t pt-1"><span>الإجمالي:</span><span>{formatMoney(viewing.total, tenant?.currency)}</span></div>
                  </div>
                </div>
                {viewing.notes && <div className="mt-4 pt-4 border-t text-sm whitespace-pre-line"><b>ملاحظات:</b> {viewing.notes}</div>}
                {stampUrl && (
                  <img src={stampUrl} alt="stamp" className="absolute bottom-6 left-6 h-24 opacity-80 -rotate-6" />
                )}
                {tenant?.invoice_footer && (
                  <div className="mt-6 pt-3 border-t text-center text-xs text-gray-600 whitespace-pre-line">{tenant.invoice_footer}</div>
                )}
              </div>
              <DialogFooter className="print:hidden">
                <Button variant="outline" onClick={() => exportCSV(viewing, viewItems)}>
                  <Download className="ms-2 h-4 w-4" />تصدير CSV
                </Button>
                <Button onClick={() => window.print()}>
                  <Printer className="ms-2 h-4 w-4" />طباعة / PDF
                </Button>
              </DialogFooter>
            </>
          )}
        </DialogContent>
      </Dialog>

      <style>{`
        @media print {
          body * { visibility: hidden !important; }
          #print-area, #print-area * { visibility: visible !important; }
          #print-area { position: absolute; inset: 0; }
        }
      `}</style>
    </>
  );
}

function KPI({ label, value, tone }: { label: string; value: string; tone?: "success" | "warn" }) {
  const color = tone === "success" ? "text-emerald-600" : tone === "warn" ? "text-amber-600" : "text-foreground";
  return (
    <div className="rounded-lg border bg-card p-4">
      <div className="text-xs text-muted-foreground mb-1">{label}</div>
      <div className={`text-2xl font-bold ${color}`}>{value}</div>
    </div>
  );
}

function exportCSV(inv: Invoice, items: Array<Item & { id: string; amount: number }>) {
  const rows = [
    ["رقم الفاتورة", inv.invoice_number],
    ["التاريخ", inv.issue_date],
    ["الحالة", inv.status],
    ["المجموع الجزئي", inv.subtotal.toString()],
    ["TVA", inv.tax_amount.toString()],
    ["الإجمالي", inv.total.toString()],
    [],
    ["الوصف", "الكمية", "السعر", "الإجمالي"],
    ...items.map((i) => [i.description, i.quantity.toString(), i.unit_price.toString(), i.amount.toString()]),
  ];
  const csv = "\uFEFF" + rows.map((r) => r.map((c) => `"${String(c ?? "").replace(/"/g, '""')}"`).join(",")).join("\n");
  const blob = new Blob([csv], { type: "text/csv;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `${inv.invoice_number}.csv`;
  a.click();
  URL.revokeObjectURL(url);
}
