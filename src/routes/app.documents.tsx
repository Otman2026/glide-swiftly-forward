import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState, useRef } from "react";
import { PageHeader, EmptyState } from "@/components/dashboard-layout";
import { FolderArchive, Upload, FileText, Trash2, Loader2, Download, AlertTriangle } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle, DialogTrigger,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { SearchInput, matchQuery } from "@/components/search-input";

export const Route = createFileRoute("/app/documents")({
  component: DocumentsPage,
});

const DOC_TYPES = [
  { key: "CMR", label: "CMR — وثيقة النقل الدولي" },
  { key: "BON_TRANSPORT", label: "Bon de Transport — بيان النقل" },
  { key: "BON_LIVRAISON", label: "Bon de Livraison — بيان التسليم" },
  { key: "FACTURE", label: "Facture — فاتورة" },
  { key: "ASSURANCE", label: "Assurance — تأمين" },
  { key: "CARTE_GRISE", label: "Carte Grise — بطاقة التسجيل" },
  { key: "CONTROLE_TECHNIQUE", label: "Contrôle Technique — الفحص التقني" },
  { key: "LICENSE", label: "رخصة السائق" },
  { key: "AUTRE", label: "أخرى" },
];

type Doc = {
  id: string;
  doc_type: string;
  title: string;
  file_path: string;
  file_size: number | null;
  reference_number: string | null;
  issue_date: string | null;
  expiry_date: string | null;
  created_at: string;
};

function DocumentsPage() {
  const [rows, setRows] = useState<Doc[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState("");
  const [q, setQ] = useState("");
  const [open, setOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);
  const [form, setForm] = useState({
    doc_type: "FACTURE",
    title: "",
    reference_number: "",
    issue_date: "",
    expiry_date: "",
  });

  const load = async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from("documents")
      .select("id,doc_type,title,file_path,file_size,reference_number,issue_date,expiry_date,created_at")
      .order("created_at", { ascending: false });
    if (error) toast.error(error.message);
    else setRows(data ?? []);
    setLoading(false);
  };

  useEffect(() => { load(); }, []);

  const onUpload = async (e: React.FormEvent) => {
    e.preventDefault();
    const file = fileRef.current?.files?.[0];
    if (!file) { toast.error("اختر ملفاً"); return; }
    setSaving(true);
    const { data: profile } = await supabase.from("profiles").select("tenant_id").maybeSingle();
    if (!profile?.tenant_id) { toast.error("لا توجد شركة"); setSaving(false); return; }
    const path = `${profile.tenant_id}/${crypto.randomUUID()}-${file.name}`;
    const up = await supabase.storage.from("documents").upload(path, file);
    if (up.error) { toast.error(up.error.message); setSaving(false); return; }
    const { error } = await supabase.from("documents").insert({
      tenant_id: profile.tenant_id,
      doc_type: form.doc_type,
      title: form.title || file.name,
      file_path: path,
      file_size: file.size,
      mime_type: file.type,
      reference_number: form.reference_number || null,
      issue_date: form.issue_date || null,
      expiry_date: form.expiry_date || null,
    });
    setSaving(false);
    if (error) { toast.error(error.message); return; }
    toast.success("تم رفع الوثيقة");
    setOpen(false);
    setForm({ doc_type: "FACTURE", title: "", reference_number: "", issue_date: "", expiry_date: "" });
    if (fileRef.current) fileRef.current.value = "";
    load();
  };

  const onDownload = async (d: Doc) => {
    const { data, error } = await supabase.storage.from("documents").createSignedUrl(d.file_path, 60);
    if (error || !data) { toast.error("تعذر التنزيل"); return; }
    window.open(data.signedUrl, "_blank");
  };

  const onDelete = async (d: Doc) => {
    if (!confirm("حذف هذه الوثيقة؟")) return;
    await supabase.storage.from("documents").remove([d.file_path]);
    const { error } = await supabase.from("documents").delete().eq("id", d.id);
    if (error) toast.error(error.message);
    else { toast.success("تم الحذف"); load(); }
  };

  const byType = filter === "ALL" || !filter ? rows : rows.filter(r => r.doc_type === filter);
  const filtered = matchQuery(byType, q, ["title", "reference_number"]);
  const now = new Date();
  const expiringSoon = rows.filter(r => r.expiry_date && new Date(r.expiry_date) < new Date(now.getTime() + 30 * 86400000));

  const countByType = (k: string) => rows.filter(r => r.doc_type === k).length;

  return (
    <>
      <PageHeader
        title="أرشيف الوثائق الإلكترونية"
        subtitle="CMR · Bon de Transport · BL · Factures · Assurances · Cartes Grises · Contrôles Techniques"
        action={
          <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger asChild>
              <Button className="gap-2 bg-accent text-accent-foreground hover:bg-accent/90">
                <Upload className="h-4 w-4" /> رفع وثيقة
              </Button>
            </DialogTrigger>
            <DialogContent dir="rtl">
              <DialogHeader><DialogTitle>رفع وثيقة جديدة</DialogTitle></DialogHeader>
              <form onSubmit={onUpload} className="space-y-4">
                <div>
                  <Label>نوع الوثيقة *</Label>
                  <select value={form.doc_type} onChange={(e) => setForm({ ...form, doc_type: e.target.value })} className="h-10 w-full rounded-md border border-border bg-background px-3 text-sm">
                    {DOC_TYPES.map(t => <option key={t.key} value={t.key}>{t.label}</option>)}
                  </select>
                </div>
                <div><Label>العنوان</Label><Input value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} placeholder="سيُستخدم اسم الملف إذا تُرك فارغاً" /></div>
                <div><Label>الرقم المرجعي</Label><Input dir="ltr" value={form.reference_number} onChange={(e) => setForm({ ...form, reference_number: e.target.value })} /></div>
                <div className="grid grid-cols-2 gap-3">
                  <div><Label>تاريخ الإصدار</Label><Input type="date" value={form.issue_date} onChange={(e) => setForm({ ...form, issue_date: e.target.value })} /></div>
                  <div><Label>تاريخ الانتهاء</Label><Input type="date" value={form.expiry_date} onChange={(e) => setForm({ ...form, expiry_date: e.target.value })} /></div>
                </div>
                <div>
                  <Label>الملف *</Label>
                  <input ref={fileRef} type="file" required accept="application/pdf,image/*" className="mt-1 block w-full text-sm text-foreground file:mr-4 file:rounded-md file:border-0 file:bg-accent file:px-4 file:py-2 file:text-accent-foreground" />
                </div>
                <DialogFooter>
                  <Button type="submit" disabled={saving} className="gap-2 bg-accent text-accent-foreground hover:bg-accent/90">
                    {saving && <Loader2 className="h-4 w-4 animate-spin" />} رفع
                  </Button>
                </DialogFooter>
              </form>
            </DialogContent>
          </Dialog>
        }
      />

      {expiringSoon.length > 0 && (
        <div className="mb-4 flex items-center gap-3 rounded-2xl border border-destructive/30 bg-destructive/5 p-4">
          <AlertTriangle className="h-5 w-5 text-destructive" />
          <div className="text-sm"><span className="font-bold text-destructive">{expiringSoon.length}</span> وثيقة تنتهي خلال 30 يوماً</div>
        </div>
      )}

      <div className="mb-3"><SearchInput value={q} onChange={setQ} placeholder="ابحث بالعنوان أو المرجع…" /></div>
      <div className="mb-4 flex flex-wrap gap-2">
        <button onClick={() => setFilter("ALL")} className={`rounded-full px-4 py-2 text-xs font-semibold transition ${!filter || filter === "ALL" ? "bg-accent text-accent-foreground" : "bg-secondary text-muted-foreground hover:bg-secondary/70"}`}>الكل ({rows.length})</button>
        {DOC_TYPES.map(t => (
          <button key={t.key} onClick={() => setFilter(t.key)} className={`rounded-full px-4 py-2 text-xs font-semibold transition ${filter === t.key ? "bg-accent text-accent-foreground" : "bg-secondary text-muted-foreground hover:bg-secondary/70"}`}>
            {t.label.split(" — ")[0]} ({countByType(t.key)})
          </button>
        ))}
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-16"><Loader2 className="h-6 w-6 animate-spin text-accent" /></div>
      ) : filtered.length === 0 ? (
        <EmptyState icon={FolderArchive} title="لا توجد وثائق" description="ابدأ برفع أول وثيقة (CMR، فاتورة، تأمين...)." />
      ) : (
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {filtered.map(d => {
            const expired = d.expiry_date && new Date(d.expiry_date) < now;
            const soon = d.expiry_date && !expired && new Date(d.expiry_date) < new Date(now.getTime() + 30 * 86400000);
            return (
              <div key={d.id} className="group rounded-2xl border border-border bg-card p-5 transition hover:shadow-elegant">
                <div className="flex items-start justify-between">
                  <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-accent/10 text-accent">
                    <FileText className="h-5 w-5" />
                  </div>
                  {expired && <span className="rounded-full bg-destructive/10 px-2 py-1 text-xs font-bold text-destructive">منتهية</span>}
                  {soon && <span className="rounded-full bg-orange-500/10 px-2 py-1 text-xs font-bold text-orange-600">قريبة الانتهاء</span>}
                </div>
                <div className="mt-3 font-bold text-foreground line-clamp-2" title={d.title}>{d.title}</div>
                <div className="mt-1 text-xs text-muted-foreground">{DOC_TYPES.find(t => t.key === d.doc_type)?.label.split(" — ")[0] ?? d.doc_type}</div>
                {d.reference_number && <div className="mt-1 font-mono text-xs text-muted-foreground" dir="ltr">#{d.reference_number}</div>}
                {d.expiry_date && <div className="mt-1 text-xs text-muted-foreground">تنتهي: <span dir="ltr">{d.expiry_date}</span></div>}
                <div className="mt-4 flex gap-2">
                  <Button size="sm" variant="outline" className="flex-1 gap-2" onClick={() => onDownload(d)}>
                    <Download className="h-4 w-4" /> فتح
                  </Button>
                  <Button size="sm" variant="ghost" onClick={() => onDelete(d)} className="text-destructive hover:bg-destructive/10 hover:text-destructive">
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </>
  );
}
