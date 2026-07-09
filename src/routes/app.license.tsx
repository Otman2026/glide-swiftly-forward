import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { PageHeader } from "@/components/dashboard-layout";
import { supabase } from "@/integrations/supabase/client";
import { useServerFn } from "@tanstack/react-start";
import { activateLicense, refreshOfflineToken } from "@/lib/license.functions";
import { KeyRound, CheckCircle2, XCircle, RefreshCw, Loader2, WifiOff } from "lucide-react";
import { toast } from "sonner";

export const Route = createFileRoute("/app/license")({
  component: LicensePage,
});

type License = {
  id: string;
  license_key: string;
  plan_key: string;
  activated_at: string | null;
  expires_at: string | null;
  revoked_at: string | null;
  max_users: number | null;
  max_vehicles: number | null;
};

const OFFLINE_KEY = "saifo.license.offline_token";
const OFFLINE_META = "saifo.license.meta";

function LicensePage() {
  const [licenses, setLicenses] = useState<License[]>([]);
  const [loading, setLoading] = useState(true);
  const [key, setKey] = useState("");
  const [busy, setBusy] = useState(false);
  const [meta, setMeta] = useState<{ plan_key: string; expires_at: string | null } | null>(null);
  const activate = useServerFn(activateLicense);
  const refresh = useServerFn(refreshOfflineToken);

  const load = async () => {
    setLoading(true);
    const { data } = await supabase
      .from("license_keys")
      .select("id,license_key,plan_key,activated_at,expires_at,revoked_at,max_users,max_vehicles")
      .order("created_at", { ascending: false });
    setLicenses((data ?? []) as License[]);
    try {
      const m = localStorage.getItem(OFFLINE_META);
      if (m) setMeta(JSON.parse(m));
    } catch {}
    setLoading(false);
  };

  useEffect(() => {
    load();
  }, []);

  const activeLicense = licenses.find((l) => !l.revoked_at && l.activated_at);

  const submit = async () => {
    if (!key.trim()) return toast.error("أدخل مفتاح الترخيص");
    setBusy(true);
    try {
      const r = await activate({ data: { license_key: key.trim() } });
      localStorage.setItem(OFFLINE_KEY, r.offline_token);
      const m = { plan_key: r.plan_key, expires_at: r.expires_at };
      localStorage.setItem(OFFLINE_META, JSON.stringify(m));
      setMeta(m);
      setKey("");
      toast.success(`تم التفعيل — الباقة: ${r.plan_key}`);
      load();
    } catch (e: any) {
      toast.error(e?.message ?? "فشل التفعيل");
    } finally {
      setBusy(false);
    }
  };

  const doRefresh = async () => {
    setBusy(true);
    try {
      const r = await refresh();
      localStorage.setItem(OFFLINE_KEY, r.offline_token);
      const m = { plan_key: r.plan_key, expires_at: r.expires_at };
      localStorage.setItem(OFFLINE_META, JSON.stringify(m));
      setMeta(m);
      toast.success("تم تحديث رمز العمل دون اتصال");
    } catch (e: any) {
      toast.error(e?.message ?? "فشل التحديث");
    } finally {
      setBusy(false);
    }
  };

  return (
    <>
      <PageHeader
        title="التراخيص والعمل دون اتصال"
        subtitle="تفعيل ترخيص الشركة وتحضير رمز العمل دون إنترنت (Offline)"
      />

      <div className="grid gap-4 lg:grid-cols-2">
        <div className="rounded-2xl border border-border bg-card p-5">
          <div className="mb-3 flex items-center gap-2">
            <KeyRound className="h-5 w-5 text-accent" />
            <h3 className="text-base font-bold">تفعيل ترخيص جديد</h3>
          </div>
          <p className="mb-3 text-xs text-muted-foreground">
            أدخل مفتاح الترخيص الذي زوّدك به مالك النظام. سيُربط بشركتك ولا يمكن استخدامه في مكان آخر.
          </p>
          <input
            value={key}
            onChange={(e) => setKey(e.target.value.toUpperCase())}
            placeholder="SAIFO-XXXX-XXXX-XXXX-XXXX"
            dir="ltr"
            className="w-full rounded-lg border border-border bg-background px-3 py-2 font-mono text-sm"
          />
          <button
            onClick={submit}
            disabled={busy}
            className="mt-3 inline-flex items-center gap-2 rounded-lg bg-accent px-4 py-2 text-sm font-bold text-accent-foreground disabled:opacity-60"
          >
            {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : <CheckCircle2 className="h-4 w-4" />}
            تفعيل
          </button>
        </div>

        <div className="rounded-2xl border border-border bg-card p-5">
          <div className="mb-3 flex items-center gap-2">
            <WifiOff className="h-5 w-5 text-warning" />
            <h3 className="text-base font-bold">رمز العمل دون اتصال</h3>
          </div>
          {meta ? (
            <div className="space-y-1 text-sm">
              <div><span className="text-muted-foreground">الباقة:</span> <b>{meta.plan_key}</b></div>
              <div>
                <span className="text-muted-foreground">الصلاحية حتى:</span>{" "}
                <b>{meta.expires_at ? new Date(meta.expires_at).toLocaleDateString("ar") : "—"}</b>
              </div>
              <div className="text-xs text-success">✓ محفوظ محلياً — يمكن استخدام التطبيق دون اتصال</div>
            </div>
          ) : (
            <div className="text-sm text-muted-foreground">لم يُنشأ رمز محلي بعد. فعّل ترخيصاً أو حدّث الرمز.</div>
          )}
          <button
            onClick={doRefresh}
            disabled={busy}
            className="mt-3 inline-flex items-center gap-2 rounded-lg border border-border px-4 py-2 text-sm font-semibold hover:bg-secondary disabled:opacity-60"
          >
            {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : <RefreshCw className="h-4 w-4" />}
            تحديث الرمز
          </button>
        </div>
      </div>

      <div className="mt-6 rounded-2xl border border-border bg-card">
        <div className="border-b border-border px-4 py-3 text-sm font-bold">تراخيص الشركة</div>
        {loading ? (
          <div className="flex justify-center py-10">
            <Loader2 className="h-6 w-6 animate-spin text-accent" />
          </div>
        ) : licenses.length === 0 ? (
          <div className="p-8 text-center text-sm text-muted-foreground">لا توجد تراخيص مرتبطة بشركتك</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-secondary/50 text-right text-xs font-bold uppercase text-muted-foreground">
                <tr>
                  <th className="px-4 py-2">المفتاح</th>
                  <th className="px-4 py-2">الباقة</th>
                  <th className="px-4 py-2">الحدود</th>
                  <th className="px-4 py-2">الصلاحية</th>
                  <th className="px-4 py-2">الحالة</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {licenses.map((l) => (
                  <tr key={l.id}>
                    <td className="px-4 py-2 font-mono text-xs" dir="ltr">{l.license_key}</td>
                    <td className="px-4 py-2 font-semibold">{l.plan_key}</td>
                    <td className="px-4 py-2 text-xs">
                      {l.max_users ?? "∞"} مستخدم / {l.max_vehicles ?? "∞"} مركبة
                    </td>
                    <td className="px-4 py-2 text-xs">
                      {l.expires_at ? new Date(l.expires_at).toLocaleDateString("ar") : "دائم"}
                    </td>
                    <td className="px-4 py-2">
                      {l.revoked_at ? (
                        <span className="inline-flex items-center gap-1 rounded-full bg-destructive/15 px-2 py-0.5 text-[10px] font-bold text-destructive">
                          <XCircle className="h-3 w-3" /> ملغى
                        </span>
                      ) : l.activated_at ? (
                        <span className="inline-flex items-center gap-1 rounded-full bg-success/15 px-2 py-0.5 text-[10px] font-bold text-success">
                          <CheckCircle2 className="h-3 w-3" /> فعّال
                        </span>
                      ) : (
                        <span className="inline-flex rounded-full bg-muted px-2 py-0.5 text-[10px] font-bold text-muted-foreground">
                          غير مفعّل
                        </span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
        {activeLicense && (
          <div className="border-t border-border bg-success/5 px-4 py-2 text-xs text-success">
            ✓ الترخيص الفعّال: {activeLicense.license_key} — {activeLicense.plan_key}
          </div>
        )}
      </div>
    </>
  );
}
