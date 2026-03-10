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
  stripeCustomerId?: string | null;
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
    ...(input.stripeCustomerId
      ? {
          customer: input.stripeCustomerId,
        }
      : {
          customer_email: input.customerEmail ?? undefined,
        }),
    line_items: [
      {
        price: priceId,
        quantity: 1,
      },
    ],
    success_url: input.successUrl,
    cancel_url: input.cancelUrl,
    client_reference_id: input.restaurantId,
    metadata: {
      restaurant_id: input.restaurantId,
      plan: input.plan,
      restaurant_name: input.restaurantName,
    },
    allow_promotion_codes: true,
    payment_method_collection: "if_required",
    subscription_data: {
      trial_period_days: env.STRIPE_TRIAL_DAYS,
      trial_settings: {
        end_behavior: {
          missing_payment_method: "cancel",
        },
      },
      metadata: {
        restaurant_id: input.restaurantId,
        plan: input.plan,
        restaurant_name: input.restaurantName,
      },
    },
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
