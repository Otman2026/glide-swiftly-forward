import { useCallback } from "react";
import * as XLSX from "xlsx";
import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";
import { toast } from "sonner";

export type ExportColumn<T> = {
  key: keyof T | string;
  label: string;
  format?: (row: T) => string | number;
};

export type ExportOptions<T> = {
  filename: string;
  title?: string;
  columns: ExportColumn<T>[];
  rows: T[];
};

function cellValue<T>(row: T, col: ExportColumn<T>): string | number {
  if (col.format) return col.format(row);
  const v = (row as Record<string, unknown>)[col.key as string];
  if (v === null || v === undefined) return "";
  if (typeof v === "number") return v;
  return String(v);
}

export function useExport() {
  const exportExcel = useCallback(<T,>(opts: ExportOptions<T>) => {
    try {
      const data = opts.rows.map((row) => {
        const obj: Record<string, string | number> = {};
        opts.columns.forEach((c) => (obj[c.label] = cellValue(row, c)));
        return obj;
      });
      const ws = XLSX.utils.json_to_sheet(data);
      const wb = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(wb, ws, "Sheet1");
      XLSX.writeFile(wb, `${opts.filename}.xlsx`);
      toast.success("تم تصدير Excel");
    } catch (e) {
      console.error(e);
      toast.error("فشل تصدير Excel");
    }
  }, []);

  const exportCSV = useCallback(<T,>(opts: ExportOptions<T>) => {
    try {
      const header = opts.columns.map((c) => `"${c.label}"`).join(",");
      const lines = opts.rows.map((row) =>
        opts.columns
          .map((c) => {
            const v = String(cellValue(row, c)).replace(/"/g, '""');
            return `"${v}"`;
          })
          .join(","),
      );
      const csv = "\uFEFF" + [header, ...lines].join("\n");
      const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `${opts.filename}.csv`;
      a.click();
      URL.revokeObjectURL(url);
      toast.success("تم تصدير CSV");
    } catch (e) {
      console.error(e);
      toast.error("فشل تصدير CSV");
    }
  }, []);

  const exportPDF = useCallback(<T,>(opts: ExportOptions<T>) => {
    try {
      const doc = new jsPDF({ orientation: "landscape" });
      if (opts.title) {
        doc.setFontSize(14);
        doc.text(opts.title, 14, 14);
      }
      autoTable(doc, {
        startY: opts.title ? 20 : 10,
        head: [opts.columns.map((c) => c.label)],
        body: opts.rows.map((row) =>
          opts.columns.map((c) => String(cellValue(row, c))),
        ),
        styles: { fontSize: 9 },
        headStyles: { fillColor: [30, 41, 59] },
      });
      doc.save(`${opts.filename}.pdf`);
      toast.success("تم تصدير PDF");
    } catch (e) {
      console.error(e);
      toast.error("فشل تصدير PDF");
    }
  }, []);

  const print = useCallback(() => window.print(), []);

  return { exportExcel, exportCSV, exportPDF, print };
}
