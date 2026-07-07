import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { PageHeader, EmptyState } from "@/components/dashboard-layout";
import { supabase } from "@/integrations/supabase/client";
import {
  AlertCircle,
  Check,
  Clock,
  CreditCard,
  Loader2,
  Send,
  ShieldCheck,
  Sparkles,
  Truck,
  Users,
} from "lucide-react";
import { toast } from "sonner";

export const Route = createFileRoute("/app/billing")({
  component: BillingPage,
});

type PlanKey = "trial" | "starter" | "professional" | "enterprise";
type BillingCycle = "monthly" | "yearly";

type Subscription = {
  id: string;
  plan: PlanKey;
  status: string;
  starts_at: string;
  ends_at: string | null;
  max_users: number | null;
  max_vehicles: number | null;
  price_monthly: number | null;
};

type BillingRequest = {
  id: string;
  current_plan: PlanKey;
  requested_plan: PlanKey;
  billing_cycle: BillingCycle;
  status: "pending" | "approved" | "rejected" | "cancelled";
  notes: string | null;
  created_at: string;
};

const PLANS: Array<{
  key: PlanKey;
  name: string;
  price: number | null;
  users: string;
  vehicles: string;
  badge: string;
  features: string[];
}> = [
  {
    key: "trial",
    name: "Trial",
    price: 0,
    users: "5 مستخدمين",
    vehicles: "10 مركبات",
    badge: "تجربة",
    features: ["CRM + TMS", "إدارة الأسطول", "فواتير أساسية"],
  },
  {
    key: "starter",
    name: "Starter",
    price: 490,
    users: "10 مستخدمين",
    vehicles: "20 مركبة",
    badge: "للشركات الصغيرة",
    features: ["كل أدوات التجربة", "تنبيهات الوثائق", "تقارير تشغيلية"],
  },
  {
    key: "professional",
    name: "Professional",
    price: 990,
    users: "35 مستخدماً",
    vehicles: "80 مركبة",
    badge: "الأكثر ملاءمة",
    features: ["التتبع الحي", "تحليلات ذكية", "أتمتة التنبيهات"],
  },
  {
    key: "enterprise",
    name: "Enterprise",
    price: null,
    users: "غير محدود",
    vehicles: "غير محدود",
    badge: "للمجموعات",
    features: ["حدود مخصصة", "صلاحيات متقدمة", "دعم وتعاقد مخصص"],
  },
];

const PLAN_LABEL: Record<PlanKey, string> = {
  trial: "Trial",
  starter: "Starter",
  professional: "Professional",
  enterprise: "Enterprise",
};

const STATUS_LABEL: Record<string, string> = {
  active: "نشط",
  pending: "قيد المراجعة",
  approved: "مقبول",
  rejected: "مرفوض",
  cancelled: "ملغى",
  past_due: "متأخر",
};

function BillingPage() {
  const [loading, setLoading] = useState(true);
  const [tenantId, setTenantId] = useState<string | null>(null);
  const [subscription, setSubscription] = useState<Subscription | null>(null);
  const [requests, setRequests] = useState<BillingRequest[]>([]);
  const [cycle, setCycle] = useState<BillingCycle>("monthly");
  const [requesting, setRequesting] = useState<PlanKey | null>(null);

  const currentPlan = subscription?.plan ?? "trial";
  const pendingRequest = requests.find((request) => request.status === "pending");

  const daysLeft = useMemo(() => {
    if (!subscription?.ends_at) return null;
    return Math.max(0, Math.ceil((new Date(subscription.ends_at).getTime() - Date.now()) / 86_400_000));
  }, [subscription?.ends_at]);

  const load = async () => {
    setLoading(true);
    const { data: userData } = await supabase.auth.getUser();
    if (!userData.user) {
      setLoading(false);
      return;
    }

    const { data: profile, error: profileError } = await supabase
      .from("profiles")
      .select("tenant_id")
      .eq("id", userData.user.id)
      .maybeSingle();

    if (profileError) toast.error(profileError.message);
    const nextTenantId = profile?.tenant_id ?? null;
    setTenantId(nextTenantId);

    if (!nextTenantId) {
      setLoading(false);
      return;
    }

    const [{ data: sub, error: subError }, { data: reqs, error: reqError }] = await Promise.all([
      supabase
        .from("subscriptions")
        .select("id,plan,status,starts_at,ends_at,max_users,max_vehicles,price_monthly")
        .eq("tenant_id", nextTenantId)
        .order("created_at", { ascending: false })
        .limit(1)
        .maybeSingle(),
      supabase
        .from("billing_requests" as any)
        .select("id,current_plan,requested_plan,billing_cycle,status,notes,created_at")
        .eq("tenant_id", nextTenantId)
        .order("created_at", { ascending: false })
        .limit(20),
    ]);

    if (subError) toast.error(subError.message);
    if (reqError) toast.error(reqError.message);
    setSubscription((sub as Subscription | null) ?? null);
    setRequests(((reqs ?? []) as unknown as BillingRequest[]) ?? []);
    setLoading(false);
  };

  useEffect(() => {
    load();
  }, []);

  const requestPlan = async (plan: PlanKey) => {
    if (!tenantId) return;
    if (plan === currentPlan) return;
    if (pendingRequest) {
      toast.info("يوجد طلب قيد المراجعة بالفعل");
      return;
    }

    setRequesting(plan);
    const { data: userData } = await supabase.auth.getUser();
    const { error } = await supabase.from("billing_requests" as any).insert({
      tenant_id: tenantId,
      requested_by: userData.user?.id ?? null,
      current_plan: currentPlan,
      requested_plan: plan,
      billing_cycle: cycle,
      status: "pending",
      notes: `طلب ترقية إلى ${PLAN_LABEL[plan]} بنظام ${cycle === "yearly" ? "سنوي" : "شهري"}`,
    });

    setRequesting(null);
    if (error) {
      toast.error(error.message);
      return;
    }
    toast.success("تم إرسال طلب الاشتراك");
    await load();
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-24">
        <Loader2 className="h-8 w-8 animate-spin text-accent" />
      </div>
    );
  }

  if (!tenantId) {
    return (
      <EmptyState
        icon={CreditCard}
        title="لا توجد شركة مرتبطة بالحساب"
        description="يجب ربط الحساب بشركة قبل إدارة الاشتراك والدفع."
      />
    );
  }

  return (
    <>
      <PageHeader
        title="الاشتراكات والدفع"
        subtitle="إدارة خطة الشركة وحدود المستخدمين والمركبات"
        action={
          <div className="flex rounded-lg border border-border bg-card p-1">
            {(["monthly", "yearly"] as BillingCycle[]).map((item) => (
              <button
                key={item}
                onClick={() => setCycle(item)}
                className={`rounded-md px-3 py-2 text-sm font-semibold transition ${
                  cycle === item ? "bg-primary text-primary-foreground" : "text-muted-foreground hover:bg-secondary"
                }`}
              >
                {item === "monthly" ? "شهري" : "سنوي"}
              </button>
            ))}
          </div>
        }
      />

      <div className="mb-6 grid gap-4 lg:grid-cols-3">
        <section className="rounded-2xl border border-border bg-card p-5">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary/10 text-primary">
              <CreditCard className="h-5 w-5" />
            </div>
            <div>
              <div className="text-sm text-muted-foreground">الخطة الحالية</div>
              <div className="text-xl font-black text-foreground">{PLAN_LABEL[currentPlan]}</div>
            </div>
          </div>
          <div className="mt-4 grid gap-2 text-sm">
            <Metric label="الحالة" value={STATUS_LABEL[subscription?.status ?? "active"] ?? subscription?.status ?? "نشط"} />
            <Metric label="المستخدمون" value={subscription?.max_users?.toLocaleString("ar") ?? "—"} />
            <Metric label="المركبات" value={subscription?.max_vehicles?.toLocaleString("ar") ?? "—"} />
          </div>
        </section>

        <section className="rounded-2xl border border-border bg-card p-5">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-success/10 text-success">
              <ShieldCheck className="h-5 w-5" />
            </div>
            <div>
              <div className="text-sm text-muted-foreground">صلاحية الاشتراك</div>
              <div className="text-xl font-black text-foreground">
                {daysLeft === null ? "مفتوح" : `${daysLeft.toLocaleString("ar")} يوم`}
              </div>
            </div>
          </div>
          <p className="mt-4 text-sm leading-6 text-muted-foreground">
            {subscription?.ends_at
              ? `ينتهي في ${new Date(subscription.ends_at).toLocaleDateString("ar")}`
              : "لا يوجد تاريخ انتهاء محدد للخطة الحالية."}
          </p>
        </section>

        <section className="rounded-2xl border border-border bg-card p-5">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-accent/10 text-accent">
              {pendingRequest ? <Clock className="h-5 w-5" /> : <Sparkles className="h-5 w-5" />}
            </div>
            <div>
              <div className="text-sm text-muted-foreground">آخر طلب</div>
              <div className="text-xl font-black text-foreground">
                {pendingRequest ? PLAN_LABEL[pendingRequest.requested_plan] : "لا يوجد طلب معلق"}
              </div>
            </div>
          </div>
          <p className="mt-4 text-sm leading-6 text-muted-foreground">
            {pendingRequest
              ? `طلب ${pendingRequest.billing_cycle === "yearly" ? "سنوي" : "شهري"} قيد المراجعة منذ ${new Date(
                  pendingRequest.created_at,
                ).toLocaleDateString("ar")}`
              : "يمكن إرسال طلب ترقية من بطاقات الخطط أدناه."}
          </p>
        </section>
      </div>

      <div className="grid gap-4 xl:grid-cols-4">
        {PLANS.map((plan) => {
          const isCurrent = plan.key === currentPlan;
          const isPending = pendingRequest?.requested_plan === plan.key;
          const yearlyPrice = plan.price === null ? null : Math.round(plan.price * 10);
          const visiblePrice = cycle === "yearly" ? yearlyPrice : plan.price;

          return (
            <section
              key={plan.key}
              className={`rounded-2xl border bg-card p-5 ${
                isCurrent ? "border-primary shadow-sm" : isPending ? "border-accent/60" : "border-border"
              }`}
            >
              <div className="mb-4 flex items-start justify-between gap-3">
                <div>
                  <div className="text-xl font-black text-foreground">{plan.name}</div>
                  <div className="mt-1 text-xs font-semibold text-accent">{plan.badge}</div>
                </div>
                {isCurrent && (
                  <span className="rounded-full bg-primary/10 px-2 py-1 text-xs font-bold text-primary">الحالية</span>
                )}
              </div>

              <div className="mb-5">
                {visiblePrice === null ? (
                  <div className="text-3xl font-black text-foreground">مخصص</div>
                ) : (
                  <div className="flex items-end gap-1">
                    <span className="text-3xl font-black text-foreground" dir="ltr">
                      {visiblePrice.toLocaleString("ar")}
                    </span>
                    <span className="pb-1 text-sm text-muted-foreground">MAD/{cycle === "yearly" ? "سنة" : "شهر"}</span>
                  </div>
                )}
              </div>

              <div className="mb-5 grid gap-2 text-sm">
                <div className="flex items-center gap-2 text-muted-foreground">
                  <Users className="h-4 w-4 text-primary" />
                  <span>{plan.users}</span>
                </div>
                <div className="flex items-center gap-2 text-muted-foreground">
                  <Truck className="h-4 w-4 text-primary" />
                  <span>{plan.vehicles}</span>
                </div>
              </div>

              <ul className="mb-5 space-y-2 text-sm text-muted-foreground">
                {plan.features.map((feature) => (
                  <li key={feature} className="flex items-center gap-2">
                    <Check className="h-4 w-4 text-success" />
                    <span>{feature}</span>
                  </li>
                ))}
              </ul>

              <button
                onClick={() => requestPlan(plan.key)}
                disabled={isCurrent || Boolean(pendingRequest) || requesting === plan.key}
                className={`flex h-10 w-full items-center justify-center gap-2 rounded-lg text-sm font-semibold transition disabled:cursor-not-allowed disabled:opacity-60 ${
                  isCurrent
                    ? "border border-border bg-secondary text-muted-foreground"
                    : "bg-accent text-accent-foreground hover:bg-accent/90"
                }`}
              >
                {requesting === plan.key ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : isPending ? (
                  <Clock className="h-4 w-4" />
                ) : isCurrent ? (
                  <Check className="h-4 w-4" />
                ) : (
                  <Send className="h-4 w-4" />
                )}
                {isCurrent ? "الخطة الحالية" : isPending ? "قيد المراجعة" : "طلب الاشتراك"}
              </button>
            </section>
          );
        })}
      </div>

      <section className="mt-6 rounded-2xl border border-border bg-card">
        <div className="flex items-center justify-between gap-3 border-b border-border p-5">
          <div>
            <h2 className="font-bold text-foreground">سجل طلبات الاشتراك</h2>
            <p className="text-xs text-muted-foreground">طلبات الترقية أو تغيير دورة الفوترة</p>
          </div>
          <AlertCircle className="h-5 w-5 text-muted-foreground" />
        </div>

        {requests.length === 0 ? (
          <div className="p-8 text-center text-sm text-muted-foreground">لا توجد طلبات اشتراك بعد.</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-secondary/50 text-xs uppercase text-muted-foreground">
                <tr>
                  <th className="p-4 text-right font-semibold">من</th>
                  <th className="p-4 text-right font-semibold">إلى</th>
                  <th className="p-4 text-right font-semibold">الدورة</th>
                  <th className="p-4 text-right font-semibold">الحالة</th>
                  <th className="p-4 text-right font-semibold">التاريخ</th>
                </tr>
              </thead>
              <tbody>
                {requests.map((request) => (
                  <tr key={request.id} className="border-t border-border hover:bg-secondary/30">
                    <td className="p-4 font-semibold">{PLAN_LABEL[request.current_plan]}</td>
                    <td className="p-4 font-semibold text-primary">{PLAN_LABEL[request.requested_plan]}</td>
                    <td className="p-4 text-muted-foreground">
                      {request.billing_cycle === "yearly" ? "سنوي" : "شهري"}
                    </td>
                    <td className="p-4">
                      <span className="rounded-md bg-accent/10 px-2 py-1 text-xs font-bold text-accent">
                        {STATUS_LABEL[request.status] ?? request.status}
                      </span>
                    </td>
                    <td className="p-4 text-muted-foreground" dir="ltr">
                      {new Date(request.created_at).toLocaleDateString("ar")}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>
    </>
  );
}

function Metric({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-center justify-between rounded-lg bg-secondary/50 px-3 py-2">
      <span className="text-muted-foreground">{label}</span>
      <span className="font-bold text-foreground">{value}</span>
    </div>
  );
}