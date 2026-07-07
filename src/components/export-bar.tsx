import { FileSpreadsheet, FileText, Printer, FileDown } from "lucide-react";
import { useExport, type ExportOptions } from "@/hooks/use-export";

export function ExportBar<T>(props: ExportOptions<T> & { showPrint?: boolean }) {
  const { exportExcel, exportCSV, exportPDF, print } = useExport();
  const { showPrint = true, ...opts } = props;
  const disabled = opts.rows.length === 0;
  const btn =
    "inline-flex items-center gap-1.5 rounded-lg border border-border bg-background px-3 py-1.5 text-xs font-semibold hover:bg-secondary disabled:opacity-40 disabled:cursor-not-allowed";
  return (
    <div className="flex flex-wrap items-center gap-2 print:hidden">
      <button className={btn} disabled={disabled} onClick={() => exportExcel(opts)}>
        <FileSpreadsheet className="h-3.5 w-3.5" /> Excel
      </button>
      <button className={btn} disabled={disabled} onClick={() => exportCSV(opts)}>
        <FileDown className="h-3.5 w-3.5" /> CSV
      </button>
      <button className={btn} disabled={disabled} onClick={() => exportPDF(opts)}>
        <FileText className="h-3.5 w-3.5" /> PDF
      </button>
      {showPrint && (
        <button className={btn} onClick={print}>
          <Printer className="h-3.5 w-3.5" /> طباعة
        </button>
      )}
    </div>
  );
}
