import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { PageHeader } from "@/components/dashboard-layout";
import { Loader2, ClipboardList, Package, Truck, CheckCircle2, FileText, XCircle } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

export const Route = createFileRoute("/app/pipeline")({ component: PipelinePage });

type OrderStatus = "pending" | "confirmed" | "assigned" | "in_transit" | "delivered" | "cancelled";

type OrderRow = {
  id: string;
  order_number: string;
  origin: string;
  destination: string;
  status: OrderStatus;
  price: number | null;
  currency: string | null;
  created_at: string;
  customers?: { name: string } | null;
  shipments?: { id: string; shipment_number: string; status: string }[];
  invoices?: { id: string; invoice_number: string; status: string; total: number }[];
};

type Stage = {
  key: "pending" | "confirmed" | "in_transit" | "delivered" | "invoiced" | "cancelled";
  label: string;
  icon: typeof ClipboardList;
  color: string;
  match: (o: OrderRow) => boolean;
};

const STAGES: Stage[] = [
  { key: "pending", label: "قيد الانتظار", icon: ClipboardList, color: "border-muted-foreground/30 bg-muted/30",
    match: (o) => o.status === "pending" },
  { key: "confirmed", label: "معتمد / معيَّن", icon: Package, color: "border-primary/40 bg-primary/5",
    match: (o) => o.status === "confirmed" || o.status === "assigned" },
  { key: "in_transit", label: "في الطريق", icon: Truck, color: "border-warning/40 bg-warning/5",
    match: (o) => o.status === "in_transit" },
  { key: "delivered", label: "مُسلَّم", icon: CheckCircle2, color: "border-success/40 bg-success/5",
    match: (o) => o.status === "delivered" && !(o.invoices && o.invoices.length > 0) },
  { key: "invoiced", label: "مُفوتَر", icon: FileText, color: "border-accent/40 bg-accent/5",
    match: (o) => o.status === "delivered" && !!o.invoices && o.invoices.length > 0 },
  { key: "cancelled", label: "ملغى", icon: XCircle, color: "border-destructive/40 bg-destructive/5",
    match: (o) => o.status === "cancelled" },
];

function PipelinePage() {
  const [rows, setRows] = useState<OrderRow[]>([]);
  const [loading, setLoading] = useState(true);

  const load = async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from("transport_orders")
      .select("id,order_number,origin,destination,status,price,currency,created_at,customers(name),shipments(id,shipment_number,status),invoices(id,invoice_number,status,total)")
      .order("created_at", { ascending: false })
      .limit(500);
    if (error) toast.error(error.message);
    else setRows((data ?? []) as unknown as OrderRow[]);
    setLoading(false);
  };
  useEffect(() => { load(); }, []);

  const totalRevenue = rows
    .filter((r) => r.status === "delivered")
    .reduce((s, r) => s + Number(r.price ?? 0), 0);

  return (
    <>
      <PageHeader
        title="دورة الطلب المرئية"
        subtitle="من الاستلام إلى التسليم والفوترة — تتبّع دورة حياة كل أمر نقل"
      />

      {loading ? (
        <div className="flex justify-center py-16">
          <Loader2 className="h-6 w-6 animate-spin text-accent" />
        </div>
      ) : (
        <>
          <div className="mb-4 grid gap-3 md:grid-cols-3">
            <StatCard label="إجمالي الأوامر" value={rows.length} />
            <StatCard
              label="مسلَّمة"
              value={rows.filter((r) => r.status === "delivered").length}
              tone="success"
            />
            <StatCard
              label="إيرادات الأوامر المسلَّمة"
              value={`${totalRevenue.toLocaleString()} MAD`}
              tone="accent"
            />
          </div>

          <div className="grid gap-4 lg:grid-cols-3 xl:grid-cols-6">
            {STAGES.map((stage) => {
              const items = rows.filter(stage.match);
              const Icon = stage.icon;
              return (
                <div
                  key={stage.key}
                  className={`rounded-2xl border-2 ${stage.color} p-3 min-h-[300px]`}
                >
                  <div className="mb-3 flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <Icon className="h-4 w-4" />
                      <span className="text-sm font-bold">{stage.label}</span>
                    </div>
                    <span className="rounded-full bg-background px-2 py-0.5 text-xs font-mono font-bold">
                      {items.length}
                    </span>
                  </div>
                  <div className="space-y-2">
                    {items.length === 0 ? (
                      <p className="text-xs text-muted-foreground text-center py-6">— لا شيء —</p>
                    ) : (
                      items.slice(0, 30).map((o) => <OrderCard key={o.id} o={o} />)
                    )}
                    {items.length > 30 && (
                      <p className="text-xs text-muted-foreground text-center">
                        + {items.length - 30} آخرين
                      </p>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </>
      )}
    </>
  );
}

function OrderCard({ o }: { o: OrderRow }) {
  const shipment = o.shipments?.[0];
  const invoice = o.invoices?.[0];
  return (
    <Link
      to="/app/orders"
      className="block rounded-lg border border-border bg-card p-3 text-xs hover:border-accent hover:shadow-sm transition"
    >
      <div className="flex items-center justify-between">
        <span className="font-mono font-bold text-primary" dir="ltr">{o.order_number}</span>
        {o.price ? (
          <span className="font-semibold">
            {Number(o.price).toLocaleString()} {o.currency ?? ""}
          </span>
        ) : null}
      </div>
      <div className="mt-1 text-muted-foreground truncate">
        {o.customers?.name ?? "—"}
      </div>
      <div className="mt-1 truncate">
        {o.origin} → {o.destination}
      </div>
      {shipment && (
        <div className="mt-1 text-[10px] text-accent font-mono" dir="ltr">
          🚚 {shipment.shipment_number}
        </div>
      )}
      {invoice && (
        <div className="mt-1 text-[10px] text-success font-mono" dir="ltr">
          📄 {invoice.invoice_number} · {Number(invoice.total).toLocaleString()}
        </div>
      )}
    </Link>
  );
}

function StatCardLocal({ label, value, tone }: { label: string; value: string | number; tone?: "success" | "accent" }) {
  const t = tone === "success" ? "success" : tone === "accent" ? "brand" : "muted";
  return <StatCard label={label} value={value} tone={t} />;
}
