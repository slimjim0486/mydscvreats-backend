import { Hono } from "hono";
import { z } from "zod";
import {
  getEffectiveRestaurantBillingState,
  getRestaurantEntitlements,
} from "@/lib/entitlements";
import { ApiError } from "@/lib/errors";
import { errorResponse } from "@/lib/http";
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

      const [totalViews, viewsToday, viewsThisWeek, topPaths, shortLinkTotalClicks, shortLinkClicksToday, shortLinkClicksThisWeek] = await Promise.all([
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
      ]);

      return c.json({
        tier: entitlements.analyticsTier,
        totalViews,
        viewsToday,
        viewsThisWeek,
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
      });
    } catch (error) {
      return errorResponse(c, error);
    }
  });
