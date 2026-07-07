import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useRef, useState } from "react";
import { PageHeader } from "@/components/dashboard-layout";
import { User, Building2, Loader2, KeyRound, ImageIcon, FileSignature, Receipt, Upload, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { resolveAssetUrl } from "@/lib/company";

export const Route = createFileRoute("/app/settings")({
  component: SettingsPage,
});

type Company = {
  name: string; contact_email: string; contact_phone: string;
  address: string; city: string; country: string;
  tax_id: string; registration_number: string;
  currency: string; tax_rate: string;
  invoice_prefix: string; invoice_number_format: string; invoice_next_number: string;
  invoice_header: string; invoice_footer: string; bank_details: string;
  logo_url: string | null; stamp_url: string | null;
};

const emptyCompany: Company = {
  name: "", contact_email: "", contact_phone: "",
  address: "", city: "", country: "MA",
  tax_id: "", registration_number: "",
  currency: "MAD", tax_rate: "20",
  invoice_prefix: "FAC", invoice_number_format: "{PREFIX}-{YYYY}-{####}", invoice_next_number: "1",
  invoice_header: "", invoice_footer: "", bank_details: "",
  logo_url: null, stamp_url: null,
};

function SettingsPage() {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [savingCo, setSavingCo] = useState(false);
  const [savingPwd, setSavingPwd] = useState(false);
  const [tenantId, setTenantId] = useState<string | null>(null);
  const [profile, setProfile] = useState({ full_name: "", email: "", phone: "" });
  const [company, setCompany] = useState<Company>(emptyCompany);
  const [logoPreview, setLogoPreview] = useState<string | null>(null);
  const [stampPreview, setStampPreview] = useState<string | null>(null);
  const [pwd, setPwd] = useState({ new: "", confirm: "" });
  const logoRef = useRef<HTMLInputElement>(null);
  const stampRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    (async () => {
      const { data: u } = await supabase.auth.getUser();
      if (!u.user) return;
      const { data: p } = await supabase.from("profiles").select("full_name,email,phone,tenant_id").eq("id", u.user.id).maybeSingle();
      if (p) setProfile({ full_name: p.full_name ?? "", email: p.email ?? "", phone: (p as any).phone ?? "" });
      const tid = p?.tenant_id ?? null;
      setTenantId(tid);
      if (tid) {
        const { data: co } = await supabase.from("tenants").select("*").eq("id", tid).maybeSingle();
        if (co) {
          const c: any = co;
          setCompany({
            name: c.name ?? "", contact_email: c.contact_email ?? "", contact_phone: c.contact_phone ?? "",
            address: c.address ?? "", city: c.city ?? "", country: c.country ?? "MA",
            tax_id: c.tax_id ?? "", registration_number: c.registration_number ?? "",
            currency: c.currency ?? "MAD", tax_rate: String(c.tax_rate ?? 20),
            invoice_prefix: c.invoice_prefix ?? "FAC",
            invoice_number_format: c.invoice_number_format ?? "{PREFIX}-{YYYY}-{####}",
            invoice_next_number: String(c.invoice_next_number ?? 1),
            invoice_header: c.invoice_header ?? "", invoice_footer: c.invoice_footer ?? "",
            bank_details: c.bank_details ?? "",
            logo_url: c.logo_url ?? null, stamp_url: c.stamp_url ?? null,
          });
          setLogoPreview(await resolveAssetUrl(c.logo_url));
          setStampPreview(await resolveAssetUrl(c.stamp_url));
        }
      }
      setLoading(false);
    })();
  }, []);

  const saveProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    const { data: u } = await supabase.auth.getUser();
    if (!u.user) return;
    const { error } = await supabase.from("profiles").update({ full_name: profile.full_name, phone: profile.phone as any }).eq("id", u.user.id);
    setSaving(false);
    if (error) toast.error(error.message); else toast.success("تم حفظ الملف الشخصي");
  };

  const saveCompany = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!tenantId) return;
    setSavingCo(true);
    const { error } = await supabase.from("tenants").update({
      name: company.name,
      contact_email: company.contact_email || null,
      contact_phone: company.contact_phone || null,
      address: company.address || null,
      city: company.city || null,
      country: company.country || null,
      tax_id: company.tax_id || null,
      registration_number: company.registration_number || null,
      currency: company.currency || "MAD",
      tax_rate: Number(company.tax_rate) || 0,
      invoice_prefix: company.invoice_prefix || "FAC",
      invoice_number_format: company.invoice_number_format || "{PREFIX}-{YYYY}-{####}",
      invoice_next_number: Math.max(1, Number(company.invoice_next_number) || 1),
      invoice_header: company.invoice_header || null,
      invoice_footer: company.invoice_footer || null,
      bank_details: company.bank_details || null,
    } as any).eq("id", tenantId);
    setSavingCo(false);
    if (error) toast.error(error.message); else toast.success("تم حفظ إعدادات الشركة");
  };

  const changePassword = async (e: React.FormEvent) => {
    e.preventDefault();
    if (pwd.new.length < 8) { toast.error("كلمة السر يجب أن تكون 8 أحرف على الأقل"); return; }
    if (pwd.new !== pwd.confirm) { toast.error("كلمتا السر غير متطابقتين"); return; }
    setSavingPwd(true);
    const { error } = await supabase.auth.updateUser({ password: pwd.new });
    setSavingPwd(false);
    if (error) toast.error(error.message);
    else { toast.success("تم تحديث كلمة السر"); setPwd({ new: "", confirm: "" }); }
  };

  const uploadAsset = async (kind: "logo" | "stamp", file: File) => {
    if (!tenantId) return;
    const ext = file.name.split(".").pop() || "png";
    const path = `${tenantId}/${kind}-${Date.now()}.${ext}`;
    const up = await supabase.storage.from("tenant-assets").upload(path, file, { upsert: true });
    if (up.error) { toast.error(up.error.message); return; }
    const col = kind === "logo" ? "logo_url" : "stamp_url";
    const { error } = await supabase.from("tenants").update({ [col]: path } as any).eq("id", tenantId);
    if (error) { toast.error(error.message); return; }
    const url = await resolveAssetUrl(path);
    if (kind === "logo") { setCompany((c) => ({ ...c, logo_url: path })); setLogoPreview(url); }
    else { setCompany((c) => ({ ...c, stamp_url: path })); setStampPreview(url); }
    toast.success(kind === "logo" ? "تم تحديث الشعار" : "تم تحديث الختم");
  };

  const removeAsset = async (kind: "logo" | "stamp") => {
    if (!tenantId) return;
    const col = kind === "logo" ? "logo_url" : "stamp_url";
    const current = kind === "logo" ? company.logo_url : company.stamp_url;
    if (current && !current.startsWith("http")) {
      await supabase.storage.from("tenant-assets").remove([current]);
    }
    await supabase.from("tenants").update({ [col]: null } as any).eq("id", tenantId);
    if (kind === "logo") { setCompany((c) => ({ ...c, logo_url: null })); setLogoPreview(null); }
    else { setCompany((c) => ({ ...c, stamp_url: null })); setStampPreview(null); }
    toast.success("تم الحذف");
  };

  if (loading) {
    return <div className="flex items-center justify-center py-24"><Loader2 className="h-8 w-8 animate-spin text-accent" /></div>;
  }

  return (
    <>
      <PageHeader title="الإعدادات" subtitle="الحساب الشخصي وإعدادات الشركة الكاملة" />

      <Tabs defaultValue="company" dir="rtl">
        <TabsList>
          <TabsTrigger value="company">بيانات الشركة</TabsTrigger>
          <TabsTrigger value="branding">الشعار والختم</TabsTrigger>
          <TabsTrigger value="invoicing">الفواتير والضريبة</TabsTrigger>
          <TabsTrigger value="account">الحساب الشخصي</TabsTrigger>
        </TabsList>

        {/* Company */}
        <TabsContent value="company" className="mt-4">
          <form onSubmit={saveCompany} className="rounded-2xl border border-border bg-card p-6">
            <div className="mb-4 flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary/10 text-primary"><Building2 className="h-5 w-5" /></div>
              <div><h3 className="font-bold">بيانات الشركة</h3><p className="text-xs text-muted-foreground">تُعرض في الفواتير والتقارير الرسمية</p></div>
            </div>
            <div className="grid gap-4 sm:grid-cols-2">
              <div><Label>اسم الشركة *</Label><Input required value={company.name} onChange={(e) => setCompany({ ...company, name: e.target.value })} /></div>
              <div><Label>البريد الإلكتروني</Label><Input dir="ltr" value={company.contact_email} onChange={(e) => setCompany({ ...company, contact_email: e.target.value })} /></div>
              <div><Label>الهاتف</Label><Input dir="ltr" value={company.contact_phone} onChange={(e) => setCompany({ ...company, contact_phone: e.target.value })} /></div>
              <div><Label>المدينة</Label><Input value={company.city} onChange={(e) => setCompany({ ...company, city: e.target.value })} /></div>
              <div className="sm:col-span-2"><Label>العنوان</Label><Input value={company.address} onChange={(e) => setCompany({ ...company, address: e.target.value })} /></div>
              <div><Label>ICE / الرقم الضريبي</Label><Input dir="ltr" value={company.tax_id} onChange={(e) => setCompany({ ...company, tax_id: e.target.value })} /></div>
              <div><Label>RC / السجل التجاري</Label><Input dir="ltr" value={company.registration_number} onChange={(e) => setCompany({ ...company, registration_number: e.target.value })} /></div>
            </div>
            <div className="mt-4">
              <Button type="submit" disabled={savingCo} className="gap-2 bg-accent text-accent-foreground hover:bg-accent/90">
                {savingCo && <Loader2 className="h-4 w-4 animate-spin" />} حفظ
              </Button>
            </div>
          </form>
        </TabsContent>

        {/* Branding: logo + stamp */}
        <TabsContent value="branding" className="mt-4 grid gap-4 lg:grid-cols-2">
          <AssetCard
            icon={<ImageIcon className="h-5 w-5" />}
            iconClass="bg-accent/10 text-accent"
            title="شعار الشركة"
            hint="يظهر في رأس الفواتير والتقارير المطبوعة (PNG/JPG, حتى 2MB)"
            preview={logoPreview}
            inputRef={logoRef}
            onPick={(f) => uploadAsset("logo", f)}
            onRemove={company.logo_url ? () => removeAsset("logo") : undefined}
          />
          <AssetCard
            icon={<FileSignature className="h-5 w-5" />}
            iconClass="bg-orange-500/10 text-orange-600"
            title="الختم الرقمي"
            hint="ختم أو توقيع الشركة (PNG بخلفية شفافة يعمل بشكل أفضل)"
            preview={stampPreview}
            inputRef={stampRef}
            onPick={(f) => uploadAsset("stamp", f)}
            onRemove={company.stamp_url ? () => removeAsset("stamp") : undefined}
          />
        </TabsContent>

        {/* Invoicing */}
        <TabsContent value="invoicing" className="mt-4">
          <form onSubmit={saveCompany} className="rounded-2xl border border-border bg-card p-6">
            <div className="mb-4 flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-success/10 text-success"><Receipt className="h-5 w-5" /></div>
              <div>
                <h3 className="font-bold">إعدادات الفواتير والضريبة</h3>
                <p className="text-xs text-muted-foreground">العملة، نسبة TVA، ترقيم الفواتير، الرأس والتذييل، بيانات التحويل</p>
              </div>
            </div>
            <div className="grid gap-4 sm:grid-cols-3">
              <div>
                <Label>العملة</Label>
                <Input dir="ltr" value={company.currency} onChange={(e) => setCompany({ ...company, currency: e.target.value.toUpperCase().slice(0, 4) })} placeholder="MAD" />
              </div>
              <div>
                <Label>نسبة الضريبة الافتراضية (%)</Label>
                <Input type="number" step="0.01" dir="ltr" value={company.tax_rate} onChange={(e) => setCompany({ ...company, tax_rate: e.target.value })} />
              </div>
              <div>
                <Label>بادئة رقم الفاتورة</Label>
                <Input dir="ltr" value={company.invoice_prefix} onChange={(e) => setCompany({ ...company, invoice_prefix: e.target.value })} placeholder="FAC" />
              </div>
              <div className="sm:col-span-2">
                <Label>صيغة الترقيم</Label>
                <Input dir="ltr" value={company.invoice_number_format} onChange={(e) => setCompany({ ...company, invoice_number_format: e.target.value })} placeholder="{PREFIX}-{YYYY}-{####}" />
                <p className="mt-1 text-xs text-muted-foreground">المتغيرات: <code dir="ltr">{"{PREFIX} {YYYY} {YY} {MM} {###} {####} {#####}"}</code></p>
              </div>
              <div>
                <Label>الرقم التالي</Label>
                <Input type="number" min="1" dir="ltr" value={company.invoice_next_number} onChange={(e) => setCompany({ ...company, invoice_next_number: e.target.value })} />
              </div>
              <div className="sm:col-span-3">
                <Label>نص رأس الفاتورة</Label>
                <Textarea rows={2} value={company.invoice_header} onChange={(e) => setCompany({ ...company, invoice_header: e.target.value })} placeholder="مثال: شركة النقل الدولي — نشكركم على تعاملكم معنا" />
              </div>
              <div className="sm:col-span-3">
                <Label>نص تذييل الفاتورة</Label>
                <Textarea rows={2} value={company.invoice_footer} onChange={(e) => setCompany({ ...company, invoice_footer: e.target.value })} placeholder="مثال: شكراً لتعاملكم — الدفع خلال 30 يوماً" />
              </div>
              <div className="sm:col-span-3">
                <Label>بيانات التحويل البنكي</Label>
                <Textarea rows={2} value={company.bank_details} onChange={(e) => setCompany({ ...company, bank_details: e.target.value })} placeholder="مثال: البنك الشعبي — RIB 011 780 000000000000000 00" />
              </div>
            </div>
            <div className="mt-4">
              <Button type="submit" disabled={savingCo} className="gap-2 bg-accent text-accent-foreground hover:bg-accent/90">
                {savingCo && <Loader2 className="h-4 w-4 animate-spin" />} حفظ إعدادات الفواتير
              </Button>
            </div>
          </form>
        </TabsContent>

        {/* Account */}
        <TabsContent value="account" className="mt-4 grid gap-6 lg:grid-cols-2">
          <form onSubmit={saveProfile} className="rounded-2xl border border-border bg-card p-6">
            <div className="mb-4 flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-accent/10 text-accent"><User className="h-5 w-5" /></div>
              <div><h3 className="font-bold">الملف الشخصي</h3><p className="text-xs text-muted-foreground">بيانات حسابك</p></div>
            </div>
            <div className="space-y-4">
              <div><Label>الاسم الكامل</Label><Input value={profile.full_name} onChange={(e) => setProfile({ ...profile, full_name: e.target.value })} /></div>
              <div><Label>البريد الإلكتروني</Label><Input dir="ltr" value={profile.email} disabled /></div>
              <div><Label>الهاتف</Label><Input dir="ltr" value={profile.phone} onChange={(e) => setProfile({ ...profile, phone: e.target.value })} /></div>
              <Button type="submit" disabled={saving} className="gap-2 bg-accent text-accent-foreground hover:bg-accent/90">
                {saving && <Loader2 className="h-4 w-4 animate-spin" />} حفظ
              </Button>
            </div>
          </form>

          <form onSubmit={changePassword} className="rounded-2xl border border-border bg-card p-6">
            <div className="mb-4 flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-orange-500/10 text-orange-600"><KeyRound className="h-5 w-5" /></div>
              <div><h3 className="font-bold">تغيير كلمة السر</h3><p className="text-xs text-muted-foreground">8 أحرف على الأقل</p></div>
            </div>
            <div className="space-y-4">
              <div><Label>كلمة السر الجديدة</Label><Input type="password" dir="ltr" value={pwd.new} onChange={(e) => setPwd({ ...pwd, new: e.target.value })} /></div>
              <div><Label>تأكيد كلمة السر</Label><Input type="password" dir="ltr" value={pwd.confirm} onChange={(e) => setPwd({ ...pwd, confirm: e.target.value })} /></div>
              <Button type="submit" disabled={savingPwd} className="gap-2 bg-orange-600 text-white hover:bg-orange-700">
                {savingPwd && <Loader2 className="h-4 w-4 animate-spin" />} تحديث
              </Button>
            </div>
          </form>
        </TabsContent>
      </Tabs>
    </>
  );
}

function AssetCard({
  icon, iconClass, title, hint, preview, inputRef, onPick, onRemove,
}: {
  icon: React.ReactNode; iconClass: string; title: string; hint: string;
  preview: string | null; inputRef: React.RefObject<HTMLInputElement | null>;
  onPick: (f: File) => void; onRemove?: () => void;
}) {
  return (
    <div className="rounded-2xl border border-border bg-card p-6">
      <div className="mb-4 flex items-center gap-3">
        <div className={`flex h-10 w-10 items-center justify-center rounded-xl ${iconClass}`}>{icon}</div>
        <div><h3 className="font-bold">{title}</h3><p className="text-xs text-muted-foreground">{hint}</p></div>
      </div>
      <div className="flex flex-col items-center gap-4">
        <div className="flex h-40 w-full items-center justify-center rounded-xl border-2 border-dashed border-border bg-secondary/30">
          {preview ? (
            <img src={preview} alt={title} className="max-h-36 max-w-full object-contain" />
          ) : (
            <div className="text-sm text-muted-foreground">لا يوجد ملف مرفوع</div>
          )}
        </div>
        <div className="flex w-full gap-2">
          <input
            ref={inputRef}
            type="file"
            accept="image/png,image/jpeg,image/webp"
            hidden
            onChange={(e) => {
              const f = e.target.files?.[0];
              if (f) onPick(f);
              if (inputRef.current) inputRef.current.value = "";
            }}
          />
          <Button type="button" variant="outline" className="flex-1 gap-2" onClick={() => inputRef.current?.click()}>
            <Upload className="h-4 w-4" /> {preview ? "استبدال" : "رفع ملف"}
          </Button>
          {onRemove && (
            <Button type="button" variant="ghost" onClick={onRemove} className="text-destructive hover:bg-destructive/10">
              <Trash2 className="h-4 w-4" />
            </Button>
          )}
        </div>
      </div>
    </div>
  );
}
