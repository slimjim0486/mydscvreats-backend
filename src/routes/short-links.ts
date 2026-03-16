import { randomBytes } from "node:crypto";
import { Hono } from "hono";
import { getEffectiveRestaurantBillingState, getRestaurantEntitlements } from "@/lib/entitlements";
import { ApiError } from "@/lib/errors";
import { errorResponse } from "@/lib/http";
import { prisma } from "@/lib/prisma";
import { requireAuth } from "@/middleware/auth";

const SHORT_LINK_ALPHABET = "23456789ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz";
const SHORT_LINK_LENGTH = 7;
const MAX_CODE_ATTEMPTS = 20;

function generateShortCode() {
  const bytes = randomBytes(SHORT_LINK_LENGTH);
  let code = "";

  for (let index = 0; index < SHORT_LINK_LENGTH; index += 1) {
    code += SHORT_LINK_ALPHABET[bytes[index] % SHORT_LINK_ALPHABET.length];
  }

  return code;
}

async function createUniqueShortCode(existingCode?: string | null) {
  for (let attempt = 0; attempt < MAX_CODE_ATTEMPTS; attempt += 1) {
    const code = generateShortCode();

    if (code === existingCode) {
      continue;
    }

    const [primaryMatch, aliasMatch] = await Promise.all([
      prisma.restaurantShortLink.findUnique({
        where: { code },
        select: { id: true },
      }),
      prisma.restaurantShortLinkAlias.findUnique({
        where: { code },
        select: { id: true },
      }),
    ]);

    if (!primaryMatch && !aliasMatch) {
      return code;
    }
  }

  throw new ApiError("Unable to generate a unique short link right now", 503);
}

async function getOwnedRestaurant(restaurantId: string, clerkId: string) {
  const restaurant = await prisma.restaurant.findFirst({
    where: {
      id: restaurantId,
      owner: {
        clerkId,
      },
    },
    include: {
      subscription: true,
      operatorAccount: {
        include: {
          _count: {
            select: {
              brands: true,
            },
          },
        },
      },
      shortLink: true,
    },
  });

  if (!restaurant) {
    throw new ApiError("Restaurant not found", 404);
  }

  return restaurant;
}

export const shortLinksRoute = new Hono<{
  Variables: {
    auth: {
      clerkId: string;
      email: string | null;
    };
  };
}>()
  .get("/resolve/:code", async (c) => {
    try {
      const code = c.req.param("code");
      const primaryShortLink = await prisma.restaurantShortLink.findUnique({
        where: { code },
        include: {
          restaurant: {
            include: {
              subscription: true,
              operatorAccount: {
                include: {
                  _count: {
                    select: {
                      brands: true,
                    },
                  },
                },
              },
            },
          },
        },
      });
      const alias = primaryShortLink
        ? null
        : await prisma.restaurantShortLinkAlias.findUnique({
            where: { code },
            include: {
              shortLink: {
                include: {
                  restaurant: {
                    include: {
                      subscription: true,
                      operatorAccount: {
                        include: {
                          _count: {
                            select: {
                              brands: true,
                            },
                          },
                        },
                      },
                    },
                  },
                },
              },
            },
          });
      const shortLink = primaryShortLink ?? alias?.shortLink ?? null;

      if (!shortLink) {
        throw new ApiError("Short link not found", 404);
      }

      const restaurant = getEffectiveRestaurantBillingState(shortLink.restaurant);

      if (!restaurant.isPublished) {
        throw new ApiError("Short link not found", 404);
      }

      await prisma.restaurantShortLinkClick.create({
        data: {
          restaurantId: shortLink.restaurantId,
          shortLinkId: shortLink.id,
          code: shortLink.code,
          userAgent:
            c.req.header("x-forwarded-user-agent") ??
            c.req.header("user-agent") ??
            null,
          referrer:
            c.req.header("x-forwarded-referrer") ??
            c.req.header("referer") ??
            c.req.header("referrer") ??
            null,
        },
      });

      return c.json({
        slug: shortLink.restaurant.slug,
      });
    } catch (error) {
      return errorResponse(c, error);
    }
  })
  .post("/:restaurantId/generate", requireAuth, async (c) => {
    try {
      const auth = c.get("auth");
      const restaurantId = c.req.param("restaurantId");
      const restaurant = await getOwnedRestaurant(restaurantId, auth.clerkId);
      const entitlements = getRestaurantEntitlements(restaurant);

      if (!entitlements.shortLinksEnabled) {
        throw new ApiError("Short links are only available on Pro", 403);
      }

      const created = !restaurant.shortLink;
      const code = await createUniqueShortCode(restaurant.shortLink?.code);
      const shortLink = await prisma.$transaction(async (tx) => {
        if (restaurant.shortLink) {
          await tx.restaurantShortLinkAlias.upsert({
            where: { code: restaurant.shortLink.code },
            update: {},
            create: {
              shortLinkId: restaurant.shortLink.id,
              code: restaurant.shortLink.code,
            },
          });
        }

        return tx.restaurantShortLink.upsert({
          where: { restaurantId: restaurant.id },
          update: { code },
          create: {
            restaurantId: restaurant.id,
            code,
          },
        });
      });

      return c.json(shortLink, created ? 201 : 200);
    } catch (error) {
      return errorResponse(c, error);
    }
  })
  .delete("/:restaurantId", requireAuth, async (c) => {
    try {
      const auth = c.get("auth");
      const restaurantId = c.req.param("restaurantId");
      const restaurant = await getOwnedRestaurant(restaurantId, auth.clerkId);
      const entitlements = getRestaurantEntitlements(restaurant);

      if (!entitlements.shortLinksEnabled) {
        throw new ApiError("Short links are only available on Pro", 403);
      }

      await prisma.restaurantShortLink.deleteMany({
        where: { restaurantId: restaurant.id },
      });

      return c.body(null, 204);
    } catch (error) {
      return errorResponse(c, error);
    }
  });
