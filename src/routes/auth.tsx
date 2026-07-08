import { createFileRoute, useNavigate, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { Truck, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";

export const Route = createFileRoute("/auth")({
  head: () => ({
    meta: [
      { title: "تسجيل الدخول — SAIFO TRANSPORT ERP" },
      { name: "description", content: "الوصول إلى منصة SAIFO لإدارة شركات النقل واللوجستيك." },
      { name: "robots", content: "noindex" },
    ],
  }),
  component: AuthPage,
});

function AuthPage() {
  const navigate = useNavigate();
  const [mode, setMode] = useState<"signin" | "signup">("signin");
  const [identifier, setIdentifier] = useState(""); // username (or email if already linked)
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [fullName, setFullName] = useState("");
  const [companyName, setCompanyName] = useState("");
  const [loading, setLoading] = useState(false);

  async function routeByProfile() {
    const { data: p } = await supabase.from("profiles").select("customer_id, driver_id").maybeSingle();
    if (p?.customer_id) navigate({ to: "/portal" });
    else if (p?.driver_id) navigate({ to: "/driver" });
    else navigate({ to: "/app" });
  }

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => {
      if (data.session) routeByProfile();
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function resolveEmail(id: string): Promise<string | null> {
    const trimmed = id.trim();
    if (!trimmed) return null;
    if (trimmed.includes("@")) return trimmed;
    const { data } = await supabase
      .from("profiles")
      .select("email")
      .ilike("username", trimmed)
      .maybeSingle();
    if (data?.email) return data.email;
    // Fallback to synthetic email used for username-only accounts
    return `${trimmed.toLowerCase()}@saifo.local`;
  }

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      if (mode === "signup") {
        const uname = username.trim();
        if (!uname || !/^[a-zA-Z0-9._-]{3,32}$/.test(uname)) {
          toast.error("اسم المستخدم مطلوب (3–32 حرف/رقم)");
          setLoading(false);
          return;
        }
        const { data: exists } = await supabase
          .from("profiles")
          .select("id")
          .ilike("username", uname)
          .maybeSingle();
        if (exists) {
          toast.error("اسم المستخدم محجوز، اختر اسماً آخر");
          setLoading(false);
          return;
        }
        const syntheticEmail = `${uname.toLowerCase()}@saifo.local`;
        const { error } = await supabase.auth.signUp({
          email: syntheticEmail,
          password,
          options: {
            emailRedirectTo: `${window.location.origin}/app`,
            data: {
              full_name: fullName,
              company_name: companyName,
              username: uname,
            },
          },
        });
        if (error) throw error;
        toast.success("تم إنشاء الحساب. يمكنك تسجيل الدخول الآن.");
        setMode("signin");
        setIdentifier(uname);
      } else {
        const loginEmail = await resolveEmail(identifier);
        if (!loginEmail) {
          toast.error("لم يتم العثور على مستخدم بهذا الاسم");
          setLoading(false);
          return;
        }
        const { error } = await supabase.auth.signInWithPassword({ email: loginEmail, password });
        if (error) throw error;
        toast.success("مرحباً بك");
        await routeByProfile();
      }
    } catch (err) {
      const msg = err instanceof Error ? err.message : "حدث خطأ";
      toast.error(msg);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div dir="rtl" className="min-h-screen flex items-center justify-center bg-secondary/40 p-4">
      <div className="w-full max-w-md">
        <Link to="/" className="mb-8 flex items-center justify-center gap-3">
          <div className="flex h-12 w-12 items-center justify-center rounded-xl gradient-accent">
            <Truck className="h-6 w-6 text-white" strokeWidth={2.5} />
          </div>
          <div>
            <div className="text-lg font-black text-primary leading-tight">SAIFO</div>
            <div className="-mt-0.5 text-[11px] font-bold tracking-widest text-accent">
              TRANSPORT ERP
            </div>
          </div>
        </Link>

        <div className="rounded-2xl border border-border bg-card p-8 shadow-lg">
          <h1 className="text-2xl font-black text-primary text-center">
            {mode === "signin" ? "تسجيل الدخول" : "إنشاء حساب جديد"}
          </h1>
          <p className="mt-2 text-center text-sm text-muted-foreground">
            {mode === "signin"
              ? "ادخل باسم المستخدم أو البريد الإلكتروني"
              : "ابدأ تجربة مجانية لمدة 14 يوماً"}
          </p>

          <form onSubmit={onSubmit} className="mt-6 space-y-4">
            {mode === "signup" && (
              <>
                <div>
                  <label className="mb-1.5 block text-sm font-semibold text-foreground">
                    الاسم الكامل *
                  </label>
                  <input
                    required
                    type="text"
                    value={fullName}
                    onChange={(e) => setFullName(e.target.value)}
                    className="h-11 w-full rounded-lg border border-border bg-background px-3 text-sm focus:border-accent focus:outline-none focus:ring-2 focus:ring-accent/20"
                  />
                </div>
                <div>
                  <label className="mb-1.5 block text-sm font-semibold text-foreground">
                    اسم الشركة *
                  </label>
                  <input
                    required
                    type="text"
                    value={companyName}
                    onChange={(e) => setCompanyName(e.target.value)}
                    className="h-11 w-full rounded-lg border border-border bg-background px-3 text-sm focus:border-accent focus:outline-none focus:ring-2 focus:ring-accent/20"
                  />
                </div>
                <div>
                  <label className="mb-1.5 block text-sm font-semibold text-foreground">
                    اسم المستخدم <span className="text-muted-foreground font-normal">(اختياري)</span>
                  </label>
                  <input
                    type="text"
                    value={username}
                    onChange={(e) => setUsername(e.target.value.replace(/\s/g, ""))}
                    placeholder="مثال: ahmed2026"
                    className="h-11 w-full rounded-lg border border-border bg-background px-3 text-sm focus:border-accent focus:outline-none focus:ring-2 focus:ring-accent/20"
                    dir="ltr"
                  />
                  <p className="mt-1 text-xs text-muted-foreground">يستخدم للدخول بدل البريد. اتركه فارغاً للاكتفاء بالبريد.</p>
                </div>
                <div>
                  <label className="mb-1.5 block text-sm font-semibold text-foreground">
                    البريد الإلكتروني *
                    <span className="text-muted-foreground font-normal"> (للاسترجاع والتنبيهات)</span>
                  </label>
                  <input
                    required
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="h-11 w-full rounded-lg border border-border bg-background px-3 text-sm focus:border-accent focus:outline-none focus:ring-2 focus:ring-accent/20"
                    dir="ltr"
                  />
                </div>
              </>
            )}
            {mode === "signin" && (
              <div>
                <label className="mb-1.5 block text-sm font-semibold text-foreground">
                  اسم المستخدم أو البريد الإلكتروني
                </label>
                <input
                  required
                  type="text"
                  value={identifier}
                  onChange={(e) => setIdentifier(e.target.value)}
                  className="h-11 w-full rounded-lg border border-border bg-background px-3 text-sm focus:border-accent focus:outline-none focus:ring-2 focus:ring-accent/20"
                  dir="ltr"
                />
              </div>
            )}
            <div>
              <label className="mb-1.5 block text-sm font-semibold text-foreground">
                كلمة المرور
              </label>
              <input
                required
                minLength={6}
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="h-11 w-full rounded-lg border border-border bg-background px-3 text-sm focus:border-accent focus:outline-none focus:ring-2 focus:ring-accent/20"
                dir="ltr"
              />
            </div>

            <button
              type="submit"
              disabled={loading}
              className="flex h-11 w-full items-center justify-center gap-2 rounded-lg gradient-accent font-bold text-white transition hover:opacity-90 disabled:opacity-60"
            >
              {loading && <Loader2 className="h-4 w-4 animate-spin" />}
              {mode === "signin" ? "دخول" : "إنشاء الحساب"}
            </button>
          </form>

          <div className="mt-6 text-center text-sm text-muted-foreground">
            {mode === "signin" ? "ليس لديك حساب؟" : "لديك حساب بالفعل؟"}{" "}
            <button
              type="button"
              onClick={() => setMode(mode === "signin" ? "signup" : "signin")}
              className="font-bold text-accent hover:underline"
            >
              {mode === "signin" ? "أنشئ حساباً" : "سجّل الدخول"}
            </button>
          </div>

          <div className="mt-4 text-center text-xs text-muted-foreground">
            بمتابعة استخدامك فأنت توافق على{" "}
            <Link to="/terms" className="font-semibold text-primary hover:underline">شروط الاستخدام</Link>
            {" "}و{" "}
            <Link to="/privacy" className="font-semibold text-primary hover:underline">سياسة الخصوصية</Link>
          </div>
        </div>

      </div>
    </div>
  );
}
