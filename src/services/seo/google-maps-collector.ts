import { runActor } from "@/lib/apify";
import { env } from "@/lib/env";
import type { GbpData, RestaurantSeoContext, ReviewData } from "./types";

function firstString(source: Record<string, unknown>, keys: string[]) {
  for (const key of keys) {
    const value = source[key];
    if (typeof value === "string" && value.trim()) {
      return value.trim();
    }
  }
  return null;
}

function firstNumber(source: Record<string, unknown>, keys: string[]) {
  for (const key of keys) {
    const value = source[key];
    if (typeof value === "number" && Number.isFinite(value)) {
      return value;
    }
    if (typeof value === "string" && value.trim() && Number.isFinite(Number(value))) {
      return Number(value);
    }
  }
  return null;
}

function nestedNumber(source: Record<string, unknown>, objectKey: string, valueKey: string) {
  const parent = source[objectKey];
  if (!parent || typeof parent !== "object") return null;
  return firstNumber(parent as Record<string, unknown>, [valueKey]);
}

function normalizeCategories(item: Record<string, unknown>) {
  const value = item.categories ?? item.categoryName ?? item.category;
  if (Array.isArray(value)) {
    return value.map((entry) => String(entry).trim()).filter(Boolean);
  }
  if (typeof value === "string") {
    return value.split(",").map((entry) => entry.trim()).filter(Boolean);
  }
  return [];
}

function normalizeReview(item: Record<string, unknown>) {
  return {
    text: firstString(item, ["text", "reviewText", "review", "content"]) ?? "",
    rating: firstNumber(item, ["stars", "rating", "reviewRating"]),
    publishedAt: firstString(item, ["publishedAtDate", "publishedAt", "date", "reviewDate"]),
    ownerResponse: firstString(item, ["responseFromOwnerText", "ownerResponse", "replyText"]),
  };
}

function buildMapsInput(restaurant: RestaurantSeoContext) {
  const placeId = restaurant.gbpConnection?.placeId;
  const search = [restaurant.name, restaurant.address ?? restaurant.location].filter(Boolean).join(" ");

  return {
    placeIds: placeId ? [placeId] : undefined,
    searchStringsArray: placeId ? undefined : [search],
    maxCrawledPlacesPerSearch: 1,
    language: "en",
    maxImages: 30,
    includeOpeningHours: true,
  };
}

function buildReviewsInput(restaurant: RestaurantSeoContext) {
  const placeId = restaurant.gbpConnection?.placeId;
  const search = [restaurant.name, restaurant.address ?? restaurant.location].filter(Boolean).join(" ");

  return {
    placeIds: placeId ? [placeId] : undefined,
    searchStringsArray: placeId ? undefined : [search],
    maxReviews: 100,
    language: "en",
    reviewsSort: "newest",
  };
}

export async function collectGoogleMapsData(restaurant: RestaurantSeoContext) {
  const result = await runActor<Record<string, unknown>>(
    env.APIFY_ACTOR_GMAPS,
    buildMapsInput(restaurant),
    { timeoutMs: 120_000 }
  );
  const item = result.items[0] ?? {};
  const imageUrls = item.imageUrls ?? item.images ?? item.photos;

  const data: GbpData = {
    placeId:
      firstString(item, ["placeId", "place_id", "googlePlaceId"]) ??
      restaurant.gbpConnection?.placeId ??
      null,
    name: firstString(item, ["title", "name", "placeName"]),
    address: firstString(item, ["address", "street", "fullAddress"]),
    phone: firstString(item, ["phone", "phoneNumber", "claimThisBusinessPhone"]),
    website: firstString(item, ["website", "url", "websiteUrl"]),
    hours: item.openingHours ?? item.hours ?? item.openingHoursTable ?? null,
    categories: normalizeCategories(item),
    photosCount: Array.isArray(imageUrls)
      ? imageUrls.length
      : firstNumber(item, ["imagesCount", "photosCount"]) ?? 0,
    rating: firstNumber(item, ["totalScore", "rating", "stars"]),
    reviewCount: firstNumber(item, ["reviewsCount", "reviewCount", "numberOfReviews"]),
    latitude: firstNumber(item, ["lat", "latitude"]) ?? nestedNumber(item, "location", "lat"),
    longitude: firstNumber(item, ["lng", "longitude"]) ?? nestedNumber(item, "location", "lng"),
    popularTimes: item.popularTimes ?? null,
  };

  return {
    data,
    estimatedCostUsd: result.estimatedCostUsd,
  };
}

export async function collectGoogleReviewsData(restaurant: RestaurantSeoContext) {
  const result = await runActor<Record<string, unknown>>(
    env.APIFY_ACTOR_GMAPS_REVIEWS,
    buildReviewsInput(restaurant),
    { timeoutMs: 120_000 }
  );
  const reviews = result.items
    .map(normalizeReview)
    .filter((review) => review.text || review.rating !== null);
  const reviewsWithRating = reviews.filter((review) => review.rating !== null);
  const reviewsWithOwnerResponse = reviews.filter((review) => review.ownerResponse);
  const averageRating = reviewsWithRating.length
    ? reviewsWithRating.reduce((sum, review) => sum + (review.rating ?? 0), 0) / reviewsWithRating.length
    : null;

  const themes = buildReviewThemes(reviews.map((review) => review.text));

  const data: ReviewData = {
    reviews,
    averageRating,
    responseRate: reviews.length ? reviewsWithOwnerResponse.length / reviews.length : null,
    themes,
  };

  return {
    data,
    estimatedCostUsd: result.estimatedCostUsd,
  };
}

function buildReviewThemes(reviews: string[]): ReviewData["themes"] {
  const themeDefinitions = [
    { theme: "Food quality", terms: ["food", "taste", "delicious", "fresh", "flavor"], sentiment: "positive" as const },
    { theme: "Service", terms: ["service", "staff", "friendly", "waiter", "team"], sentiment: "positive" as const },
    { theme: "Delivery", terms: ["delivery", "late", "driver", "cold"], sentiment: "mixed" as const },
    { theme: "Value", terms: ["price", "expensive", "value", "portion"], sentiment: "mixed" as const },
    { theme: "Ambience", terms: ["ambience", "atmosphere", "place", "decor"], sentiment: "positive" as const },
  ];

  const lowerReviews = reviews.map((review) => review.toLowerCase());
  return themeDefinitions
    .map((definition) => ({
      theme: definition.theme,
      count: lowerReviews.filter((review) =>
        definition.terms.some((term) => review.includes(term))
      ).length,
      sentiment: definition.sentiment,
    }))
    .filter((entry) => entry.count > 0)
    .sort((a, b) => b.count - a.count)
    .slice(0, 5);
}
