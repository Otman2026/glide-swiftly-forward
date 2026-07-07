import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { PageHeader } from "@/components/dashboard-layout";
import { User, Building2, Loader2, KeyRound } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";

export const Route = createFileRoute("/app/settings")({
  component: SettingsPage,
});

function SettingsPage() {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [savingCo, setSavingCo] = useState(false);
  const [savingPwd, setSavingPwd] = useState(false);
  const [tenantId, setTenantId] = useState<string | null>(null);
  const [profile, setProfile] = useState({ full_name: "", email: "", phone: "" });
  const [company, setCompany] = useState({
    name: "", contact_email: "", contact_phone: "",
    address: "", city: "", country: "MA", tax_id: "", registration_number: "",
  });
  const [pwd, setPwd] = useState({ new: "", confirm: "" });

  useEffect(() => {
    (async () => {
      const { data: u } = await supabase.auth.getUser();
      if (!u.user) return;
      const [p, t] = await Promise.all([
        supabase.from("profiles").select("full_name,email,phone,tenant_id").eq("id", u.user.id).maybeSingle(),
        supabase.from("profiles").select("tenant_id").eq("id", u.user.id).maybeSingle(),
      ]);
      if (p.data) setProfile({ full_name: p.data.full_name ?? "", email: p.data.email ?? "", phone: (p.data as any).phone ?? "" });
      const tid = t.data?.tenant_id ?? null;
      setTenantId(tid);
      if (tid) {
        const { data: co } = await supabase.from("tenants").select("*").eq("id", tid).maybeSingle();
        if (co) setCompany({
          name: co.name ?? "",
          contact_email: co.contact_email ?? "",
          contact_phone: (co as any).contact_phone ?? "",
          address: (co as any).address ?? "",
          city: (co as any).city ?? "",
          country: (co as any).country ?? "MA",
          tax_id: (co as any).tax_id ?? "",
          registration_number: (co as any).registration_number ?? "",
        });
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
    if (error) toast.error(error.message);
    else toast.success("تم حفظ الملف الشخصي");
  };

  const saveCompany = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!tenantId) return;
    setSavingCo(true);
    const { error } = await supabase.from("tenants").update({
      name: company.name,
      contact_email: company.contact_email,
      contact_phone: company.contact_phone as any,
      address: company.address as any,
      city: company.city as any,
      country: company.country as any,
      tax_id: company.tax_id as any,
      registration_number: company.registration_number as any,
    }).eq("id", tenantId);
    setSavingCo(false);
    if (error) toast.error(error.message);
    else toast.success("تم حفظ بيانات الشركة");
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

  if (loading) {
    return <div className="flex items-center justify-center py-24"><Loader2 className="h-8 w-8 animate-spin text-accent" /></div>;
  }

  return (
    <>
      <PageHeader title="الإعدادات" subtitle="الملف الشخصي، بيانات الشركة، وكلمة السر" />

      <div className="grid gap-6 lg:grid-cols-2">
        {/* Profile */}
        <form onSubmit={saveProfile} className="rounded-2xl border border-border bg-card p-6">
          <div className="mb-4 flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-accent/10 text-accent"><User className="h-5 w-5" /></div>
            <div><h3 className="font-bold text-foreground">الملف الشخصي</h3><p className="text-xs text-muted-foreground">بيانات حسابك</p></div>
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

        {/* Password */}
        <form onSubmit={changePassword} className="rounded-2xl border border-border bg-card p-6">
          <div className="mb-4 flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-orange-500/10 text-orange-600"><KeyRound className="h-5 w-5" /></div>
            <div><h3 className="font-bold text-foreground">تغيير كلمة السر</h3><p className="text-xs text-muted-foreground">8 أحرف على الأقل</p></div>
          </div>
          <div className="space-y-4">
            <div><Label>كلمة السر الجديدة</Label><Input type="password" dir="ltr" value={pwd.new} onChange={(e) => setPwd({ ...pwd, new: e.target.value })} /></div>
            <div><Label>تأكيد كلمة السر</Label><Input type="password" dir="ltr" value={pwd.confirm} onChange={(e) => setPwd({ ...pwd, confirm: e.target.value })} /></div>
            <Button type="submit" disabled={savingPwd} className="gap-2 bg-orange-600 text-white hover:bg-orange-700">
              {savingPwd && <Loader2 className="h-4 w-4 animate-spin" />} تحديث
            </Button>
          </div>
        </form>

        {/* Company */}
        <form onSubmit={saveCompany} className="rounded-2xl border border-border bg-card p-6 lg:col-span-2">
          <div className="mb-4 flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary/10 text-primary"><Building2 className="h-5 w-5" /></div>
            <div><h3 className="font-bold text-foreground">بيانات الشركة</h3><p className="text-xs text-muted-foreground">تُعرض في الفواتير والتقارير الرسمية</p></div>
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
              {savingCo && <Loader2 className="h-4 w-4 animate-spin" />} حفظ بيانات الشركة
            </Button>
          </div>
        </form>
      </div>
    </>
  );
}
