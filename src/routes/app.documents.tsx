import { createFileRoute } from "@tanstack/react-router";
import { PageHeader } from "@/components/dashboard-layout";
import { FolderArchive, Upload, FileText } from "lucide-react";
import { Button } from "@/components/ui/button";

export const Route = createFileRoute("/app/documents")({
  component: DocumentsPage,
});

const DOC_TYPES = [
  { key: "CMR", desc: "وثيقة النقل الدولية", count: 24 },
  { key: "Bon de Transport", desc: "بيان النقل", count: 156 },
  { key: "Bon de Livraison", desc: "بيان التسليم", count: 148 },
  { key: "Factures", desc: "الفواتير", count: 87 },
  { key: "Assurances", desc: "التأمينات", count: 48 },
  { key: "Cartes Grises", desc: "بطاقات التسجيل", count: 48 },
  { key: "Contrôles Techniques", desc: "الفحص التقني", count: 48 },
];

function DocumentsPage() {
  return (
    <>
      <PageHeader
        title="أرشيف الوثائق الإلكترونية"
        subtitle="CMR, Bon de Transport, BL, Factures, Assurances, Cartes Grises, Contrôles Techniques"
        action={
          <Button className="gap-2 bg-accent text-accent-foreground hover:bg-accent/90">
            <Upload className="h-4 w-4" />
            رفع وثيقة
          </Button>
        }
      />

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
        {DOC_TYPES.map((t) => (
          <div key={t.key} className="group cursor-pointer rounded-2xl border border-border bg-card p-5 transition hover:border-accent/50 hover:shadow-elegant">
            <div className="flex items-start justify-between">
              <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-accent/10 text-accent">
                <FileText className="h-5 w-5" />
              </div>
              <span className="text-2xl font-black text-primary">{t.count}</span>
            </div>
            <div className="mt-4 font-bold text-foreground">{t.key}</div>
            <div className="text-xs text-muted-foreground">{t.desc}</div>
          </div>
        ))}
        <div className="flex items-center justify-center rounded-2xl border-2 border-dashed border-border p-5 text-muted-foreground">
          <FolderArchive className="ml-2 h-5 w-5" />
          <span className="text-sm">نوع وثيقة مخصص</span>
        </div>
      </div>
    </>
  );
}
