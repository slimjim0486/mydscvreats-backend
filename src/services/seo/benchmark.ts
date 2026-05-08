import { checkAiLimit } from "@/lib/ai-usage";
import { getRestaurantEntitlements } from "@/lib/entitlements";
import { prisma } from "@/lib/prisma";

export interface SeoUsage {
  used: number;
  limit: number | null;
  resetsAt: string;
}

export interface PeerBenchmark {
  averageScore: number;
  sampleSize: number;
  cuisineType: string;
  location: string;
}

export interface SeoHistoryPoint {
  overallScore: number;
  gbpScore: number | null;
  onPageScore: number | null;
  rankGridScore: number | null;
  citationsScore: number | null;
  reviewsScore: number | null;
  createdAt: string;
}

export interface SeoPreviousScores {
  overall: number | null;
  gbp: number | null;
  onPage: number | null;
  rankGrid: number | null;
  citations: number | null;
  reviews: number | null;
  createdAt: string;
}

export interface SeoAnalysisContext {
  peerBenchmark: PeerBenchmark | null;
  history: SeoHistoryPoint[];
  previousScores: SeoPreviousScores | null;
  usage: SeoUsage | null;
}

const MIN_PEER_SAMPLE = 3;
const HISTORY_LIMIT = 7;

async function getPeerBenchmark(restaurantId: string): Promise<PeerBenchmark | null> {
  const restaurant = await prisma.restaurant.findUnique({
    where: { id: restaurantId },
    select: { cuisineType: true, location: true },
  });

  if (!restaurant?.cuisineType || !restaurant?.location) {
    return null;
  }

  const peers = await prisma.restaurant.findMany({
    where: {
      id: { not: restaurantId },
      cuisineType: restaurant.cuisineType,
      location: restaurant.location,
    },
    select: {
      seoAnalyses: {
        where: { status: "succeeded", overallScore: { not: null } },
        orderBy: { createdAt: "desc" },
        take: 1,
        select: { overallScore: true },
      },
    },
  });

  const scores = peers
    .map((peer) => peer.seoAnalyses[0]?.overallScore ?? null)
    .filter((score): score is number => score !== null);

  if (scores.length < MIN_PEER_SAMPLE) {
    return null;
  }

  const averageScore = Math.round(
    scores.reduce((sum, score) => sum + score, 0) / scores.length
  );

  return {
    averageScore,
    sampleSize: scores.length,
    cuisineType: restaurant.cuisineType,
    location: restaurant.location,
  };
}

async function getHistory(
  restaurantId: string
): Promise<SeoHistoryPoint[]> {
  // History only contains succeeded runs. The current run is included if it has
  // succeeded; otherwise it's naturally absent (status filter excludes it).
  const rows = await prisma.seoAnalysis.findMany({
    where: {
      restaurantId,
      status: "succeeded",
      overallScore: { not: null },
    },
    orderBy: { createdAt: "desc" },
    take: HISTORY_LIMIT,
    select: {
      overallScore: true,
      gbpScore: true,
      onPageScore: true,
      rankGridScore: true,
      citationsScore: true,
      reviewsScore: true,
      createdAt: true,
    },
  });

  return rows
    .reverse()
    .map((row) => ({
      overallScore: row.overallScore!,
      gbpScore: row.gbpScore,
      onPageScore: row.onPageScore,
      rankGridScore: row.rankGridScore,
      citationsScore: row.citationsScore,
      reviewsScore: row.reviewsScore,
      createdAt: row.createdAt.toISOString(),
    }));
}

function derivePreviousScores(
  history: SeoHistoryPoint[],
  currentStatus: string
): SeoPreviousScores | null {
  // If current run is succeeded, it's the last item — previous is second-to-last.
  // If current is queued/running/failed, it's not in history — previous is the last item.
  const previousIndex =
    currentStatus === "succeeded" ? history.length - 2 : history.length - 1;

  if (previousIndex < 0) return null;
  const previous = history[previousIndex];
  if (!previous) return null;

  return {
    overall: previous.overallScore,
    gbp: previous.gbpScore,
    onPage: previous.onPageScore,
    rankGrid: previous.rankGridScore,
    citations: previous.citationsScore,
    reviews: previous.reviewsScore,
    createdAt: previous.createdAt,
  };
}

async function getUsage(restaurantId: string): Promise<SeoUsage | null> {
  const restaurant = await prisma.restaurant.findUnique({
    where: { id: restaurantId },
    include: {
      subscription: true,
      operatorAccount: {
        include: {
          _count: { select: { brands: true } },
        },
      },
    },
  });

  if (!restaurant) return null;

  const entitlements = getRestaurantEntitlements(restaurant);
  const limit = entitlements.seoAnalysisLimit;
  const result = await checkAiLimit(restaurantId, "seo_analysis", limit);

  const now = new Date();
  const resetsAt = new Date(now.getFullYear(), now.getMonth() + 1, 1).toISOString();

  return {
    used: result.used,
    limit,
    resetsAt,
  };
}

export async function computeSeoAnalysisContext(
  restaurantId: string,
  _currentAnalysisId: string,
  currentStatus: string
): Promise<SeoAnalysisContext> {
  const [peerBenchmark, history, usage] = await Promise.all([
    getPeerBenchmark(restaurantId),
    getHistory(restaurantId),
    getUsage(restaurantId),
  ]);

  return {
    peerBenchmark,
    history,
    previousScores: derivePreviousScores(history, currentStatus),
    usage,
  };
}
