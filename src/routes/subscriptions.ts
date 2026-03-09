import { Hono } from "hono";
import { z } from "zod";
import { ApiError } from "@/lib/errors";
import { errorResponse } from "@/lib/http";
import { prisma } from "@/lib/prisma";
import { requireAuth } from "@/middleware/auth";
import { createBillingPortalSession, createCheckoutSession } from "@/services/stripe";

const createSchema = z.object({
  restaurantId: z.string().cuid(),
  plan: z.enum(["starter", "pro"]),
  successUrl: z.string().url(),
  cancelUrl: z.string().url(),
});

const portalSchema = z.object({
  restaurantId: z.string().cuid(),
  returnUrl: z.string().url(),
});

const webhookSchema = z.object({
  type: z.enum([
    "checkout.session.completed",
    "invoice.payment_failed",
    "customer.subscription.deleted",
    "customer.subscription.updated",
  ]),
  data: z.object({
    restaurantId: z.string().cuid().optional(),
    stripeCustomerId: z.string().optional(),
    stripeSubscriptionId: z.string().optional(),
    plan: z.enum(["starter", "pro"]).optional(),
    status: z.enum(["trial", "active", "paused", "cancelled"]).optional(),
    currentPeriodEnd: z.string().datetime().nullable().optional(),
  }),
});

export const subscriptionsRoute = new Hono<{
  Variables: {
    auth: {
      clerkId: string;
      email: string | null;
    };
  };
}>()
  .post("/create", requireAuth, async (c) => {
    try {
      const auth = c.get("auth");
      const data = createSchema.parse(await c.req.json());

      const restaurant = await prisma.restaurant.findFirst({
        where: {
          id: data.restaurantId,
          owner: {
            clerkId: auth.clerkId,
          },
        },
        include: {
          owner: true,
        },
      });

      if (!restaurant) {
        throw new ApiError("Restaurant not found", 404);
      }

      const session = await createCheckoutSession({
        customerEmail: restaurant.owner.email,
        restaurantId: restaurant.id,
        restaurantName: restaurant.name,
        plan: data.plan,
        successUrl: data.successUrl,
        cancelUrl: data.cancelUrl,
      });

      return c.json({
        checkoutUrl: session.url,
        sessionId: session.id,
      });
    } catch (error) {
      return errorResponse(c, error);
    }
  })
  .post("/portal", requireAuth, async (c) => {
    try {
      const auth = c.get("auth");
      const data = portalSchema.parse(await c.req.json());
      const restaurant = await prisma.restaurant.findFirst({
        where: {
          id: data.restaurantId,
          owner: {
            clerkId: auth.clerkId,
          },
        },
        include: {
          subscription: true,
        },
      });

      if (!restaurant || !restaurant.subscription?.stripeCustomerId) {
        throw new ApiError("Active Stripe customer not found", 404);
      }

      const session = await createBillingPortalSession({
        stripeCustomerId: restaurant.subscription.stripeCustomerId,
        returnUrl: data.returnUrl,
      });

      return c.json({
        url: session.url,
      });
    } catch (error) {
      return errorResponse(c, error);
    }
  })
  .post("/webhook", async (c) => {
    try {
      if (c.req.header("x-stripe-webhook-secret") !== process.env.STRIPE_WEBHOOK_SECRET) {
        throw new ApiError("Unauthorized webhook sync request", 401);
      }

      const payload = webhookSchema.parse(await c.req.json());

      switch (payload.type) {
        case "checkout.session.completed": {
          if (!payload.data.restaurantId || !payload.data.plan) {
            throw new ApiError("Missing checkout webhook metadata", 400);
          }

          await prisma.subscription.upsert({
            where: {
              restaurantId: payload.data.restaurantId,
            },
            update: {
              plan: payload.data.plan,
              status: "active",
              stripeCustomerId: payload.data.stripeCustomerId,
              stripeSubscriptionId: payload.data.stripeSubscriptionId,
              currentPeriodEnd: payload.data.currentPeriodEnd
                ? new Date(payload.data.currentPeriodEnd)
                : null,
            },
            create: {
              restaurantId: payload.data.restaurantId,
              plan: payload.data.plan,
              status: "active",
              stripeCustomerId: payload.data.stripeCustomerId,
              stripeSubscriptionId: payload.data.stripeSubscriptionId,
              currentPeriodEnd: payload.data.currentPeriodEnd
                ? new Date(payload.data.currentPeriodEnd)
                : null,
            },
          });

          await prisma.restaurant.update({
            where: {
              id: payload.data.restaurantId,
            },
            data: {
              subscriptionStatus: "active",
              isPublished: true,
            },
          });
          break;
        }
        case "customer.subscription.updated": {
          if (!payload.data.stripeSubscriptionId || !payload.data.status) {
            throw new ApiError("Missing subscription update payload", 400);
          }

          await prisma.subscription.updateMany({
            where: {
              stripeSubscriptionId: payload.data.stripeSubscriptionId,
            },
            data: {
              status: payload.data.status,
              currentPeriodEnd: payload.data.currentPeriodEnd
                ? new Date(payload.data.currentPeriodEnd)
                : undefined,
            },
          });

          if (payload.data.status === "cancelled") {
            await prisma.restaurant.updateMany({
              where: {
                subscription: {
                  stripeSubscriptionId: payload.data.stripeSubscriptionId,
                },
              },
              data: {
                subscriptionStatus: "cancelled",
                isPublished: false,
              },
            });
          }
          break;
        }
        case "invoice.payment_failed":
        case "customer.subscription.deleted": {
          if (!payload.data.stripeSubscriptionId) {
            throw new ApiError("Missing Stripe subscription id", 400);
          }

          const status =
            payload.type === "invoice.payment_failed" ? "paused" : "cancelled";

          await prisma.subscription.updateMany({
            where: {
              stripeSubscriptionId: payload.data.stripeSubscriptionId,
            },
            data: {
              status,
            },
          });

          await prisma.restaurant.updateMany({
            where: {
              subscription: {
                stripeSubscriptionId: payload.data.stripeSubscriptionId,
              },
            },
            data: {
              subscriptionStatus: status,
              isPublished: false,
            },
          });
          break;
        }
      }

      return c.json({ ok: true });
    } catch (error) {
      return errorResponse(c, error);
    }
  });
