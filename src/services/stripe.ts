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

export async function createPortfolioCheckoutSession(input: {
  customerEmail?: string | null;
  stripeCustomerId?: string | null;
  operatorAccountId: string;
  operatorName: string;
  brandCount: number;
  successUrl: string;
  cancelUrl: string;
  legacyRestaurantId?: string | null;
}) {
  const client = getStripe();
  if (!client) {
    throw new ApiError("Stripe is not configured", 503);
  }

  if (!env.STRIPE_PORTFOLIO_PRICE_ID) {
    throw new ApiError("Missing Stripe portfolio price configuration", 503);
  }

  const quantity = Math.max(input.brandCount, 3);

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
        price: env.STRIPE_PORTFOLIO_PRICE_ID,
        quantity,
      },
    ],
    success_url: input.successUrl,
    cancel_url: input.cancelUrl,
    client_reference_id: input.operatorAccountId,
    metadata: {
      operator_account_id: input.operatorAccountId,
      operator_name: input.operatorName,
      plan: "portfolio",
      brand_count: String(quantity),
      ...(input.legacyRestaurantId ? { legacy_restaurant_id: input.legacyRestaurantId } : {}),
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
        operator_account_id: input.operatorAccountId,
        operator_name: input.operatorName,
        plan: "portfolio",
        brand_count: String(quantity),
        ...(input.legacyRestaurantId ? { legacy_restaurant_id: input.legacyRestaurantId } : {}),
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

export async function updatePortfolioSubscriptionQuantity(input: {
  stripeSubscriptionId: string;
  quantity: number;
}) {
  const client = getStripe();
  if (!client) {
    throw new ApiError("Stripe is not configured", 503);
  }

  const subscription = await client.subscriptions.retrieve(input.stripeSubscriptionId);
  const itemId = subscription.items.data[0]?.id;

  if (!itemId) {
    throw new ApiError("Portfolio subscription item not found", 404);
  }

  return client.subscriptions.update(input.stripeSubscriptionId, {
    items: [
      {
        id: itemId,
        quantity: Math.max(input.quantity, 3),
      },
    ],
    proration_behavior: "create_prorations",
  });
}

export async function cancelStripeSubscription(stripeSubscriptionId: string) {
  const client = getStripe();
  if (!client) {
    throw new ApiError("Stripe is not configured", 503);
  }

  return client.subscriptions.cancel(stripeSubscriptionId);
}
