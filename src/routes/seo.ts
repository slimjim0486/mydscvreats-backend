import { Hono } from "hono";
import { z } from "zod";
import { checkAiLimit } from "@/lib/ai-usage";
import { getRestaurantEntitlements } from "@/lib/entitlements";
import { ApiError } from "@/lib/errors";
import { errorResponse } from "@/lib/http";
import { prisma } from "@/lib/prisma";
import { requireAuth } from "@/middleware/auth";
import { computeSeoAnalysisContext } from "@/services/seo/benchmark";
import {
  computeSeoInputsHash,
  runSeoAnalysisJob,
} from "@/services/seo/orchestrator";
import type { RestaurantSeoContext } from "@/services/seo/types";

const createAnalysisSchema = z.object({
  restaurantId: z.string().min(1),
  forceRefresh: z.boolean().optional().default(false),
});

async function getOwnedRestaurant(restaurantId: string, clerkId: string) {
  const restaurant = await prisma.restaurant.findFirst({
    where: {
      id: restaurantId,
      OR: [
        { owner: { clerkId } },
        { operatorAccount: { owner: { clerkId } } },
      ],
    },
    include: {
      subscription: true,
      gbpConnection: true,
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

  return restaurant;
}

function serializeAnalysis(analysis: any) {
  return {
    ...analysis,
    costUsd:
      analysis.costUsd === null || analysis.costUsd === undefined
        ? null
        : Number(analysis.costUsd),
  };
}

async function serializeAnalysisWithContext(analysis: any) {
  const context = await computeSeoAnalysisContext(
    analysis.restaurantId,
    analysis.id,
    analysis.status
  );
  return {
    ...serializeAnalysis(analysis),
    context,
  };
}

export const seoRoute = new Hono<{
  Variables: {
    auth: {
      clerkId: string;
      email: string | null;
    };
  };
}>()
  .post("/analyses", requireAuth, async (c) => {
    try {
      const auth = c.get("auth");
      const data = createAnalysisSchema.parse(await c.req.json());
      const restaurant = await getOwnedRestaurant(data.restaurantId, auth.clerkId);
      const entitlements = getRestaurantEntitlements(restaurant);
      const limit = await checkAiLimit(
        restaurant.id,
        "seo_analysis",
        entitlements.seoAnalysisLimit
      );

      if (!limit.allowed) {
        throw new ApiError(
          `SEO analysis limit reached (${limit.used}/${entitlements.seoAnalysisLimit} this month). Upgrade for more.`,
          402
        );
      }

      const inputsHash = computeSeoInputsHash(restaurant as RestaurantSeoContext);
      if (!data.forceRefresh) {
        const cached = await prisma.seoAnalysis.findFirst({
          where: {
            restaurantId: restaurant.id,
            inputsHash,
            status: "succeeded",
            createdAt: {
              gte: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000),
            },
          },
          orderBy: { createdAt: "desc" },
        });

        if (cached) {
          return c.json({
            analysisId: cached.id,
            status: cached.status,
            cached: true,
            analysis: await serializeAnalysisWithContext(cached),
          });
        }
      }

      const analysis = await prisma.seoAnalysis.create({
        data: {
          restaurantId: restaurant.id,
          status: "queued",
          inputsHash,
          rawData: {},
          scorecard: {},
          recommendations: [],
        },
      });

      void runSeoAnalysisJob(analysis.id).catch((error) => {
        console.error("SEO analysis job failed", {
          analysisId: analysis.id,
          restaurantId: restaurant.id,
          error,
        });
      });

      return c.json(
        {
          analysisId: analysis.id,
          status: analysis.status,
          cached: false,
        },
        202
      );
    } catch (error) {
      return errorResponse(c, error);
    }
  })
  .get("/analyses", requireAuth, async (c) => {
    try {
      const auth = c.get("auth");
      const restaurantId = c.req.query("restaurantId");

      if (!restaurantId) {
        throw new ApiError("restaurantId is required", 400);
      }

      await getOwnedRestaurant(restaurantId, auth.clerkId);
      const analysis = await prisma.seoAnalysis.findFirst({
        where: { restaurantId },
        orderBy: { createdAt: "desc" },
      });

      return c.json(analysis ? await serializeAnalysisWithContext(analysis) : null);
    } catch (error) {
      return errorResponse(c, error);
    }
  })
  .get("/analyses/:id", requireAuth, async (c) => {
    try {
      const auth = c.get("auth");
      const id = c.req.param("id");
      const analysis = await prisma.seoAnalysis.findFirst({
        where: {
          id,
          restaurant: {
            OR: [
              { owner: { clerkId: auth.clerkId } },
              { operatorAccount: { owner: { clerkId: auth.clerkId } } },
            ],
          },
        },
      });

      if (!analysis) {
        throw new ApiError("SEO analysis not found", 404);
      }

      return c.json(await serializeAnalysisWithContext(analysis));
    } catch (error) {
      return errorResponse(c, error);
    }
  })
  .post("/analyses/:id/recommendations/:idx/dismiss", requireAuth, async (c) => {
    try {
      const auth = c.get("auth");
      const id = c.req.param("id");
      const idx = Number(c.req.param("idx"));

      if (!Number.isInteger(idx) || idx < 0) {
        throw new ApiError("Recommendation index is invalid", 400);
      }

      const analysis = await prisma.seoAnalysis.findFirst({
        where: {
          id,
          restaurant: {
            OR: [
              { owner: { clerkId: auth.clerkId } },
              { operatorAccount: { owner: { clerkId: auth.clerkId } } },
            ],
          },
        },
      });

      if (!analysis) {
        throw new ApiError("SEO analysis not found", 404);
      }

      const recommendations = Array.isArray(analysis.recommendations)
        ? [...analysis.recommendations]
        : [];

      if (!recommendations[idx] || typeof recommendations[idx] !== "object") {
        throw new ApiError("Recommendation not found", 404);
      }

      recommendations[idx] = {
        ...(recommendations[idx] as Record<string, unknown>),
        dismissedAt: new Date().toISOString(),
      };

      const updated = await prisma.seoAnalysis.update({
        where: { id },
        data: {
          recommendations,
        },
      });

      return c.json(await serializeAnalysisWithContext(updated));
    } catch (error) {
      return errorResponse(c, error);
    }
  });
