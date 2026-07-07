import { createServerFn } from "@tanstack/react-start";
import { getRequestHeader } from "@tanstack/react-start/server";
import { z } from "zod";
import Stripe from "stripe";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

type PlanKey = "starter" | "professional";
type BillingCycle = "monthly" | "yearly";

const PLAN_CONFIG: Record<PlanKey, { name: string; monthly: number; users: number; vehicles: number }> = {
  starter: { name: "Starter", monthly: 490, users: 10, vehicles: 20 },
  professional: { name: "Professional", monthly: 990, users: 35, vehicles: 80 },
};

const checkoutInput = z.object({
  plan: z.enum(["starter", "professional"]),
  billingCycle: z.enum(["monthly", "yearly"]),
});

const getAmount = (plan: PlanKey, cycle: BillingCycle) => {
  const monthly = PLAN_CONFIG[plan].monthly;
  return cycle === "yearly" ? monthly * 10 : monthly;
};

const getOrigin = () => {
  const origin = getRequestHeader("origin");
  if (origin) return origin;

  const referer = getRequestHeader("referer");
  if (referer) return new URL(referer).origin;

  return "http://localhost:8080";
};

export const createStripeCheckoutSession = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input) => checkoutInput.parse(input))
  .handler(async ({ data, context }) => {
    const stripeSecretKey = process.env.STRIPE_SECRET_KEY;
    if (!stripeSecretKey) {
      throw new Error("STRIPE_SECRET_KEY غير مهيأ بعد");
    }

    const { supabase, userId } = context;
    const { plan, billingCycle } = data;

    const { data: profile, error: profileError } = await supabase
      .from("profiles")
      .select("tenant_id,email,full_name")
      .eq("id", userId)
      .maybeSingle();

    if (profileError) throw new Error(profileError.message);
    if (!profile?.tenant_id) throw new Error("لا توجد شركة مرتبطة بالحساب");

    const { data: isAdmin, error: roleError } = await supabase.rpc("has_tenant_role", {
      _user_id: userId,
      _tenant_id: profile.tenant_id,
      _role: "company_admin",
    });

    if (roleError) throw new Error(roleError.message);
    if (!isAdmin) throw new Error("هذه العملية متاحة لمدير الشركة فقط");

    const { data: tenant, error: tenantError } = await supabase
      .from("tenants")
      .select("name,contact_email")
      .eq("id", profile.tenant_id)
      .maybeSingle();

    if (tenantError) throw new Error(tenantError.message);

    const { data: currentSubscription } = await supabase
      .from("subscriptions")
      .select("stripe_customer_id")
      .eq("tenant_id", profile.tenant_id)
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle();

    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const checkoutRecord = await supabaseAdmin
      .from("stripe_checkout_sessions")
      .insert({
        tenant_id: profile.tenant_id,
        requested_by: userId,
        plan,
        billing_cycle: billingCycle,
        amount_total: getAmount(plan, billingCycle) * 100,
        currency: "mad",
        status: "created",
      })
      .select("id")
      .single();

    if (checkoutRecord.error) throw new Error(checkoutRecord.error.message);

    const stripe = new Stripe(stripeSecretKey, {
      httpClient: Stripe.createFetchHttpClient(),
    });

    const origin = getOrigin();
    const amount = getAmount(plan, billingCycle);
    const interval = billingCycle === "yearly" ? "year" : "month";
    const metadata = {
      tenant_id: profile.tenant_id,
      app_checkout_id: checkoutRecord.data.id,
      plan,
      billing_cycle: billingCycle,
    };

    const sessionParams: Stripe.Checkout.SessionCreateParams = {
      mode: "subscription",
      success_url: `${origin}/app/billing?checkout=success&session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${origin}/app/billing?checkout=cancelled`,
      client_reference_id: checkoutRecord.data.id,
      metadata,
      subscription_data: { metadata },
      line_items: [
        {
          quantity: 1,
          price_data: {
            currency: "mad",
            unit_amount: amount * 100,
            recurring: { interval },
            product_data: {
              name: `SAIFO ${PLAN_CONFIG[plan].name}`,
              description: `${PLAN_CONFIG[plan].users} مستخدمين · ${PLAN_CONFIG[plan].vehicles} مركبة`,
              metadata: { plan },
            },
          },
        },
      ],
    };

    const existingCustomerId = currentSubscription?.stripe_customer_id;
    if (existingCustomerId) {
      sessionParams.customer = existingCustomerId;
    } else {
      sessionParams.customer_email = profile.email ?? tenant?.contact_email ?? undefined;
    }

    const session = await stripe.checkout.sessions.create(sessionParams);

    const { error: updateError } = await supabaseAdmin
      .from("stripe_checkout_sessions")
      .update({
        stripe_checkout_session_id: session.id,
        stripe_customer_id: typeof session.customer === "string" ? session.customer : null,
        amount_total: session.amount_total ?? amount * 100,
        currency: session.currency ?? "mad",
        status: session.status ?? "open",
      })
      .eq("id", checkoutRecord.data.id);

    if (updateError) throw new Error(updateError.message);
    if (!session.url) throw new Error("لم يتم إنشاء رابط الدفع");

    return { url: session.url };
  });