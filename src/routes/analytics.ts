import { Hono } from "hono";
import { z } from "zod";
import {
  getEffectiveRestaurantBillingState,
  getRestaurantEntitlements,
} from "@/lib/entitlements";
import { ApiError } from "@/lib/errors";
import { errorResponse } from "@/lib/http";
import { buildPublicMenuItemWhere } from "@/lib/menu-visibility";
import { prisma } from "@/lib/prisma";
import {
  assertAllowedPublicOrigin,
  consumeRateLimit,
  getClientIp,
} from "@/lib/public-request-guards";
import { requireAuth } from "@/middleware/auth";

const pageViewSchema = z.object({
  restaurantId: z.string().cuid(),
  path: z.string().min(1),
  referrer: z.string().nullable().optional(),
  userAgent: z.string().nullable().optional(),
});

const brandingClickSchema = z.object({
  restaurantId: z.string().cuid(),
  path: z.string().min(1).optional(),
  referrer: z.string().nullable().optional(),
  userAgent: z.string().nullable().optional(),
});

const menuItemLikeSchema = z.object({
  restaurantId: z.string().cuid(),
  menuItemId: z.string().cuid(),
  path: z.string().min(1),
  referrer: z.string().nullable().optional(),
  userAgent: z.string().nullable().optional(),
});

export const analyticsRoute = new Hono<{
  Variables: {
    auth: {
      clerkId: string;
      email: string | null;
    };
  };
}>()
  .post("/page-view", async (c) => {
    try {
      const clientIp = getClientIp(c);
      assertAllowedPublicOrigin(c);

      const data = pageViewSchema.parse(await c.req.json());
      const restaurant = await prisma.restaurant.findUnique({
        where: { id: data.restaurantId },
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
      });

      if (!restaurant) {
        throw new ApiError("Restaurant not found", 404);
      }

      const effectiveBillingState = getEffectiveRestaurantBillingState(restaurant);
      if (!effectiveBillingState.isPublished) {
        throw new ApiError("Restaurant not found", 404);
      }

      const allowedPaths = new Set([
        `/${restaurant.slug}`,
        `/embed/${restaurant.slug}`,
      ]);

      if (!allowedPaths.has(data.path)) {
        throw new ApiError("Invalid analytics path", 400);
      }

      const globalLimit = consumeRateLimit({
        key: `analytics:global:${clientIp}`,
        limit: 120,
        windowMs: 10 * 60_000,
      });
      if (!globalLimit.allowed) {
        return c.json({ ok: true, rateLimited: true }, 202);
      }

      const perPageLimit = consumeRateLimit({
        key: `analytics:page:${clientIp}:${data.restaurantId}:${data.path}`,
        limit: 3,
        windowMs: 30 * 60_000,
      });
      if (!perPageLimit.allowed) {
        return c.json({ ok: true, rateLimited: true }, 202);
      }

      await prisma.pageView.create({
        data: {
          restaurantId: data.restaurantId,
          path: data.path,
          referrer: data.referrer ?? null,
          userAgent: data.userAgent ?? null,
        },
      });

      return c.json({ ok: true }, 201);
    } catch (error) {
      return errorResponse(c, error);
    }
  })
  .post("/branding-click", async (c) => {
    try {
      const clientIp = getClientIp(c);
      assertAllowedPublicOrigin(c);

      const data = brandingClickSchema.parse(await c.req.json());
      const restaurant = await prisma.restaurant.findUnique({
        where: { id: data.restaurantId },
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
      });

      if (!restaurant) {
        throw new ApiError("Restaurant not found", 404);
      }

      const effectiveBillingState = getEffectiveRestaurantBillingState(restaurant);
      if (!effectiveBillingState.isPublished) {
        throw new ApiError("Restaurant not found", 404);
      }

      const globalLimit = consumeRateLimit({
        key: `analytics:branding:global:${clientIp}`,
        limit: 30,
        windowMs: 10 * 60_000,
      });
      if (!globalLimit.allowed) {
        return c.json({ ok: true, rateLimited: true }, 202);
      }

      const perRestaurantLimit = consumeRateLimit({
        key: `analytics:branding:${clientIp}:${data.restaurantId}`,
        limit: 1,
        windowMs: 30 * 60_000,
      });
      if (!perRestaurantLimit.allowed) {
        return c.json({ ok: true, rateLimited: true }, 202);
      }

      await prisma.brandingClick.create({
        data: {
          restaurantId: data.restaurantId,
          path: data.path ?? null,
          referrer: data.referrer ?? null,
          userAgent: data.userAgent ?? null,
        },
      });

      return c.json({ ok: true }, 201);
    } catch (error) {
      return errorResponse(c, error);
    }
  })
  .post("/menu-item-like", async (c) => {
    try {
      const clientIp = getClientIp(c);
      assertAllowedPublicOrigin(c);

      const data = menuItemLikeSchema.parse(await c.req.json());
      const restaurant = await prisma.restaurant.findUnique({
        where: { id: data.restaurantId },
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
      });

      if (!restaurant) {
        throw new ApiError("Restaurant not found", 404);
      }

      const effectiveBillingState = getEffectiveRestaurantBillingState(restaurant);
      if (!effectiveBillingState.isPublished) {
        throw new ApiError("Restaurant not found", 404);
      }

      const allowedPaths = new Set([
        `/${restaurant.slug}`,
        `/embed/${restaurant.slug}`,
      ]);

      if (!allowedPaths.has(data.path)) {
        throw new ApiError("Invalid analytics path", 400);
      }

      const menuItem = await prisma.menuItem.findFirst({
        where: {
          ...buildPublicMenuItemWhere(),
          id: data.menuItemId,
          restaurantId: data.restaurantId,
        },
        select: {
          id: true,
        },
      });

      if (!menuItem) {
        throw new ApiError("Menu item not found", 404);
      }

      const globalLimit = consumeRateLimit({
        key: `analytics:item-like:global:${clientIp}`,
        limit: 120,
        windowMs: 10 * 60_000,
      });
      if (!globalLimit.allowed) {
        return c.json({ ok: true, rateLimited: true }, 202);
      }

      const perItemLimit = consumeRateLimit({
        key: `analytics:item-like:${clientIp}:${data.restaurantId}:${data.menuItemId}`,
        limit: 1,
        windowMs: 24 * 60 * 60_000,
      });
      if (!perItemLimit.allowed) {
        return c.json({ ok: true, rateLimited: true }, 202);
      }

      await prisma.menuItemLike.create({
        data: {
          restaurantId: data.restaurantId,
          menuItemId: data.menuItemId,
          path: data.path,
          referrer: data.referrer ?? null,
          userAgent: data.userAgent ?? null,
        },
      });

      return c.json({ ok: true }, 201);
    } catch (error) {
      return errorResponse(c, error);
    }
  })
  .get("/:restaurantId", requireAuth, async (c) => {
    try {
      const restaurantId = c.req.param("restaurantId");
      const auth = c.get("auth");

      const restaurant = await prisma.restaurant.findFirst({
        where: {
          id: restaurantId,
          owner: {
            clerkId: auth.clerkId,
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
        },
      });

      if (!restaurant) {
        throw new ApiError("Restaurant not found", 404);
      }

      const entitlements = getRestaurantEntitlements(restaurant);
      const includeTopPaths = entitlements.analyticsTier === "advanced";
      const activeShortLink = await prisma.restaurantShortLink.findUnique({
        where: { restaurantId },
        select: {
          id: true,
          code: true,
        },
      });

      const todayCutoff = new Date(Date.now() - 24 * 60 * 60 * 1000);
      const weekCutoff = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
      const emptyTopPaths: Array<{ path: string; _count: { path: number } }> = [];
      const emptyTopLikedItems: Array<{ menuItemId: string; _count: { menuItemId: number } }> = [];

      const [
        totalViews,
        viewsToday,
        viewsThisWeek,
        topPaths,
        shortLinkTotalClicks,
        shortLinkClicksToday,
        shortLinkClicksThisWeek,
        whatsappTotalClicks,
        whatsappClicksToday,
        whatsappClicksThisWeek,
        menuItemLikesTotal,
        menuItemLikesToday,
        menuItemLikesThisWeek,
        topLikedItemGroups,
        brandingTotalClicks,
        brandingClicksThisWeek,
      ] = await Promise.all([
        prisma.pageView.count({ where: { restaurantId } }),
        prisma.pageView.count({
          where: {
            restaurantId,
            createdAt: {
              gte: todayCutoff,
            },
          },
        }),
        prisma.pageView.count({
          where: {
            restaurantId,
            createdAt: {
              gte: weekCutoff,
            },
          },
        }),
        includeTopPaths
          ? prisma.pageView.groupBy({
              by: ["path"],
              where: { restaurantId },
              _count: {
                path: true,
              },
              orderBy: {
                _count: {
                  path: "desc",
                },
              },
              take: 5,
            })
          : Promise.resolve(emptyTopPaths),
        activeShortLink
          ? prisma.restaurantShortLinkClick.count({
              where: {
                restaurantId,
                shortLinkId: activeShortLink.id,
              },
            })
          : Promise.resolve(0),
        activeShortLink
          ? prisma.restaurantShortLinkClick.count({
              where: {
                restaurantId,
                shortLinkId: activeShortLink.id,
                createdAt: {
                  gte: todayCutoff,
                },
              },
            })
          : Promise.resolve(0),
        activeShortLink
          ? prisma.restaurantShortLinkClick.count({
              where: {
                restaurantId,
                shortLinkId: activeShortLink.id,
                createdAt: {
                  gte: weekCutoff,
                },
              },
            })
          : Promise.resolve(0),
        prisma.whatsAppClick.count({
          where: {
            restaurantId,
          },
        }),
        prisma.whatsAppClick.count({
          where: {
            restaurantId,
            createdAt: {
              gte: todayCutoff,
            },
          },
        }),
        prisma.whatsAppClick.count({
          where: {
            restaurantId,
            createdAt: {
              gte: weekCutoff,
            },
          },
        }),
        prisma.menuItemLike.count({
          where: {
            restaurantId,
          },
        }),
        prisma.menuItemLike.count({
          where: {
            restaurantId,
            createdAt: {
              gte: todayCutoff,
            },
          },
        }),
        prisma.menuItemLike.count({
          where: {
            restaurantId,
            createdAt: {
              gte: weekCutoff,
            },
          },
        }),
        prisma.menuItemLike.groupBy({
          by: ["menuItemId"],
          where: {
            restaurantId,
          },
          _count: {
            menuItemId: true,
          },
          orderBy: {
            _count: {
              menuItemId: "desc",
            },
          },
          take: 5,
        }).catch(() => emptyTopLikedItems),
        prisma.brandingClick.count({ where: { restaurantId } }),
        prisma.brandingClick.count({
          where: { restaurantId, createdAt: { gte: weekCutoff } },
        }),
      ]);

      const topLikedItems =
        topLikedItemGroups.length === 0
          ? []
          : await prisma.menuItem.findMany({
              where: {
                id: {
                  in: topLikedItemGroups.map((entry) => entry.menuItemId),
                },
                restaurantId,
              },
              select: {
                id: true,
                name: true,
              },
            }).then((items) => {
              const itemsById = new Map(items.map((item) => [item.id, item]));

              return topLikedItemGroups
                .map((entry) => {
                  const menuItem = itemsById.get(entry.menuItemId);
                  if (!menuItem) {
                    return null;
                  }

                  return {
                    menuItemId: menuItem.id,
                    name: menuItem.name,
                    likes: entry._count.menuItemId,
                  };
                })
                .filter((entry): entry is NonNullable<typeof entry> => entry !== null);
            });

      return c.json({
        tier: entitlements.analyticsTier,
        totalViews,
        viewsToday,
        viewsThisWeek,
        likes: {
          total: menuItemLikesTotal,
          today: menuItemLikesToday,
          thisWeek: menuItemLikesThisWeek,
          topItems: topLikedItems,
        },
        whatsapp: restaurant.whatsappNumber
          ? {
              totalClicks: whatsappTotalClicks,
              clicksToday: whatsappClicksToday,
              clicksThisWeek: whatsappClicksThisWeek,
            }
          : null,
        shortLink: activeShortLink
          ? {
              code: activeShortLink.code,
              totalClicks: shortLinkTotalClicks,
              clicksToday: shortLinkClicksToday,
              clicksThisWeek: shortLinkClicksThisWeek,
            }
          : null,
        topPaths: topPaths.map((entry) => ({
          path: entry.path,
          views: entry._count.path,
        })),
        branding: {
          totalClicks: brandingTotalClicks,
          clicksThisWeek: brandingClicksThisWeek,
        },
      });
    } catch (error) {
      return errorResponse(c, error);
    }
  });
