import { useEffect, useRef, useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Loader2, Upload, Download, Trash2, FileText } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";

type Scope = "vehicle_id" | "driver_id" | "customer_id" | "trip_id" | "incident_id";

type DocRow = {
  id: string;
  title: string;
  doc_type: string | null;
  file_path: string;
  file_size: number | null;
  mime_type: string | null;
  expiry_date: string | null;
  created_at: string;
};

export function DocumentsDialog({
  open,
  onOpenChange,
  scope,
  refId,
  entityLabel,
}: {
  open: boolean;
  onOpenChange: (o: boolean) => void;
  scope: Scope;
  refId: string;
  entityLabel: string;
}) {
  const [rows, setRows] = useState<DocRow[]>([]);
  const [loading, setLoading] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [title, setTitle] = useState("");
  const [docType, setDocType] = useState("");
  const [expiry, setExpiry] = useState("");
  const fileRef = useRef<HTMLInputElement>(null);

  const load = async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from("documents")
      .select("id,title,doc_type,file_path,file_size,mime_type,expiry_date,created_at")
      .eq(scope, refId)
      .order("created_at", { ascending: false });
    if (error) toast.error(error.message); else setRows((data ?? []) as DocRow[]);
    setLoading(false);
  };

  useEffect(() => { if (open) load(); /* eslint-disable-next-line */ }, [open, refId]);

  const onUpload = async (e: React.FormEvent) => {
    e.preventDefault();
    const file = fileRef.current?.files?.[0];
    if (!file) return toast.error("اختر ملفاً");
    if (!title.trim()) return toast.error("أدخل عنواناً");
    setUploading(true);
    const { data: profile } = await supabase.from("profiles").select("tenant_id").maybeSingle();
    if (!profile?.tenant_id) { toast.error("لا توجد شركة"); setUploading(false); return; }
    const { data: user } = await supabase.auth.getUser();
    const path = `${profile.tenant_id}/${scope}/${refId}/${Date.now()}-${file.name}`;
    const up = await supabase.storage.from("documents").upload(path, file, { contentType: file.type });
    if (up.error) { toast.error(up.error.message); setUploading(false); return; }
    const { error } = await supabase.from("documents").insert({
      tenant_id: profile.tenant_id,
      title: title.trim(),
      doc_type: docType || null,
      file_path: path,
      file_size: file.size,
      mime_type: file.type,
      expiry_date: expiry || null,
      uploaded_by: user.user?.id ?? null,
      [scope]: refId,
    } as any);
    setUploading(false);
    if (error) { toast.error(error.message); return; }
    toast.success("تم الرفع");
    setTitle(""); setDocType(""); setExpiry("");
    if (fileRef.current) fileRef.current.value = "";
    load();
  };

  const onDownload = async (r: DocRow) => {
    const { data, error } = await supabase.storage.from("documents").createSignedUrl(r.file_path, 60);
    if (error) return toast.error(error.message);
    window.open(data.signedUrl, "_blank");
  };

  const onDelete = async (r: DocRow) => {
    if (!confirm("حذف هذه الوثيقة؟")) return;
    await supabase.storage.from("documents").remove([r.file_path]);
    const { error } = await supabase.from("documents").delete().eq("id", r.id);
    if (error) toast.error(error.message); else { toast.success("تم الحذف"); load(); }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent dir="rtl" className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader><DialogTitle>وثائق: {entityLabel}</DialogTitle></DialogHeader>
        <form onSubmit={onUpload} className="grid gap-3 rounded-xl border border-border p-4 bg-secondary/30">
          <div className="grid grid-cols-2 gap-3">
            <div><Label>عنوان الوثيقة *</Label><Input value={title} onChange={(e) => setTitle(e.target.value)} /></div>
            <div><Label>النوع</Label><Input placeholder="تأمين، فحص، رخصة..." value={docType} onChange={(e) => setDocType(e.target.value)} /></div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div><Label>تاريخ الانتهاء</Label><Input type="date" value={expiry} onChange={(e) => setExpiry(e.target.value)} /></div>
            <div><Label>الملف *</Label><Input ref={fileRef} type="file" accept="image/*,application/pdf" /></div>
          </div>
          <Button type="submit" disabled={uploading} className="gap-2 bg-accent text-accent-foreground hover:bg-accent/90 justify-self-start">
            {uploading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Upload className="h-4 w-4" />} رفع الوثيقة
          </Button>
        </form>

        <div className="mt-2">
          {loading ? (
            <div className="flex justify-center py-8"><Loader2 className="h-5 w-5 animate-spin text-accent" /></div>
          ) : rows.length === 0 ? (
            <div className="py-8 text-center text-sm text-muted-foreground">لا توجد وثائق مرفوعة</div>
          ) : (
            <div className="divide-y divide-border rounded-xl border border-border overflow-hidden">
              {rows.map((r) => (
                <div key={r.id} className="flex items-center gap-3 p-3 hover:bg-secondary/40">
                  <FileText className="h-5 w-5 text-accent shrink-0" />
                  <div className="flex-1 min-w-0">
                    <div className="font-semibold truncate">{r.title}</div>
                    <div className="text-xs text-muted-foreground">
                      {r.doc_type ?? "—"} {r.expiry_date && `· ينتهي ${r.expiry_date}`} {r.file_size && `· ${(r.file_size / 1024).toFixed(0)}KB`}
                    </div>
                  </div>
                  <Button variant="ghost" size="sm" onClick={() => onDownload(r)}><Download className="h-4 w-4" /></Button>
                  <Button variant="ghost" size="sm" onClick={() => onDelete(r)} className="text-destructive hover:bg-destructive/10 hover:text-destructive"><Trash2 className="h-4 w-4" /></Button>
                </div>
              ))}
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
