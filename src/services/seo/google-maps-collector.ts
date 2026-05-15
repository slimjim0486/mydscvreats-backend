import { runActor } from "@/lib/apify";
import { env } from "@/lib/env";
import { ApiError } from "@/lib/errors";
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

function firstWebsite(source: Record<string, unknown>) {
  const value = firstString(source, [
    "website",
    "websiteUrl",
    "businessWebsite",
    "domain",
  ]);
  if (!value) return null;

  try {
    const url = new URL(value.startsWith("http") ? value : `https://${value}`);
    const host = url.hostname.toLowerCase();
    if (host === "google.com" || host.endsWith(".google.com")) return null;
    if (host === "google.ae" || host.endsWith(".google.ae")) return null;
    return url.toString();
  } catch {
    return null;
  }
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

function normalize(value: string | null | undefined) {
  return (value ?? "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function looseMatch(a: string | null | undefined, b: string | null | undefined) {
  const left = normalize(a);
  const right = normalize(b);
  if (!left || !right) return false;
  return left === right || left.includes(right) || right.includes(left);
}

function buildSearchStrings(restaurant: RestaurantSeoContext) {
  return Array.from(
    new Set(
      [
        [restaurant.name, restaurant.address].filter(Boolean).join(" "),
        [restaurant.name, restaurant.location].filter(Boolean).join(" "),
        [restaurant.name, restaurant.cuisineType, restaurant.location].filter(Boolean).join(" "),
        restaurant.name,
      ]
        .map((entry) => entry.trim())
        .filter(Boolean)
    )
  );
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
  const searchStringsArray = buildSearchStrings(restaurant);

  return {
    placeIds: placeId ? [placeId] : undefined,
    searchStringsArray: placeId ? undefined : searchStringsArray,
    maxCrawledPlacesPerSearch: placeId ? 1 : 3,
    language: "en",
    maxImages: 30,
    includeOpeningHours: true,
  };
}

function buildReviewsInput(restaurant: RestaurantSeoContext) {
  const placeId = restaurant.gbpConnection?.placeId;
  const searchStringsArray = buildSearchStrings(restaurant);

  return {
    placeIds: placeId ? [placeId] : undefined,
    searchStringsArray: placeId ? undefined : searchStringsArray,
    maxReviews: 50,
    maxReviewsPerPlace: 50,
    reviewsLimit: 50,
    language: "en",
    reviewsSort: "newest",
  };
}

function scoreMapsCandidate(item: Record<string, unknown>, restaurant: RestaurantSeoContext) {
  let score = 0;
  const itemPlaceId = firstString(item, ["placeId", "place_id", "googlePlaceId"]);
  const itemName = firstString(item, ["title", "name", "placeName"]);
  const itemAddress = firstString(item, ["address", "street", "fullAddress"]);
  const itemPhone = firstString(item, ["phone", "phoneNumber", "claimThisBusinessPhone"]);
  const itemWebsite = firstWebsite(item);

  if (restaurant.gbpConnection?.placeId && itemPlaceId === restaurant.gbpConnection.placeId) score += 100;
  if (looseMatch(itemName, restaurant.name)) score += 40;
  if (looseMatch(itemAddress, restaurant.address ?? restaurant.location)) score += 25;
  if (restaurant.phone && itemPhone && itemPhone.replace(/\D/g, "").endsWith(restaurant.phone.replace(/\D/g, "").slice(-7))) score += 15;
  if (restaurant.website && itemWebsite && looseMatch(itemWebsite, restaurant.website)) score += 10;
  if (itemName) score += 5;

  return score;
}

function pickMapsItem(items: Record<string, unknown>[], restaurant: RestaurantSeoContext) {
  return [...items]
    .sort((a, b) => scoreMapsCandidate(b, restaurant) - scoreMapsCandidate(a, restaurant))[0] ?? null;
}

export async function collectGoogleMapsData(restaurant: RestaurantSeoContext) {
  const input = buildMapsInput(restaurant);
  console.info("Google Maps SEO lookup input", {
    restaurantId: restaurant.id,
    hasPlaceId: Boolean(restaurant.gbpConnection?.placeId),
    searchStringsArray: input.searchStringsArray,
    maxCrawledPlacesPerSearch: input.maxCrawledPlacesPerSearch,
  });

  const result = await runActor<Record<string, unknown>>(
    env.APIFY_ACTOR_GMAPS,
    input,
    {
      timeoutMs: 120_000,
      maxItems: input.maxCrawledPlacesPerSearch,
      maxTotalChargeUsd: 0.5,
      memoryMbytes: 4096,
    }
  );
  const item = pickMapsItem(result.items, restaurant) ?? {};
  const imageUrls = item.imageUrls ?? item.images ?? item.photos;

  const data: GbpData = {
    placeId:
      firstString(item, ["placeId", "place_id", "googlePlaceId"]) ??
      restaurant.gbpConnection?.placeId ??
      null,
    name: firstString(item, ["title", "name", "placeName"]),
    address: firstString(item, ["address", "street", "fullAddress"]),
    phone: firstString(item, ["phone", "phoneNumber", "claimThisBusinessPhone"]),
    website: firstWebsite(item),
    hours: item.openingHours ?? item.hours ?? item.openingHoursTable ?? null,
    categories: normalizeCategories(item),
    photosCount: Array.isArray(imageUrls)
      ? imageUrls.length
      : firstNumber(item, ["imagesCount", "photosCount"]) ?? 0,
    photoUrls: Array.isArray(imageUrls)
      ? imageUrls.filter((url): url is string => typeof url === "string" && Boolean(url.trim())).slice(0, 30)
      : [],
    rating: firstNumber(item, ["totalScore", "rating", "stars"]),
    reviewCount: firstNumber(item, ["reviewsCount", "reviewCount", "numberOfReviews"]),
    latitude: firstNumber(item, ["lat", "latitude"]) ?? nestedNumber(item, "location", "lat"),
    longitude: firstNumber(item, ["lng", "longitude"]) ?? nestedNumber(item, "location", "lng"),
    popularTimes: item.popularTimes ?? null,
  };

  if (!data.name && !data.address && !data.phone && !data.website) {
    throw new ApiError(
      `Google Maps actor returned ${result.items.length} item(s), but no usable listing matched "${restaurant.name}".`,
      502
    );
  }

  return {
    data,
    estimatedCostUsd: result.estimatedCostUsd,
  };
}

export async function collectGoogleReviewsData(restaurant: RestaurantSeoContext) {
  const result = await runActor<Record<string, unknown>>(
    env.APIFY_ACTOR_GMAPS_REVIEWS,
    buildReviewsInput(restaurant),
    {
      timeoutMs: 300_000,
      maxItems: 60,
      maxTotalChargeUsd: 0.5,
      memoryMbytes: 4096,
    }
  );
  const reviews = result.items
    .map(normalizeReview)
    .filter((review) => review.text || review.rating !== null)
    .slice(0, 50);
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

/**
 * Pick 1-2 short, anonymous excerpts from the reviews that triggered this
 * theme. We strip names/handles, cap at 90 chars, and prefer the shortest
 * matching sentence so the quote reads cleanly as a pull-quote.
 */
function pickThemeQuotes(reviews: string[], terms: string[]): string[] {
  const matching = reviews.filter((review) =>
    terms.some((term) => review.toLowerCase().includes(term))
  );

  const excerpts: string[] = [];
  for (const review of matching) {
    // Split into sentences and pick one that contains the keyword.
    const sentences = review
      .replace(/\s+/g, " ")
      .split(/(?<=[.!?])\s+/)
      .map((sentence) => sentence.trim())
      .filter((sentence) => sentence.length > 10 && sentence.length <= 120);
    const matched = sentences.find((sentence) =>
      terms.some((term) => sentence.toLowerCase().includes(term))
    );
    if (matched && !excerpts.includes(matched)) {
      excerpts.push(matched.length > 90 ? `${matched.slice(0, 87)}…` : matched);
    }
    if (excerpts.length >= 2) break;
  }
  return excerpts;
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
      quotes: pickThemeQuotes(reviews, definition.terms),
    }))
    .filter((entry) => entry.count > 0)
    .sort((a, b) => b.count - a.count)
    .slice(0, 5);
}
