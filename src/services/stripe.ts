import Stripe from "stripe";
import { env } from "@/lib/env";
import { ApiError } from "@/lib/errors";

let stripe: Stripe | null = null;

export function getStripe() {
  if (!env.STRIPE_SECRET_KEY) {
    return null;
  }

  if (!stripe) {
    stripe = new Stripe(env.STRIPE_SECRET_KEY, {
      apiVersion: "2025-02-24.acacia",
    });
  }

  return stripe;
}

export async function createCheckoutSession(input: {
  customerEmail?: string | null;
  restaurantId: string;
  restaurantName: string;
  plan: "starter" | "pro";
  successUrl: string;
  cancelUrl: string;
}) {
  const client = getStripe();
  if (!client) {
    throw new ApiError("Stripe is not configured", 503);
  }

  const priceId =
    input.plan === "starter"
      ? env.STRIPE_STARTER_PRICE_ID
      : env.STRIPE_PRO_PRICE_ID;

  if (!priceId) {
    throw new ApiError("Missing Stripe price configuration", 503);
  }

  return client.checkout.sessions.create({
    mode: "subscription",
    customer_email: input.customerEmail ?? undefined,
    line_items: [
      {
        price: priceId,
        quantity: 1,
      },
    ],
    success_url: input.successUrl,
    cancel_url: input.cancelUrl,
    metadata: {
      restaurant_id: input.restaurantId,
      plan: input.plan,
      restaurant_name: input.restaurantName,
    },
    allow_promotion_codes: true,
  });
}

export async function createBillingPortalSession(input: {
  stripeCustomerId: string;
  returnUrl: string;
}) {
  const client = getStripe();
  if (!client) {
    throw new ApiError("Stripe is not configured", 503);
  }

  return client.billingPortal.sessions.create({
    customer: input.stripeCustomerId,
    return_url: input.returnUrl,
  });
}
