import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { PageHeader } from "@/components/dashboard-layout";
import { supabase } from "@/integrations/supabase/client";
import { FileDown, FileText, FileSpreadsheet, Loader2, TrendingUp, TrendingDown, Wallet, Printer } from "lucide-react";
import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";
import * as XLSX from "xlsx";
import { printHTML, esc } from "@/lib/print";

export const Route = createFileRoute("/app/reports")({
  component: ReportsPage,
});

type Row = Record<string, string | number>;

const toCsv = (rows: Row[], filename: string) => {
  if (!rows.length) return;
  const headers = Object.keys(rows[0]);
  const escape = (v: any) => {
    const s = String(v ?? "");
    return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
  };
  const csv = [headers.join(","), ...rows.map((r) => headers.map((h) => escape(r[h])).join(","))].join("\n");
  const blob = new Blob(["\uFEFF" + csv], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
};

const toXlsx = (rows: Row[], filename: string, sheetName = "Report") => {
  if (!rows.length) return;
  const ws = XLSX.utils.json_to_sheet(rows);
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, sheetName.slice(0, 31));
  XLSX.writeFile(wb, filename);
};

const toPdf = (rows: Row[], filename: string, title: string) => {
  if (!rows.length) return;
  const doc = new jsPDF({ orientation: "landscape" });
  doc.setFontSize(14);
  doc.text(title, doc.internal.pageSize.getWidth() / 2, 14, { align: "center" });
  const headers = Object.keys(rows[0]);
  autoTable(doc, {
    startY: 22,
    head: [headers],
    body: rows.map((r) => headers.map((h) => String(r[h] ?? ""))),
    styles: { fontSize: 9, cellPadding: 3 },
    headStyles: { fillColor: [30, 41, 59], textColor: 255 },
    alternateRowStyles: { fillColor: [245, 247, 250] },
  });
  doc.save(filename);
};

const toPrint = (rows: Row[], title: string, subtitle: string) => {
  const headers = rows.length ? Object.keys(rows[0]) : [];
  const body = `<h1>${esc(title)}</h1><h2>${esc(subtitle)}</h2>` + (rows.length ? `
    <table><thead><tr>${headers.map((h) => `<th>${esc(h)}</th>`).join("")}</tr></thead>
    <tbody>${rows.map((r) => `<tr>${headers.map((h) => `<td>${esc(r[h])}</td>`).join("")}</tr>`).join("")}</tbody></table>
  ` : `<p style="text-align:center;color:#64748b;padding:40px">لا توجد بيانات في الفترة المحددة.</p>`);
  printHTML(title, body);
};



function ReportsPage() {
  const today = new Date().toISOString().slice(0, 10);
  const monthAgo = new Date(Date.now() - 30 * 864e5).toISOString().slice(0, 10);
  const [from, setFrom] = useState(monthAgo);
  const [to, setTo] = useState(today);
  const [tab, setTab] = useState<"pnl" | "vehicle" | "customer" | "driver">("pnl");
  const [loading, setLoading] = useState(false);
  const [data, setData] = useState<{
    orders: any[];
    expenses: any[];
    fuel: any[];
    maintenance: any[];
    incidents: any[];
    vehicles: any[];
    customers: any[];
    drivers: any[];
    trips: any[];
  } | null>(null);

  const load = async () => {
    setLoading(true);
    const fromIso = `${from}T00:00:00Z`;
    const toIso = `${to}T23:59:59Z`;
    const [orders, expenses, fuel, maintenance, incidents, vehicles, customers, drivers, trips] = await Promise.all([
      supabase.from("transport_orders").select("id,price,status,customer_id,created_at").gte("created_at", fromIso).lte("created_at", toIso),
      supabase.from("expenses").select("amount,expense_date,category").gte("expense_date", from).lte("expense_date", to),
      supabase.from("fuel_logs").select("liters,cost,vehicle_id,fuel_date").gte("fuel_date", from).lte("fuel_date", to),
      supabase.from("maintenance_records").select("cost,vehicle_id,completed_date").gte("completed_date", from).lte("completed_date", to),
      supabase.from("incidents").select("repair_cost,vehicle_id,driver_id,incident_date").gte("incident_date", from).lte("incident_date", to),
      supabase.from("vehicles").select("id,plate_number,brand,model"),
      supabase.from("customers").select("id,name"),
      supabase.from("drivers").select("id,full_name"),
      supabase.from("trips").select("id,vehicle_id,driver_id,distance_km,created_at").gte("created_at", fromIso).lte("created_at", toIso),
    ]);
    setData({
      orders: orders.data ?? [],
      expenses: expenses.data ?? [],
      fuel: fuel.data ?? [],
      maintenance: maintenance.data ?? [],
      incidents: incidents.data ?? [],
      vehicles: vehicles.data ?? [],
      customers: customers.data ?? [],
      drivers: drivers.data ?? [],
      trips: trips.data ?? [],
    });
    setLoading(false);
  };

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const sum = (arr: any[], k: string) => arr.reduce((a, b) => a + Number(b[k] ?? 0), 0);

  const pnl = useMemo(() => {
    if (!data) return null;
    const revenue = sum(data.orders.filter((o) => o.status === "delivered"), "price");
    const expenses = sum(data.expenses, "amount");
    const fuel = sum(data.fuel, "cost");
    const maint = sum(data.maintenance, "cost");
    const inc = sum(data.incidents, "repair_cost");
    const cost = expenses + fuel + maint + inc;
    return { revenue, expenses, fuel, maint, inc, cost, net: revenue - cost };
  }, [data]);

  const byVehicle = useMemo<Row[]>(() => {
    if (!data) return [];
    return data.vehicles.map((v) => {
      const fuelCost = sum(data.fuel.filter((f) => f.vehicle_id === v.id), "cost");
      const maintCost = sum(data.maintenance.filter((m) => m.vehicle_id === v.id), "cost");
      const incCost = sum(data.incidents.filter((i) => i.vehicle_id === v.id), "repair_cost");
      const km = sum(data.trips.filter((t) => t.vehicle_id === v.id), "distance_km");
      const total = fuelCost + maintCost + incCost;
      return {
        "المركبة": `${v.plate_number} — ${v.brand ?? ""} ${v.model ?? ""}`.trim(),
        "المسافة (كم)": km.toFixed(0),
        "الوقود (MAD)": fuelCost.toFixed(2),
        "الصيانة (MAD)": maintCost.toFixed(2),
        "الحوادث (MAD)": incCost.toFixed(2),
        "الإجمالي (MAD)": total.toFixed(2),
        "MAD/كم": km > 0 ? (total / km).toFixed(2) : "—",
      };
    });
  }, [data]);

  const byCustomer = useMemo<Row[]>(() => {
    if (!data) return [];
    return data.customers
      .map((c) => {
        const orders = data.orders.filter((o) => o.customer_id === c.id);
        const delivered = orders.filter((o) => o.status === "delivered");
        return {
          "العميل": c.name,
          "عدد الطلبات": orders.length,
          "المسلّم": delivered.length,
          "الإيرادات (MAD)": sum(delivered, "price").toFixed(2),
        };
      })
      .filter((r) => Number(r["عدد الطلبات"]) > 0)
      .sort((a, b) => Number(b["الإيرادات (MAD)"]) - Number(a["الإيرادات (MAD)"]));
  }, [data]);

  const byDriver = useMemo<Row[]>(() => {
    if (!data) return [];
    return data.drivers
      .map((d) => {
        const trips = data.trips.filter((t) => t.driver_id === d.id);
        const incs = data.incidents.filter((i) => i.driver_id === d.id);
        return {
          "السائق": d.full_name,
          "عدد الرحلات": trips.length,
          "المسافة (كم)": sum(trips, "distance_km").toFixed(0),
          "الحوادث": incs.length,
          "تكلفة الحوادث (MAD)": sum(incs, "repair_cost").toFixed(2),
        };
      })
      .filter((r) => Number(r["عدد الرحلات"]) > 0 || Number(r["الحوادث"]) > 0);
  }, [data]);

  const rows = tab === "vehicle" ? byVehicle : tab === "customer" ? byCustomer : tab === "driver" ? byDriver : [];

  return (
    <>
      <PageHeader
        title="مركز التقارير"
        subtitle="تقارير مالية وتشغيلية قابلة للتصدير"
        action={(() => {
          const exportRows = rows.length ? rows : pnlRows(pnl);
          const base = `saifo-report-${tab}-${from}_${to}`;
          const title = `تقرير SAIFO — ${tab} — ${from} → ${to}`;
          const disabled = loading || !data;
          const btn = "flex h-10 items-center gap-2 rounded-lg px-3 text-sm font-semibold disabled:opacity-50";
          return (
            <div className="flex flex-wrap gap-2">
              <button onClick={() => toCsv(exportRows, `${base}.csv`)} disabled={disabled}
                className={`${btn} bg-secondary hover:bg-secondary/80`}>
                <FileDown className="h-4 w-4" /> CSV
              </button>
              <button onClick={() => toXlsx(exportRows, `${base}.xlsx`, tab)} disabled={disabled}
                className={`${btn} bg-success/10 text-success hover:bg-success/20`}>
                <FileSpreadsheet className="h-4 w-4" /> Excel
              </button>
              <button onClick={() => toPdf(exportRows, `${base}.pdf`, title)} disabled={disabled}
                className={`${btn} bg-destructive/10 text-destructive hover:bg-destructive/20`}>
                <FileText className="h-4 w-4" /> PDF
              </button>
            </div>
          );
        })()}
      />

      <div className="mb-4 flex flex-wrap items-end gap-3 rounded-2xl border border-border bg-card p-4">
        <div>
          <label className="mb-1 block text-xs font-semibold text-muted-foreground">من</label>
          <input type="date" value={from} onChange={(e) => setFrom(e.target.value)} className="h-10 rounded-lg border border-border bg-background px-3 text-sm" />
        </div>
        <div>
          <label className="mb-1 block text-xs font-semibold text-muted-foreground">إلى</label>
          <input type="date" value={to} onChange={(e) => setTo(e.target.value)} className="h-10 rounded-lg border border-border bg-background px-3 text-sm" />
        </div>
        <button onClick={load} disabled={loading} className="h-10 rounded-lg bg-primary px-4 text-sm font-semibold text-primary-foreground hover:bg-primary/90 disabled:opacity-50">
          {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : "تحديث"}
        </button>
      </div>

      <div className="mb-4 flex flex-wrap gap-2">
        {([
          { k: "pnl", l: "الأرباح والخسائر" },
          { k: "vehicle", l: "حسب المركبة" },
          { k: "customer", l: "حسب العميل" },
          { k: "driver", l: "حسب السائق" },
        ] as const).map((t) => (
          <button
            key={t.k}
            onClick={() => setTab(t.k)}
            className={`rounded-lg px-4 py-2 text-sm font-semibold transition ${
              tab === t.k ? "bg-primary text-primary-foreground" : "bg-secondary hover:bg-secondary/80"
            }`}
          >
            {t.l}
          </button>
        ))}
      </div>

      {loading || !data || !pnl ? (
        <div className="flex justify-center py-16"><Loader2 className="h-6 w-6 animate-spin text-accent" /></div>
      ) : tab === "pnl" ? (
        <div className="space-y-4">
          <div className="grid gap-4 md:grid-cols-3">
            <StatCard label="الإيرادات" value={pnl.revenue} tint="text-success" icon={TrendingUp} />
            <StatCard label="التكاليف" value={pnl.cost} tint="text-destructive" icon={TrendingDown} />
            <StatCard label="صافي الربح" value={pnl.net} tint={pnl.net >= 0 ? "text-primary" : "text-destructive"} icon={Wallet} />
          </div>
          <div className="overflow-hidden rounded-2xl border border-border bg-card">
            <table className="w-full text-sm">
              <thead className="bg-secondary/60 text-xs uppercase">
                <tr><th className="p-3 text-right">البند</th><th className="p-3 text-left">المبلغ (MAD)</th></tr>
              </thead>
              <tbody>
                <Line label="إيرادات الطلبات المسلّمة" value={pnl.revenue} positive />
                <Line label="مصاريف عامة" value={-pnl.expenses} />
                <Line label="وقود" value={-pnl.fuel} />
                <Line label="صيانة" value={-pnl.maint} />
                <Line label="حوادث" value={-pnl.inc} />
                <tr className="border-t-2 border-border bg-secondary/40 font-black">
                  <td className="p-3">صافي الربح</td>
                  <td className={`p-3 text-left ${pnl.net >= 0 ? "text-success" : "text-destructive"}`}>{pnl.net.toFixed(2)}</td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>
      ) : (
        <DataTable rows={rows} />
      )}
    </>
  );
}

function pnlRows(pnl: any): Row[] {
  if (!pnl) return [];
  return [
    { "البند": "الإيرادات", "المبلغ (MAD)": pnl.revenue.toFixed(2) },
    { "البند": "مصاريف عامة", "المبلغ (MAD)": (-pnl.expenses).toFixed(2) },
    { "البند": "وقود", "المبلغ (MAD)": (-pnl.fuel).toFixed(2) },
    { "البند": "صيانة", "المبلغ (MAD)": (-pnl.maint).toFixed(2) },
    { "البند": "حوادث", "المبلغ (MAD)": (-pnl.inc).toFixed(2) },
    { "البند": "صافي الربح", "المبلغ (MAD)": pnl.net.toFixed(2) },
  ];
}

function StatCard({ label, value, tint, icon: Icon }: { label: string; value: number; tint: string; icon: any }) {
  return (
    <div className="rounded-2xl border border-border bg-card p-6">
      <div className="mb-2 flex items-center justify-between">
        <div className="text-xs text-muted-foreground">{label}</div>
        <Icon className={`h-5 w-5 ${tint}`} />
      </div>
      <div className={`text-3xl font-black ${tint}`}>{(value / 1000).toFixed(1)}K MAD</div>
    </div>
  );
}

function Line({ label, value, positive }: { label: string; value: number; positive?: boolean }) {
  return (
    <tr className="border-t border-border">
      <td className="p-3">{label}</td>
      <td className={`p-3 text-left font-semibold ${positive ? "text-success" : value < 0 ? "text-destructive" : ""}`}>{value.toFixed(2)}</td>
    </tr>
  );
}

function DataTable({ rows }: { rows: Row[] }) {
  if (!rows.length) return <div className="rounded-2xl border border-border bg-card p-10 text-center text-muted-foreground">لا توجد بيانات في هذه الفترة</div>;
  const headers = Object.keys(rows[0]);
  return (
    <div className="overflow-x-auto rounded-2xl border border-border bg-card">
      <table className="w-full text-sm">
        <thead className="bg-secondary/60 text-xs uppercase">
          <tr>{headers.map((h) => <th key={h} className="p-3 text-right font-bold">{h}</th>)}</tr>
        </thead>
        <tbody>
          {rows.map((r, i) => (
            <tr key={i} className="border-t border-border hover:bg-secondary/30">
              {headers.map((h) => <td key={h} className="p-3">{r[h]}</td>)}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
