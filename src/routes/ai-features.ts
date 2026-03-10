import { Hono } from "hono";
import { z } from "zod";
import { getRestaurantEntitlements } from "@/lib/entitlements";
import { checkAiLimit, logAiUsage, getAiUsageSummary } from "@/lib/ai-usage";
import { ApiError } from "@/lib/errors";
import { errorResponse } from "@/lib/http";
import { prisma } from "@/lib/prisma";
import { requireAuth } from "@/middleware/auth";
import {
  enhanceSingleDescription,
  enhanceBulkDescriptions,
} from "@/services/description-writer";
import { suggestDietaryTags } from "@/services/dietary-tagger";
import { analyzeMenu } from "@/services/menu-analyzer";

const enhanceSchema = z.object({
  menuItemId: z.string().min(1),
  tone: z.enum(["casual", "upscale", "playful", "formal"]).optional(),
});

const bulkEnhanceSchema = z.object({
  restaurantId: z.string().min(1),
  mode: z.enum(["missing", "weak", "all"]),
  tone: z.enum(["casual", "upscale", "playful", "formal"]).optional(),
});

const acceptDescriptionsSchema = z.object({
  actions: z.array(
    z.object({
      menuItemId: z.string().min(1),
      action: z.enum(["accept", "reject"]),
      description: z.string().optional(),
    })
  ),
});

const suggestTagsSchema = z.object({
  restaurantId: z.string().min(1),
});

const setTagsSchema = z.object({
  tags: z.array(
    z.object({
      tagId: z.string().min(1),
      source: z.enum(["manual", "ai_suggested", "ai_confirmed"]).default("manual"),
      confidence: z.number().optional(),
    })
  ),
});

const confirmTagsBulkSchema = z.object({
  actions: z.array(
    z.object({
      menuItemId: z.string().min(1),
      tagId: z.string().min(1),
      action: z.enum(["confirm", "reject"]),
    })
  ),
});

const analyzeMenuSchema = z.object({
  restaurantId: z.string().min(1),
});

async function getOwnedRestaurant(restaurantId: string, clerkId: string) {
  const restaurant = await prisma.restaurant.findFirst({
    where: {
      id: restaurantId,
      owner: { clerkId },
    },
    include: { subscription: true },
  });

  if (!restaurant) {
    throw new ApiError("Restaurant not found", 404);
  }

  return restaurant;
}

export const aiFeaturesRoute = new Hono<{
  Variables: {
    auth: {
      clerkId: string;
      email: string | null;
    };
  };
}>()

  // ── Description Writer ──────────────────────────────────────────
  .post("/enhance-description", requireAuth, async (c) => {
    try {
      const auth = c.get("auth");
      const data = enhanceSchema.parse(await c.req.json());

      const item = await prisma.menuItem.findUnique({
        where: { id: data.menuItemId },
        include: {
          section: true,
          restaurant: {
            include: { owner: true, subscription: true },
          },
        },
      });

      if (!item || item.restaurant.owner.clerkId !== auth.clerkId) {
        throw new ApiError("Menu item not found", 404);
      }

      const entitlements = getRestaurantEntitlements(item.restaurant);
      const limit = await checkAiLimit(
        item.restaurantId,
        "description_enhance",
        entitlements.aiDescriptionLimit
      );

      if (!limit.allowed) {
        throw new ApiError(
          `Description enhancement limit reached (${limit.used}/${entitlements.aiDescriptionLimit} this month). Upgrade for more.`,
          403
        );
      }

      const result = await enhanceSingleDescription(
        {
          id: item.id,
          name: item.name,
          description: item.description,
          price: item.price.toString(),
          sectionName: item.section.name,
        },
        {
          name: item.restaurant.name,
          cuisineType: item.restaurant.cuisineType,
          location: item.restaurant.location,
        },
        data.tone
      );

      await logAiUsage(
        item.restaurantId,
        "description_enhance",
        result.tokensIn,
        result.tokensOut
      );

      // Store as suggestion
      await prisma.menuItem.update({
        where: { id: item.id },
        data: {
          aiDescriptionStatus: "suggested",
          originalDescription: item.description,
        },
      });

      const usage = await getAiUsageSummary(item.restaurantId, "description_enhance");

      return c.json({
        suggestion: result.description,
        originalDescription: item.description,
        usage: {
          used: usage.used,
          limit: entitlements.aiDescriptionLimit,
        },
      });
    } catch (error) {
      return errorResponse(c, error);
    }
  })

  .post("/enhance-descriptions-bulk", requireAuth, async (c) => {
    try {
      const auth = c.get("auth");
      const data = bulkEnhanceSchema.parse(await c.req.json());
      const restaurant = await getOwnedRestaurant(data.restaurantId, auth.clerkId);
      const entitlements = getRestaurantEntitlements(restaurant);

      if (!entitlements.bulkDescriptionEnabled) {
        throw new ApiError("Bulk description enhancement requires Pro plan.", 403);
      }

      const sections = await prisma.menuSection.findMany({
        where: { restaurantId: restaurant.id },
        orderBy: { displayOrder: "asc" },
        include: {
          items: { orderBy: { displayOrder: "asc" } },
        },
      });

      const items = sections.flatMap((s) =>
        s.items.map((i) => ({
          id: i.id,
          name: i.name,
          description: i.description,
          price: i.price.toString(),
          sectionName: s.name,
        }))
      );

      const result = await enhanceBulkDescriptions(
        items,
        {
          name: restaurant.name,
          cuisineType: restaurant.cuisineType,
          location: restaurant.location,
        },
        data.mode,
        data.tone
      );

      if (result.tokensIn > 0) {
        await logAiUsage(
          restaurant.id,
          "description_enhance",
          result.tokensIn,
          result.tokensOut
        );
      }

      // Mark items as having suggestions
      const itemIds = Object.keys(result.suggestions);
      if (itemIds.length) {
        // Store original descriptions
        const existingItems = await prisma.menuItem.findMany({
          where: { id: { in: itemIds } },
          select: { id: true, description: true },
        });

        for (const existing of existingItems) {
          await prisma.menuItem.update({
            where: { id: existing.id },
            data: {
              aiDescriptionStatus: "suggested",
              originalDescription: existing.description,
            },
          });
        }
      }

      return c.json({
        suggestions: result.suggestions,
        count: Object.keys(result.suggestions).length,
      });
    } catch (error) {
      return errorResponse(c, error);
    }
  })

  .post("/accept-descriptions", requireAuth, async (c) => {
    try {
      const auth = c.get("auth");
      const data = acceptDescriptionsSchema.parse(await c.req.json());

      for (const action of data.actions) {
        const item = await prisma.menuItem.findUnique({
          where: { id: action.menuItemId },
          include: {
            restaurant: { include: { owner: true } },
          },
        });

        if (!item || item.restaurant.owner.clerkId !== auth.clerkId) {
          continue;
        }

        if (action.action === "accept") {
          await prisma.menuItem.update({
            where: { id: item.id },
            data: {
              description: action.description ?? item.description,
              aiDescriptionStatus: "accepted",
            },
          });
        } else {
          // Reject: revert to original
          await prisma.menuItem.update({
            where: { id: item.id },
            data: {
              description: item.originalDescription ?? item.description,
              aiDescriptionStatus: null,
              originalDescription: null,
            },
          });
        }
      }

      return c.json({ ok: true });
    } catch (error) {
      return errorResponse(c, error);
    }
  })

  // ── Dietary Tags ────────────────────────────────────────────────
  .post("/suggest-tags", requireAuth, async (c) => {
    try {
      const auth = c.get("auth");
      const data = suggestTagsSchema.parse(await c.req.json());
      const restaurant = await getOwnedRestaurant(data.restaurantId, auth.clerkId);
      const entitlements = getRestaurantEntitlements(restaurant);

      const limit = await checkAiLimit(
        restaurant.id,
        "tag_analysis",
        entitlements.aiTagAnalysisLimit
      );

      if (!limit.allowed) {
        throw new ApiError(
          `Tag analysis limit reached (${limit.used}/${entitlements.aiTagAnalysisLimit} this month). Upgrade for more.`,
          403
        );
      }

      const sections = await prisma.menuSection.findMany({
        where: { restaurantId: restaurant.id },
        orderBy: { displayOrder: "asc" },
        include: {
          items: { orderBy: { displayOrder: "asc" } },
        },
      });

      const items = sections.flatMap((s) =>
        s.items.map((i) => ({
          id: i.id,
          name: i.name,
          description: i.description,
          sectionName: s.name,
        }))
      );

      const result = await suggestDietaryTags(
        {
          name: restaurant.name,
          cuisineType: restaurant.cuisineType,
        },
        items
      );

      await logAiUsage(
        restaurant.id,
        "tag_analysis",
        result.tokensIn,
        result.tokensOut
      );

      return c.json({
        suggestions: result.suggestions,
        usage: {
          used: limit.used + 1,
          limit: entitlements.aiTagAnalysisLimit,
        },
      });
    } catch (error) {
      return errorResponse(c, error);
    }
  })

  .post("/confirm-tags-bulk", requireAuth, async (c) => {
    try {
      const auth = c.get("auth");
      const data = confirmTagsBulkSchema.parse(await c.req.json());

      for (const action of data.actions) {
        const item = await prisma.menuItem.findUnique({
          where: { id: action.menuItemId },
          include: {
            restaurant: { include: { owner: true } },
          },
        });

        if (!item || item.restaurant.owner.clerkId !== auth.clerkId) {
          continue;
        }

        if (action.action === "confirm") {
          await prisma.menuItemDietaryTag.upsert({
            where: {
              menuItemId_tagId: {
                menuItemId: action.menuItemId,
                tagId: action.tagId,
              },
            },
            create: {
              menuItemId: action.menuItemId,
              tagId: action.tagId,
              source: "ai_confirmed",
            },
            update: {
              source: "ai_confirmed",
            },
          });
        } else {
          await prisma.menuItemDietaryTag.deleteMany({
            where: {
              menuItemId: action.menuItemId,
              tagId: action.tagId,
            },
          });
        }
      }

      return c.json({ ok: true });
    } catch (error) {
      return errorResponse(c, error);
    }
  })

  // ── Menu Analysis ───────────────────────────────────────────────
  .post("/analyze-menu", requireAuth, async (c) => {
    try {
      const auth = c.get("auth");
      const data = analyzeMenuSchema.parse(await c.req.json());
      const restaurant = await getOwnedRestaurant(data.restaurantId, auth.clerkId);
      const entitlements = getRestaurantEntitlements(restaurant);

      const limit = await checkAiLimit(
        restaurant.id,
        "menu_analysis",
        entitlements.analysisLimit
      );

      if (!limit.allowed) {
        throw new ApiError(
          `Menu analysis limit reached (${limit.used}/${entitlements.analysisLimit} this month). Upgrade for more.`,
          403
        );
      }

      const result = await analyzeMenu(
        {
          id: restaurant.id,
          name: restaurant.name,
          cuisineType: restaurant.cuisineType,
          location: restaurant.location,
        },
        entitlements.menuAnalysisLevel
      );

      if (!result.cached) {
        await logAiUsage(
          restaurant.id,
          "menu_analysis",
          result.tokensIn,
          result.tokensOut
        );
      }

      return c.json({
        analysis: result.result,
        cached: result.cached,
        usage: {
          used: result.cached ? limit.used : limit.used + 1,
          limit: entitlements.analysisLimit,
        },
        level: entitlements.menuAnalysisLevel,
      });
    } catch (error) {
      return errorResponse(c, error);
    }
  })

  .get("/analyze-menu/:restaurantId", requireAuth, async (c) => {
    try {
      const auth = c.get("auth");
      const restaurantId = c.req.param("restaurantId");
      const restaurant = await getOwnedRestaurant(restaurantId, auth.clerkId);
      const entitlements = getRestaurantEntitlements(restaurant);

      const cached = await prisma.menuAnalysis.findFirst({
        where: {
          restaurantId: restaurant.id,
          analysisType: "full",
        },
        orderBy: { createdAt: "desc" },
      });

      if (!cached) {
        return c.json({ analysis: null, level: entitlements.menuAnalysisLevel });
      }

      return c.json({
        analysis: cached.result,
        cached: true,
        createdAt: cached.createdAt,
        level: entitlements.menuAnalysisLevel,
      });
    } catch (error) {
      return errorResponse(c, error);
    }
  });
