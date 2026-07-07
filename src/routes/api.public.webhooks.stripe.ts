import { createFileRoute } from "@tanstack/react-router";
import Stripe from "stripe";

export const Route = createFileRoute("/api/public/webhooks/stripe")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        const stripeSecretKey = process.env.STRIPE_SECRET_KEY;
        const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET;

        if (!stripeSecretKey || !webhookSecret) {
          return Response.json({ error: "Stripe secrets are not configured" }, { status: 500 });
        }

        const signature = request.headers.get("stripe-signature");
        if (!signature) {
          return Response.json({ error: "Missing Stripe signature" }, { status: 400 });
        }

        const rawBody = await request.text();
        const stripe = new Stripe(stripeSecretKey, {
          httpClient: Stripe.createFetchHttpClient(),
        });

        let event: Stripe.Event;
        try {
          event = await stripe.webhooks.constructEventAsync(
            rawBody,
            signature,
            webhookSecret,
            undefined,
            Stripe.createSubtleCryptoProvider(),
          );
        } catch (error) {
          const message = error instanceof Error ? error.message : "Invalid Stripe webhook signature";
          return Response.json({ error: message }, { status: 400 });
        }

        try {
          const { processStripeWebhookEvent } = await import("@/lib/stripe-webhook.server");
          const result = await processStripeWebhookEvent(event);
          return Response.json({ received: true, ...result });
        } catch (error) {
          console.error("Stripe webhook processing failed", error);
          return Response.json({ error: "Webhook processing failed" }, { status: 500 });
        }
      },
    },
  },
});