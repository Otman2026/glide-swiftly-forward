import Stripe from "stripe";

type PlanKey = "trial" | "starter" | "professional" | "enterprise";
type BillingCycle = "monthly" | "yearly";

const PLAN_LIMITS: Record<PlanKey, { users: number | null; vehicles: number | null; price: number | null }> = {
  trial: { users: 5, vehicles: 10, price: 0 },
  starter: { users: 10, vehicles: 20, price: 490 },
  professional: { users: 35, vehicles: 80, price: 990 },
  enterprise: { users: null, vehicles: null, price: null },
};

const allowedPlans = new Set<PlanKey>(["trial", "starter", "professional", "enterprise"]);
const allowedCycles = new Set<BillingCycle>(["monthly", "yearly"]);

const getPeriodEnd = (subscription: Stripe.Subscription) => {
  const periodEnd = subscription.items.data[0]?.current_period_end;
  return periodEnd ? new Date(periodEnd * 1000).toISOString() : null;
};

const getPriceId = (subscription: Stripe.Subscription) => subscription.items.data[0]?.price.id ?? null;

export async function processStripeWebhookEvent(event: Stripe.Event) {
  const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

  const inserted = await supabaseAdmin
    .from("stripe_webhook_events")
    .insert({ id: event.id, event_type: event.type, payload: event as unknown as Record<string, unknown> });

  if (inserted.error) {
    if (inserted.error.code === "23505") return { duplicate: true };
    throw new Error(inserted.error.message);
  }

  if (event.type === "checkout.session.completed") {
    const session = event.data.object as Stripe.Checkout.Session;
    const tenantId = session.metadata?.tenant_id;
    const checkoutId = session.metadata?.app_checkout_id ?? session.client_reference_id;
    const plan = session.metadata?.plan as PlanKey | undefined;
    const billingCycle = session.metadata?.billing_cycle as BillingCycle | undefined;
    const subscriptionId = typeof session.subscription === "string" ? session.subscription : session.subscription?.id;
    const customerId = typeof session.customer === "string" ? session.customer : session.customer?.id;

    if (!tenantId || !plan || !allowedPlans.has(plan) || !billingCycle || !allowedCycles.has(billingCycle)) {
      throw new Error("Stripe checkout metadata is incomplete");
    }

    const limits = PLAN_LIMITS[plan];
    const now = new Date();
    const fallbackEnd = new Date(now);
    if (billingCycle === "yearly") fallbackEnd.setFullYear(fallbackEnd.getFullYear() + 1);
    else fallbackEnd.setMonth(fallbackEnd.getMonth() + 1);

    const { data: existing } = await supabaseAdmin
      .from("subscriptions")
      .select("id")
      .eq("tenant_id", tenantId)
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle();

    let stripePriceId: string | null = null;
    let periodEnd = fallbackEnd.toISOString();

    if (subscriptionId && process.env.STRIPE_SECRET_KEY) {
      const stripe = new Stripe(process.env.STRIPE_SECRET_KEY, {
        httpClient: Stripe.createFetchHttpClient(),
      });
      const subscription = await stripe.subscriptions.retrieve(subscriptionId);
      stripePriceId = getPriceId(subscription);
      periodEnd = getPeriodEnd(subscription) ?? periodEnd;
    }

    const subscriptionPayload = {
      plan,
      status: "active",
      starts_at: now.toISOString(),
      ends_at: periodEnd,
      current_period_end: periodEnd,
      max_users: limits.users,
      max_vehicles: limits.vehicles,
      price_monthly: limits.price,
      billing_cycle: billingCycle,
      stripe_customer_id: customerId ?? null,
      stripe_subscription_id: subscriptionId ?? null,
      stripe_price_id: stripePriceId,
      cancel_at_period_end: false,
    };

    const subscriptionResult = existing?.id
      ? await supabaseAdmin.from("subscriptions").update(subscriptionPayload).eq("id", existing.id)
      : await supabaseAdmin.from("subscriptions").insert({ tenant_id: tenantId, ...subscriptionPayload });

    if (subscriptionResult.error) throw new Error(subscriptionResult.error.message);

    const { error: tenantError } = await supabaseAdmin
      .from("tenants")
      .update({ status: plan === "trial" ? "trial" : "active" })
      .eq("id", tenantId);

    if (tenantError) throw new Error(tenantError.message);

    if (checkoutId) {
      await supabaseAdmin
        .from("stripe_checkout_sessions")
        .update({
          status: "completed",
          stripe_checkout_session_id: session.id,
          stripe_customer_id: customerId ?? null,
          stripe_subscription_id: subscriptionId ?? null,
          amount_total: session.amount_total,
          currency: session.currency ?? "mad",
        })
        .eq("id", checkoutId);
    }

    await supabaseAdmin.from("billing_requests").insert({
      tenant_id: tenantId,
      current_plan: "trial",
      requested_plan: plan,
      billing_cycle: billingCycle,
      status: "approved",
      notes: `Stripe Checkout مكتمل: ${session.id}`,
    });

    return { processed: true };
  }

  if (event.type === "customer.subscription.updated" || event.type === "customer.subscription.deleted") {
    const subscription = event.data.object as Stripe.Subscription;
    const tenantId = subscription.metadata?.tenant_id;
    const plan = subscription.metadata?.plan as PlanKey | undefined;
    const billingCycle = subscription.metadata?.billing_cycle as BillingCycle | undefined;

    if (!tenantId) return { processed: false };

    const payload: Record<string, unknown> = {
      status: subscription.status,
      stripe_price_id: getPriceId(subscription),
      current_period_end: getPeriodEnd(subscription),
      ends_at: getPeriodEnd(subscription),
      cancel_at_period_end: subscription.cancel_at_period_end,
    };

    if (plan && allowedPlans.has(plan)) {
      const limits = PLAN_LIMITS[plan];
      payload.plan = plan;
      payload.max_users = limits.users;
      payload.max_vehicles = limits.vehicles;
      payload.price_monthly = limits.price;
    }

    if (billingCycle && allowedCycles.has(billingCycle)) payload.billing_cycle = billingCycle;

    const { error } = await supabaseAdmin
      .from("subscriptions")
      .update(payload)
      .eq("stripe_subscription_id", subscription.id);

    if (error) throw new Error(error.message);

    return { processed: true };
  }

  if (event.type === "checkout.session.expired") {
    const session = event.data.object as Stripe.Checkout.Session;
    const checkoutId = session.metadata?.app_checkout_id ?? session.client_reference_id;
    if (checkoutId) {
      await supabaseAdmin.from("stripe_checkout_sessions").update({ status: "expired" }).eq("id", checkoutId);
    }
    return { processed: true };
  }

  return { processed: false };
}