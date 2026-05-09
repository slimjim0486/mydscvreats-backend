import { runActor } from "@/lib/apify";
import { env } from "@/lib/env";
import type {
  AuditRestaurantContext,
  PeerBenchmarkData,
  PeerBenchmarkPlace,
} from "./types";

function firstString(source: Record<string, unknown>, keys: string[]) {
  for (const key of keys) {
    const value = source[key];
    if (typeof value === "string" && value.trim()) return value.trim();
  }
  return null;
}

function firstNumber(source: Record<string, unknown>, keys: string[]) {
  for (const key of keys) {
    const value = source[key];
    if (typeof value === "number" && Number.isFinite(value)) return value;
    if (typeof value === "string" && Number.isFinite(Number(value))) return Number(value);
  }
  return null;
}

function median(values: number[]) {
  if (!values.length) return null;
  const sorted = [...values].sort((a, b) => a - b);
  const middle = Math.floor(sorted.length / 2);
  return sorted.length % 2
    ? sorted[middle]
    : (sorted[middle - 1] + sorted[middle]) / 2;
}

function normalizePlace(item: Record<string, unknown>): PeerBenchmarkPlace {
  return {
    name: firstString(item, ["title", "name", "placeName"]),
    rating: firstNumber(item, ["totalScore", "rating", "stars"]),
    reviewCount: firstNumber(item, ["reviewsCount", "reviewCount", "numberOfReviews"]),
    address: firstString(item, ["address", "street", "fullAddress"]),
  };
}

export async function collectPeerBenchmarkData(
  restaurant: AuditRestaurantContext,
  cuisineHint: string | null | undefined
): Promise<{ data: PeerBenchmarkData; estimatedCostUsd: number }> {
  const cuisine = cuisineHint || restaurant.cuisineType || "restaurant";
  const result = await runActor<Record<string, unknown>>(
    env.APIFY_ACTOR_GMAPS,
    {
      searchStringsArray: [`${cuisine} near ${restaurant.location}`],
      maxCrawledPlacesPerSearch: 3,
      language: "en",
      includeOpeningHours: false,
      maxImages: 0,
    },
    {
      timeoutMs: 120_000,
      estimateCostUsd: 0.08,
      maxItems: 3,
      maxTotalChargeUsd: 0.1,
      memoryMbytes: 4096,
    }
  );

  const peers = result.items.map(normalizePlace).filter((peer) => peer.name);
  const ratings = peers
    .map((peer) => peer.rating)
    .filter((value): value is number => value !== null);
  const reviewCounts = peers
    .map((peer) => peer.reviewCount)
    .filter((value): value is number => value !== null);

  return {
    data: {
      cuisine,
      location: restaurant.location,
      medianRating: median(ratings),
      medianReviewCount: median(reviewCounts),
      peers,
    },
    estimatedCostUsd: result.estimatedCostUsd,
  };
}
