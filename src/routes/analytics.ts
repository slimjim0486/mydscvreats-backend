import { Hono } from "hono";
import { z } from "zod";
import { getRestaurantEntitlements } from "@/lib/entitlements";
import { ApiError } from "@/lib/errors";
import { errorResponse } from "@/lib/http";
import { prisma } from "@/lib/prisma";
import { requireAuth } from "@/middleware/auth";

const pageViewSchema = z.object({
  restaurantId: z.string().cuid(),
  path: z.string().min(1),
  hostname: z.string().nullable().optional(),
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
      const data = pageViewSchema.parse(await c.req.json());
      await prisma.pageView.create({
        data: {
          restaurantId: data.restaurantId,
          path: data.path,
          hostname: data.hostname ?? null,
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

      const [totalViews, viewsToday, viewsThisWeek, topPaths] = await Promise.all([
        prisma.pageView.count({ where: { restaurantId } }),
        prisma.pageView.count({
          where: {
            restaurantId,
            createdAt: {
              gte: new Date(Date.now() - 24 * 60 * 60 * 1000),
            },
          },
        }),
        prisma.pageView.count({
          where: {
            restaurantId,
            createdAt: {
              gte: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000),
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
          : Promise.resolve([]),
      ]);

      return c.json({
        tier: entitlements.analyticsTier,
        totalViews,
        viewsToday,
        viewsThisWeek,
        topPaths: topPaths.map((entry) => ({
          path: entry.path,
          views: entry._count.path,
        })),
      });
    } catch (error) {
      return errorResponse(c, error);
    }
  });
