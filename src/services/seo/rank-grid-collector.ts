import { runActor } from "@/lib/apify";
import { env } from "@/lib/env";
import type { GbpData, RankGridData, RankGridKeywordResult, RestaurantSeoContext } from "./types";

const GRID_SIZE = 3;
const GRID_SPACING_METERS = 500;
const EARTH_LAT_METERS = 111_320;

function normalize(value: string | null | undefined) {
  return (value ?? "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function inferCity(restaurant: RestaurantSeoContext) {
  const source = restaurant.location ?? restaurant.address ?? "Dubai";
  return source.split(",").map((part) => part.trim()).filter(Boolean).at(-1) ?? "Dubai";
}

function inferNeighborhood(restaurant: RestaurantSeoContext) {
  const source = restaurant.location ?? restaurant.address ?? "Dubai";
  return source.split(",").map((part) => part.trim()).filter(Boolean)[0] ?? "near me";
}

function buildKeywords(restaurant: RestaurantSeoContext) {
  const cuisine = restaurant.cuisineType?.trim() || "restaurant";
  const neighborhood = inferNeighborhood(restaurant);
  const city = inferCity(restaurant);

  return Array.from(
    new Set([
      `${cuisine} near me`,
      `${cuisine} in ${neighborhood}`,
      `best ${cuisine} ${city}`,
      `${restaurant.name} ${city}`,
      `restaurants in ${neighborhood}`,
      `best restaurants ${city}`,
    ])
  ).slice(0, 4);
}

function buildGrid(lat: number | null, lng: number | null) {
  if (lat === null || lng === null) {
    return Array.from({ length: GRID_SIZE * GRID_SIZE }, (_, index) => ({
      row: Math.floor(index / GRID_SIZE),
      col: index % GRID_SIZE,
      lat: null,
      lng: null,
    }));
  }

  const latStep = GRID_SPACING_METERS / EARTH_LAT_METERS;
  const lngStep = GRID_SPACING_METERS / (EARTH_LAT_METERS * Math.cos((lat * Math.PI) / 180));
  const center = Math.floor(GRID_SIZE / 2);

  return Array.from({ length: GRID_SIZE * GRID_SIZE }, (_, index) => {
    const row = Math.floor(index / GRID_SIZE);
    const col = index % GRID_SIZE;
    return {
      row,
      col,
      lat: lat + (row - center) * latStep,
      lng: lng + (col - center) * lngStep,
    };
  });
}

function rankFromResults(items: Record<string, unknown>[], restaurantName: string) {
  const target = normalize(restaurantName);
  const candidates = items
    .map((item) => normalize(String(item.title ?? item.name ?? item.placeName ?? "")))
    .filter(Boolean);
  const exactIndex = candidates.findIndex((candidate) => candidate === target);

  if (exactIndex >= 0) {
    return exactIndex + 1;
  }

  const fuzzyIndex = candidates.findIndex(
    (candidate) => candidate.includes(target) || target.includes(candidate)
  );

  return fuzzyIndex >= 0 ? fuzzyIndex + 1 : null;
}

export async function collectRankGridData(
  restaurant: RestaurantSeoContext,
  gbp: GbpData | null
) {
  const keywords = buildKeywords(restaurant);
  const grid = buildGrid(gbp?.latitude ?? null, gbp?.longitude ?? null);
  const primaryCells = grid.slice(0, GRID_SIZE * GRID_SIZE);
  const queryKeys = keywords.flatMap((keyword) =>
    primaryCells.map((cell) => ({
      keyword,
      cell,
      query: [
        keyword,
        cell.lat && cell.lng ? `${cell.lat.toFixed(5)},${cell.lng.toFixed(5)}` : restaurant.location ?? restaurant.address ?? "Dubai",
      ].join(" "),
    }))
  );

  const result = await runActor<Record<string, unknown>>(
    env.APIFY_ACTOR_GSEARCH,
    {
      queries: queryKeys.map((entry) => entry.query).join("\n"),
      resultsPerPage: 10,
      maxPagesPerQuery: 1,
      languageCode: "en",
      countryCode: "ae",
    },
    { timeoutMs: 300_000, estimateCostUsd: 0.12 }
  );

  const resultsByQuery = new Map<string, Record<string, unknown>[]>();
  for (const item of result.items) {
    const query = String(item.searchQuery ?? item.query ?? item.searchString ?? "");
    if (!resultsByQuery.has(query)) {
      resultsByQuery.set(query, []);
    }
    resultsByQuery.get(query)?.push(item);
  }

  const keywordResults: RankGridKeywordResult[] = keywords.map((keyword) => {
    const entries = queryKeys.filter((entry) => entry.keyword === keyword);
    const cells = entries.map((entry) => ({
      ...entry.cell,
      rank: rankFromResults(resultsByQuery.get(entry.query) ?? result.items, restaurant.name),
    }));
    const foundRanks = cells
      .map((cell) => cell.rank)
      .filter((rank): rank is number => rank !== null);

    return {
      keyword,
      averageRank: foundRanks.length
        ? foundRanks.reduce((sum, rank) => sum + rank, 0) / foundRanks.length
        : null,
      foundCells: foundRanks.length,
      cells,
    };
  });

  return {
    data: {
      keywords: keywordResults,
    } satisfies RankGridData,
    estimatedCostUsd: result.estimatedCostUsd,
  };
}
