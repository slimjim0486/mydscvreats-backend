import { Hono } from "hono";
import { z } from "zod";
import { ApiError } from "@/lib/errors";
import { errorResponse } from "@/lib/http";
import { prisma } from "@/lib/prisma";
import { requireAuth } from "@/middleware/auth";

const campaignSchema = z.object({
  type: z.enum(["inactive_30", "weekend_special", "new_promotion"]),
  name: z.string().trim().min(2).max(120).optional(),
  templateName: z.string().trim().min(2).max(80).optional(),
  body: z.string().trim().min(10).max(900).optional(),
  promotionId: z.string().cuid().optional(),
});

const consentSchema = z.object({
  marketingOptIn: z.boolean(),
});

async function getOwnedRestaurant(restaurantId: string, clerkId: string) {
  const restaurant = await prisma.restaurant.findFirst({
    where: {
      id: restaurantId,
      owner: {
        clerkId,
      },
    },
    select: {
      id: true,
      name: true,
      slug: true,
      whatsappNumber: true,
    },
  });

  if (!restaurant) {
    throw new ApiError("Restaurant not found", 404);
  }

  return restaurant;
}

function toNumber(value: { toString(): string } | number | null | undefined) {
  if (value === null || value === undefined) {
    return 0;
  }

  return Number(value.toString());
}

function buildWhatsappUrl(phoneNumber: string, body: string) {
  const digitsOnly = phoneNumber.replace(/\D/g, "");
  const url = new URL(`https://wa.me/${digitsOnly}`);
  url.searchParams.set("text", body);
  return url.toString();
}

function getDefaultCampaignBody(input: {
  type: "inactive_30" | "weekend_special" | "new_promotion";
  restaurantName: string;
  promotionTitle?: string | null;
}) {
  if (input.type === "inactive_30") {
    return `Hi {{name}}, we miss you at ${input.restaurantName}. Your favorites are ready whenever you are. Reply here to order on WhatsApp.`;
  }

  if (input.type === "new_promotion") {
    const offer = input.promotionTitle ? `: ${input.promotionTitle}` : "";
    return `Hi {{name}}, ${input.restaurantName} just added a new offer${offer}. Reply here and we will help you order.`;
  }

  return `Hi {{name}}, planning weekend food? ${input.restaurantName} is taking WhatsApp orders now. Reply here to place yours.`;
}

function personalizeBody(body: string, customerName: string) {
  return body.replace(/\{\{\s*name\s*\}\}/gi, customerName);
}

export const crmRoute = new Hono<{
  Variables: {
    auth: {
      clerkId: string;
      email: string | null;
    };
  };
}>()
  .get("/:restaurantId", requireAuth, async (c) => {
    try {
      const restaurantId = c.req.param("restaurantId");
      const auth = c.get("auth");
      await getOwnedRestaurant(restaurantId, auth.clerkId);

      const inactiveCutoff = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
      const [
        customerCount,
        optedInCount,
        repeatCustomerCount,
        inactive30Count,
        orderCount,
        revenue,
        recentOrders,
        customers,
        campaigns,
        promotions,
      ] = await Promise.all([
        prisma.customer.count({ where: { restaurantId } }),
        prisma.customer.count({ where: { restaurantId, marketingOptIn: true } }),
        prisma.customer.count({ where: { restaurantId, orderCount: { gt: 1 } } }),
        prisma.customer.count({
          where: {
            restaurantId,
            marketingOptIn: true,
            lastOrderAt: {
              lt: inactiveCutoff,
            },
          },
        }),
        prisma.orderIntent.count({ where: { restaurantId } }),
        prisma.orderIntent.aggregate({
          where: { restaurantId },
          _sum: {
            totalPrice: true,
          },
        }),
        prisma.orderIntent.findMany({
          where: { restaurantId },
          orderBy: { createdAt: "desc" },
          take: 10,
          include: {
            customer: true,
            items: {
              orderBy: { createdAt: "asc" },
            },
          },
        }),
        prisma.customer.findMany({
          where: { restaurantId },
          orderBy: [{ lastOrderAt: "desc" }, { createdAt: "desc" }],
          take: 50,
        }),
        prisma.campaign.findMany({
          where: { restaurantId },
          orderBy: { createdAt: "desc" },
          take: 10,
          include: {
            promotion: {
              select: {
                id: true,
                title: true,
              },
            },
            messages: {
              select: {
                id: true,
                customerId: true,
                status: true,
                whatsappUrl: true,
                createdAt: true,
              },
              orderBy: {
                createdAt: "desc",
              },
              take: 5,
            },
          },
        }),
        prisma.promotion.findMany({
          where: {
            restaurantId,
            isActive: true,
          },
          orderBy: [{ isFeatured: "desc" }, { displayOrder: "asc" }],
          take: 20,
          select: {
            id: true,
            title: true,
            subtitle: true,
            promoPrice: true,
            startsAt: true,
            endsAt: true,
          },
        }),
      ]);

      return c.json({
        stats: {
          customerCount,
          optedInCount,
          repeatCustomerCount,
          inactive30Count,
          orderCount,
          estimatedRevenue: toNumber(revenue._sum.totalPrice),
        },
        recentOrders: recentOrders.map((order) => ({
          id: order.id,
          customerId: order.customerId,
          customerName: order.customerName,
          phoneNumber: order.phoneNumber,
          fulfillmentMethod: order.fulfillmentMethod,
          address: order.address,
          notes: order.notes,
          totalPrice: toNumber(order.totalPrice),
          currency: order.currency,
          itemCount: order.itemCount,
          createdAt: order.createdAt,
          items: order.items.map((item) => ({
            id: item.id,
            menuItemId: item.menuItemId,
            itemName: item.itemName,
            quantity: item.quantity,
            unitPrice: toNumber(item.unitPrice),
          })),
        })),
        customers: customers.map((customer) => ({
          id: customer.id,
          displayName: customer.displayName,
          phoneNumber: customer.phoneNumber,
          marketingOptIn: customer.marketingOptIn,
          lastOrderAt: customer.lastOrderAt,
          orderCount: customer.orderCount,
          totalSpend: toNumber(customer.totalSpend),
          currency: customer.currency,
          createdAt: customer.createdAt,
        })),
        campaigns: campaigns.map((campaign) => ({
          id: campaign.id,
          type: campaign.type,
          status: campaign.status,
          name: campaign.name,
          templateName: campaign.templateName,
          body: campaign.body,
          targetSegment: campaign.targetSegment,
          targetCount: campaign.targetCount,
          loggedCount: campaign.loggedCount,
          createdAt: campaign.createdAt,
          loggedAt: campaign.loggedAt,
          promotion: campaign.promotion,
          messages: campaign.messages,
        })),
        promotions: promotions.map((promotion) => ({
          ...promotion,
          promoPrice: toNumber(promotion.promoPrice),
        })),
      });
    } catch (error) {
      return errorResponse(c, error);
    }
  })
  .post("/:restaurantId/campaigns", requireAuth, async (c) => {
    try {
      const restaurantId = c.req.param("restaurantId");
      const auth = c.get("auth");
      const restaurant = await getOwnedRestaurant(restaurantId, auth.clerkId);
      const data = campaignSchema.parse(await c.req.json());

      const promotion = data.promotionId
        ? await prisma.promotion.findFirst({
            where: {
              id: data.promotionId,
              restaurantId,
            },
            select: {
              id: true,
              title: true,
            },
          })
        : null;

      if (data.promotionId && !promotion) {
        throw new ApiError("Promotion not found", 404);
      }

      const inactiveCutoff = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
      const customerWhere =
        data.type === "inactive_30"
          ? {
              restaurantId,
              marketingOptIn: true,
              lastOrderAt: {
                lt: inactiveCutoff,
              },
            }
          : {
              restaurantId,
              marketingOptIn: true,
            };

      const customers = await prisma.customer.findMany({
        where: customerWhere,
        orderBy: [{ lastOrderAt: "asc" }, { createdAt: "asc" }],
        take: 100,
      });
      const body =
        data.body ??
        getDefaultCampaignBody({
          type: data.type,
          restaurantName: restaurant.name,
          promotionTitle: promotion?.title,
        });
      const templateName = data.templateName ?? data.type;
      const campaignName =
        data.name ??
        (data.type === "inactive_30"
          ? "30-day reactivation"
          : data.type === "new_promotion"
            ? "New promotion broadcast"
            : "Weekend special broadcast");

      const campaign = await prisma.$transaction(async (tx) => {
        const createdCampaign = await tx.campaign.create({
          data: {
            restaurantId,
            promotionId: promotion?.id ?? null,
            type: data.type,
            status: "logged",
            name: campaignName,
            templateName,
            body,
            targetSegment: data.type,
            targetCount: customers.length,
            loggedCount: customers.length,
            loggedAt: new Date(),
          },
        });

        if (customers.length > 0) {
          await tx.messageLog.createMany({
            data: customers.map((customer) => {
              const personalizedBody = personalizeBody(body, customer.displayName);

              return {
                restaurantId,
                customerId: customer.id,
                campaignId: createdCampaign.id,
                status: "logged",
                body: personalizedBody,
                whatsappUrl: buildWhatsappUrl(customer.phoneNumber, personalizedBody),
              };
            }),
          });
        }

        return createdCampaign;
      });

      return c.json({ campaign, targeted: customers.length }, 201);
    } catch (error) {
      return errorResponse(c, error);
    }
  })
  .patch("/:restaurantId/customers/:customerId/consent", requireAuth, async (c) => {
    try {
      const restaurantId = c.req.param("restaurantId");
      const customerId = c.req.param("customerId");
      const auth = c.get("auth");
      await getOwnedRestaurant(restaurantId, auth.clerkId);
      const data = consentSchema.parse(await c.req.json());

      const updated = await prisma.$transaction(async (tx) => {
        const existingCustomer = await tx.customer.findFirst({
          where: {
            id: customerId,
            restaurantId,
          },
          select: {
            id: true,
          },
        });

        if (!existingCustomer) {
          throw new ApiError("Customer not found", 404);
        }

        const customer = await tx.customer.update({
          where: {
            id: customerId,
          },
          data: {
            marketingOptIn: data.marketingOptIn,
            marketingOptInAt: data.marketingOptIn ? new Date() : undefined,
            marketingOptOutAt: data.marketingOptIn ? null : new Date(),
          },
        });

        await tx.customerConsent.create({
          data: {
            restaurantId,
            customerId,
            status: data.marketingOptIn ? "opt_in" : "opt_out",
            source: "dashboard",
          },
        });

        return customer;
      });

      return c.json({
        id: updated.id,
        marketingOptIn: updated.marketingOptIn,
      });
    } catch (error) {
      return errorResponse(c, error);
    }
  });
