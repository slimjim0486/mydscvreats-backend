import { Hono } from "hono";
import { z } from "zod";
import { getEffectiveRestaurantBillingState } from "@/lib/entitlements";
import { ApiError } from "@/lib/errors";
import { errorResponse } from "@/lib/http";
import { prisma } from "@/lib/prisma";

const redirectQuerySchema = z.object({
  source: z.enum(["floating", "contact", "menu_item", "promotion"]).default("floating"),
  menuItemId: z.string().cuid().optional(),
  promotionId: z.string().cuid().optional(),
  path: z.string().max(255).optional(),
  campaign: z.string().max(120).optional(),
});

function normalizeWhatsappNumber(value: string | null | undefined) {
  if (!value) {
    return null;
  }

  const digitsOnly = value.replace(/\D/g, "");
  return digitsOnly.length >= 8 ? digitsOnly : null;
}

function buildWhatsappMessage(input: {
  prefill?: string | null;
  itemName?: string | null;
  promotionTitle?: string | null;
}) {
  const intro =
    input.prefill?.trim() || `Hi, I found your menu on MyDscvr Eats`;

  if (input.itemName) {
    return `${intro} and I'm interested in ${input.itemName}. Is it available now?`;
  }

  if (input.promotionTitle) {
    return `${intro} and I'd like to ask about the ${input.promotionTitle} offer. Is it available now?`;
  }

  return `${intro} and I had a question about the menu.`;
}

export const whatsappRoute = new Hono().get("/redirect/:restaurantId", async (c) => {
  try {
    const restaurantId = c.req.param("restaurantId");
    const query = redirectQuerySchema.parse(c.req.query());

    const restaurant = await prisma.restaurant.findUnique({
      where: { id: restaurantId },
      include: {
        subscription: true,
      },
    });

    if (!restaurant) {
      throw new ApiError("Restaurant not found", 404);
    }

    const effectiveBillingState = getEffectiveRestaurantBillingState(restaurant);
    if (!effectiveBillingState.isPublished) {
      throw new ApiError("Restaurant not found", 404);
    }

    const whatsappNumber = normalizeWhatsappNumber(restaurant.whatsappNumber);
    if (!whatsappNumber) {
      throw new ApiError("WhatsApp is not configured for this restaurant", 404);
    }

    const [menuItem, promotion] = await Promise.all([
      query.menuItemId
        ? prisma.menuItem.findFirst({
            where: {
              id: query.menuItemId,
              restaurantId: restaurant.id,
              isAvailable: true,
            },
            select: {
              id: true,
              name: true,
            },
          })
        : Promise.resolve(null),
      query.promotionId
        ? prisma.promotion.findFirst({
            where: {
              id: query.promotionId,
              restaurantId: restaurant.id,
            },
            select: {
              id: true,
              title: true,
            },
          })
        : Promise.resolve(null),
    ]);

    const message = buildWhatsappMessage({
      prefill: restaurant.whatsappPrefill,
      itemName: menuItem?.name,
      promotionTitle: promotion?.title,
    });

    try {
      await prisma.whatsAppClick.create({
        data: {
          restaurantId: restaurant.id,
          menuItemId: menuItem?.id ?? null,
          promotionId: promotion?.id ?? null,
          source: query.source,
          path: query.path ?? null,
          campaign: query.campaign ?? null,
          referrer: c.req.header("referer") ?? c.req.header("referrer") ?? null,
          userAgent: c.req.header("user-agent") ?? null,
        },
      });
    } catch (error) {
      console.error("Failed to record WhatsApp click", error);
    }

    const whatsappUrl = new URL(`https://wa.me/${whatsappNumber}`);
    whatsappUrl.searchParams.set("text", message);

    return c.redirect(whatsappUrl.toString(), 302);
  } catch (error) {
    return errorResponse(c, error);
  }
});
