import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { PageHeader } from "@/components/dashboard-layout";
import { Loader2, ArrowRight, User, Phone, Mail, MapPin, FileText, Receipt, Truck, ClipboardList, FolderArchive } from "lucide-react";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";

export const Route = createFileRoute("/app/customers/$id")({ component: Customer360Page });

function Customer360Page() {
  const { id } = Route.useParams();
  const [loading, setLoading] = useState(true);
  const [customer, setCustomer] = useState<any>(null);
  const [contracts, setContracts] = useState<any[]>([]);
  const [invoices, setInvoices] = useState<any[]>([]);
  const [trips, setTrips] = useState<any[]>([]);
  const [orders, setOrders] = useState<any[]>([]);
  const [docs, setDocs] = useState<any[]>([]);

  useEffect(() => {
    (async () => {
      setLoading(true);
      const [c, ct, inv, tr, or, dc] = await Promise.all([
        supabase.from("customers").select("*").eq("id", id).maybeSingle(),
        supabase.from("contracts").select("id,start_date,end_date,total_amount,status,archived_at").eq("customer_id", id).order("created_at", { ascending: false }),
        supabase.from("invoices").select("id,invoice_number,total_amount,status,issue_date,due_date").eq("customer_id", id).order("issue_date", { ascending: false }),
        supabase.from("trips").select("id,trip_number,status,revenue,started_at,completed_at").eq("customer_id", id).order("created_at", { ascending: false }).limit(20),
        supabase.from("transport_orders").select("id,order_number,status,origin,destination,created_at").eq("customer_id", id).order("created_at", { ascending: false }).limit(20),
        supabase.from("documents").select("id,title,category,created_at").eq("customer_id", id).order("created_at", { ascending: false }).limit(20),
      ]);
      if (c.error) toast.error(c.error.message);
      setCustomer(c.data);
      setContracts(ct.data ?? []);
      setInvoices(inv.data ?? []);
      setTrips(tr.data ?? []);
      setOrders(or.data ?? []);
      setDocs(dc.data ?? []);
      setLoading(false);
    })();
  }, [id]);

  if (loading) return <div className="flex items-center justify-center py-16"><Loader2 className="h-6 w-6 animate-spin text-accent" /></div>;
  if (!customer) return <div className="p-8 text-center text-muted-foreground">لم يتم العثور على العميل.</div>;

  const totalInvoiced = invoices.reduce((s, i) => s + Number(i.total_amount || 0), 0);
  const totalPaid = invoices.filter((i) => i.status === "paid").reduce((s, i) => s + Number(i.total_amount || 0), 0);
  const outstanding = totalInvoiced - totalPaid;
  const revenue = trips.reduce((s, t) => s + Number(t.revenue || 0), 0);

  return (
    <>
      <PageHeader
        title={customer.name}
        subtitle="ملف العميل 360° — نظرة شاملة على جميع التعاملات."
        action={<Link to="/app/customers"><Button variant="ghost" className="gap-2"><ArrowRight className="h-4 w-4" /> العودة</Button></Link>}
      />

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4 mb-6">
        <Stat label="إجمالي الفواتير" value={totalInvoiced.toLocaleString()} icon={Receipt} />
        <Stat label="مدفوعات" value={totalPaid.toLocaleString()} icon={Receipt} accent="text-emerald-600" />
        <Stat label="مستحقات" value={outstanding.toLocaleString()} icon={Receipt} accent="text-destructive" />
        <Stat label="إيرادات الرحلات" value={revenue.toLocaleString()} icon={Truck} />
      </div>

      <div className="grid gap-6 md:grid-cols-3 mb-6">
        <InfoCard title="معلومات الاتصال" icon={User}>
          <Row icon={Phone} label="الهاتف" value={customer.phone} />
          <Row icon={Mail} label="البريد" value={customer.email} />
          <Row icon={MapPin} label="المدينة" value={[customer.city, customer.country].filter(Boolean).join("، ")} />
          <Row label="العنوان" value={customer.address} />
          <Row label="الرقم الضريبي / ICE" value={customer.tax_id} />
        </InfoCard>

        <InfoCard title="ملاحظات">
          <p className="text-sm text-muted-foreground whitespace-pre-wrap">{customer.notes || "—"}</p>
        </InfoCard>

        <InfoCard title="ملخص النشاط">
          <Row label="عدد العقود" value={String(contracts.length)} />
          <Row label="عدد الفواتير" value={String(invoices.length)} />
          <Row label="عدد الرحلات" value={String(trips.length)} />
          <Row label="أوامر النقل" value={String(orders.length)} />
        </InfoCard>
      </div>

      <Section title="العقود" icon={FileText} items={contracts} render={(c) => (
        <>
          <td className="p-3 font-mono text-xs">{c.id.slice(0, 8)}</td>
          <td className="p-3">{c.start_date} → {c.end_date}</td>
          <td className="p-3">{Number(c.total_amount || 0).toLocaleString()}</td>
          <td className="p-3">{c.status}</td>
        </>
      )} headers={["المرجع", "الفترة", "المبلغ", "الحالة"]} />

      <Section title="الفواتير" icon={Receipt} items={invoices} render={(i) => (
        <>
          <td className="p-3 font-mono text-xs">{i.invoice_number}</td>
          <td className="p-3">{i.issue_date}</td>
          <td className="p-3">{Number(i.total_amount || 0).toLocaleString()}</td>
          <td className="p-3">{i.status}</td>
        </>
      )} headers={["الرقم", "التاريخ", "المبلغ", "الحالة"]} />

      <Section title="الرحلات" icon={Truck} items={trips} render={(t) => (
        <>
          <td className="p-3 font-mono text-xs">{t.trip_number ?? t.id.slice(0, 8)}</td>
          <td className="p-3">{t.started_at ? new Date(t.started_at).toLocaleDateString("ar") : "—"}</td>
          <td className="p-3">{Number(t.revenue || 0).toLocaleString()}</td>
          <td className="p-3">{t.status}</td>
        </>
      )} headers={["الرقم", "التاريخ", "الإيراد", "الحالة"]} />

      <Section title="أوامر النقل" icon={ClipboardList} items={orders} render={(o) => (
        <>
          <td className="p-3 font-mono text-xs">{o.order_number}</td>
          <td className="p-3">{o.origin} → {o.destination}</td>
          <td className="p-3">{o.status}</td>
        </>
      )} headers={["الرقم", "المسار", "الحالة"]} />

      <Section title="الوثائق" icon={FolderArchive} items={docs} render={(d) => (
        <>
          <td className="p-3">{d.title}</td>
          <td className="p-3">{d.category ?? "—"}</td>
          <td className="p-3 text-muted-foreground">{new Date(d.created_at).toLocaleDateString("ar")}</td>
        </>
      )} headers={["العنوان", "الفئة", "التاريخ"]} />
    </>
  );
}

function Stat({ label, value, icon: Icon, accent }: { label: string; value: string; icon: any; accent?: string }) {
  return (
    <div className="rounded-2xl border border-border bg-card p-4">
      <div className="flex items-center justify-between text-muted-foreground text-xs mb-2"><span>{label}</span><Icon className="h-4 w-4" /></div>
      <div className={"text-2xl font-black " + (accent || "text-primary")}>{value}</div>
    </div>
  );
}

function InfoCard({ title, icon: Icon, children }: { title: string; icon?: any; children: React.ReactNode }) {
  return (
    <div className="rounded-2xl border border-border bg-card p-4">
      <div className="flex items-center gap-2 mb-3 font-semibold text-primary">
        {Icon && <Icon className="h-4 w-4" />} {title}
      </div>
      <div className="space-y-2 text-sm">{children}</div>
    </div>
  );
}

function Row({ icon: Icon, label, value }: { icon?: any; label: string; value: any }) {
  return (
    <div className="flex items-start justify-between gap-2 text-sm">
      <span className="text-muted-foreground flex items-center gap-1">{Icon && <Icon className="h-3 w-3" />}{label}</span>
      <span className="font-medium text-right">{value || "—"}</span>
    </div>
  );
}

function Section<T extends { id: string }>({ title, icon: Icon, items, headers, render }: {
  title: string; icon: any; items: T[]; headers: string[]; render: (item: T) => React.ReactNode;
}) {
  return (
    <div className="mb-6">
      <div className="mb-2 flex items-center gap-2 font-semibold text-primary"><Icon className="h-4 w-4" /> {title} <span className="text-xs text-muted-foreground">({items.length})</span></div>
      {items.length === 0 ? (
        <div className="rounded-xl border border-border bg-card p-6 text-center text-sm text-muted-foreground">لا توجد سجلات.</div>
      ) : (
        <div className="rounded-2xl border border-border bg-card overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-secondary/50 text-xs uppercase text-muted-foreground">
              <tr>{headers.map((h) => <th key={h} className="p-3 text-right">{h}</th>)}</tr>
            </thead>
            <tbody>
              {items.map((it) => <tr key={it.id} className="border-t border-border hover:bg-secondary/30">{render(it)}</tr>)}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
