import { createHash } from "crypto";
import { logAiUsage } from "@/lib/ai-usage";
import { prisma } from "@/lib/prisma";
import { collectCitationsData } from "./citations-collector";
import { collectGoogleMapsData, collectGoogleReviewsData } from "./google-maps-collector";
import { collectOnPageData } from "./onpage-collector";
import { collectRankGridData } from "./rank-grid-collector";
import { recommendSeoActions } from "./seo-recommender";
import { scoreSeoAnalysis } from "./seo-scorer";
import type {
  CollectorOutput,
  RestaurantSeoContext,
  SeoProgress,
  SeoProgressStatus,
  SeoProgressStep,
} from "./types";

type CollectorResult<T> = {
  data: T;
  estimatedCostUsd: number;
};

export function computeSeoInputsHash(restaurant: RestaurantSeoContext) {
  return createHash("sha256")
    .update(
      JSON.stringify({
        name: restaurant.name,
        cuisineType: restaurant.cuisineType,
        location: restaurant.location,
        address: restaurant.address,
        phone: restaurant.phone,
        website: restaurant.website,
        placeId: restaurant.gbpConnection?.placeId ?? null,
        gbpUrl: restaurant.gbpConnection?.gbpUrl ?? null,
        talabatUrl: restaurant.talabatUrl,
        deliverooUrl: restaurant.deliverooUrl,
        uberEatsUrl: restaurant.uberEatsUrl,
        careemUrl: null,
        operatingHours: restaurant.operatingHours ?? null,
      })
    )
    .digest("hex");
}

function errorMessage(error: unknown) {
  return error instanceof Error ? error.message : String(error);
}

function initialProgress(): SeoProgress {
  return {
    gbp: "queued",
    reviews: "queued",
    onPage: "queued",
    rankGrid: "queued",
    citations: "queued",
    synthesis: "queued",
  };
}

async function settleCollector<T>(
  collector: string,
  task: Promise<CollectorResult<T>>
): Promise<
  | { ok: true; collector: string; data: T; estimatedCostUsd: number }
  | { ok: false; collector: string; message: string }
> {
  try {
    const result = await task;
    return {
      ok: true,
      collector,
      data: result.data,
      estimatedCostUsd: result.estimatedCostUsd,
    };
  } catch (error) {
    return {
      ok: false,
      collector,
      message: errorMessage(error),
    };
  }
}

function get<T>(
  result:
    | { ok: true; data: T; estimatedCostUsd: number }
    | { ok: false; message: string }
): T | null {
  return result.ok ? result.data : null;
}

export async function runSeoAnalysisJob(analysisId: string) {
  const analysis = await prisma.seoAnalysis.findUnique({
    where: { id: analysisId },
    include: {
      restaurant: {
        include: {
          gbpConnection: true,
        },
      },
    },
  });

  if (!analysis) {
    throw new Error(`SEO analysis ${analysisId} not found`);
  }

  const restaurant = analysis.restaurant as RestaurantSeoContext;
  const progress: SeoProgress = initialProgress();

  async function persistProgress(updates: Partial<Record<SeoProgressStep, SeoProgressStatus>>) {
    Object.assign(progress, updates);
    await prisma.seoAnalysis.update({
      where: { id: analysisId },
      data: { progress: progress as any },
    });
  }

  // Single initial write: flip to running and seed phase-1 progress in one go.
  Object.assign(progress, { gbp: "running", reviews: "running", onPage: "running" });
  await prisma.seoAnalysis.update({
    where: { id: analysisId },
    data: {
      status: "running",
      errorMessage: null,
      progress: progress as any,
    },
  });

  try {
    const [gbpResult, reviewsResult, onPageResult] = await Promise.all([
      settleCollector("googleMaps", collectGoogleMapsData(restaurant)),
      settleCollector("reviews", collectGoogleReviewsData(restaurant)),
      settleCollector("onPage", collectOnPageData(restaurant)),
    ]);

    await persistProgress({
      gbp: gbpResult.ok ? "done" : "failed",
      reviews: reviewsResult.ok ? "done" : "failed",
      onPage: onPageResult.ok ? "done" : "failed",
      rankGrid: "running",
      citations: "running",
    });

    const gbp = get(gbpResult);
    const [rankGridResult, citationsResult] = await Promise.all([
      settleCollector("rankGrid", collectRankGridData(restaurant, gbp)),
      settleCollector("citations", collectCitationsData(restaurant, gbp)),
    ]);

    await persistProgress({
      rankGrid: rankGridResult.ok ? "done" : "failed",
      citations: citationsResult.ok ? "done" : "failed",
      synthesis: "running",
    });

    const collectorResults = [
      gbpResult,
      reviewsResult,
      onPageResult,
      rankGridResult,
      citationsResult,
    ];

    const collectorOutput: CollectorOutput = {
      gbp,
      reviews: get(reviewsResult),
      onPage: get(onPageResult),
      rankGrid: get(rankGridResult),
      citations: get(citationsResult),
      failures: collectorResults
        .filter((result) => !result.ok)
        .map((result) => ({
          collector: result.collector,
          message: result.ok ? "" : result.message,
        })),
      estimatedApifyCostUsd: collectorResults.reduce(
        (sum, result) => sum + (result.ok ? result.estimatedCostUsd : 0),
        0
      ),
    };

    const scorecard = scoreSeoAnalysis(collectorOutput);
    const recommendationResult = await recommendSeoActions({
      restaurant,
      scorecard,
      collectorOutput,
    });
    const aiCostUsd =
      recommendationResult.tokensIn * 0.000003 +
      recommendationResult.tokensOut * 0.000015;
    const totalCostUsd = collectorOutput.estimatedApifyCostUsd + aiCostUsd;

    progress.synthesis = "done";

    await prisma.seoAnalysis.update({
      where: { id: analysisId },
      data: {
        status: "succeeded",
        overallScore: scorecard.overallScore,
        gbpScore: scorecard.pillars.gbp.score,
        onPageScore: scorecard.pillars.onPage.score,
        rankGridScore: scorecard.pillars.rankGrid.score,
        citationsScore: scorecard.pillars.citations.score,
        reviewsScore: scorecard.pillars.reviews.score,
        rawData: collectorOutput as any,
        scorecard: scorecard as any,
        recommendations: recommendationResult.recommendations as any,
        progress: progress as any,
        costUsd: totalCostUsd,
        completedAt: new Date(),
      },
    });

    await logAiUsage(
      restaurant.id,
      "seo_analysis",
      recommendationResult.tokensIn,
      recommendationResult.tokensOut,
      collectorOutput.estimatedApifyCostUsd
    );
  } catch (error) {
    // Mark every step that was still running/queued as failed so the UI
    // doesn't show a permanent "in progress" spinner.
    for (const key of Object.keys(progress) as SeoProgressStep[]) {
      if (progress[key] === "running" || progress[key] === "queued") {
        progress[key] = "failed";
      }
    }
    await prisma.seoAnalysis.update({
      where: { id: analysisId },
      data: {
        status: "failed",
        errorMessage: errorMessage(error),
        progress: progress as any,
        completedAt: new Date(),
      },
    });
  }
}
