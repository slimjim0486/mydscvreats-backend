import { runActor } from "@/lib/apify";
import { env } from "@/lib/env";
import type { GbpData, RankGridData, RankGridKeywordResult, RestaurantSeoContext } from "./types";

const GRID_SIZE = 3;
const GRID_SPACING_METERS = 500;
const EARTH_LAT_METERS = 111_320;
const RESULT_ARRAY_KEYS = [
  "localResults",
  "localPackResults",
  "places",
  "placeResults",
  "mapsResults",
  "organicResults",
  "results",
] as const;
const TITLE_KEYS = [
  "title",
  "name",
  "placeName",
  "businessName",
  "displayName",
  "siteName",
] as const;
const RANK_KEYS = ["position", "rank", "index"] as const;
const NAME_STOP_WORDS = new Set([
  "abu",
  "and",
  "best",
  "cafe",
  "dhabi",
  "dubai",
  "in",
  "me",
  "near",
  "restaurant",
  "restaurants",
  "the",
  "uae",
]);

function normalize(value: string | null | undefined) {
  return (value ?? "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function asRecord(value: unknown): Record<string, unknown> | null {
  return value && typeof value === "object" && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : null;
}

function asString(value: unknown) {
  return typeof value === "string" && value.trim() ? value.trim() : null;
}

function firstString(source: Record<string, unknown>, keys: readonly string[]) {
  for (const key of keys) {
    const value = asString(source[key]);
    if (value) return value;
  }
  return null;
}

function firstNumber(source: Record<string, unknown>, keys: readonly string[]) {
  for (const key of keys) {
    const value = source[key];
    if (typeof value === "number" && Number.isFinite(value)) return value;
    if (typeof value === "string" && Number.isFinite(Number(value))) return Number(value);
  }
  return null;
}

interface SearchCandidate {
  title: string;
  rank: number;
}

function candidateFromRecord(record: Record<string, unknown>, fallbackRank: number) {
  const title = firstString(record, TITLE_KEYS);
  if (!title) return null;
  return {
    title,
    rank: firstNumber(record, RANK_KEYS) ?? fallbackRank,
  } satisfies SearchCandidate;
}

function candidatesFromItem(item: Record<string, unknown>) {
  const candidates: SearchCandidate[] = [];
  const direct = candidateFromRecord(item, candidates.length + 1);
  if (direct) candidates.push(direct);

  for (const key of RESULT_ARRAY_KEYS) {
    const value = item[key];
    if (!Array.isArray(value)) continue;
    value.forEach((entry, index) => {
      const record = asRecord(entry);
      if (!record) return;
      const candidate = candidateFromRecord(record, index + 1);
      if (candidate) candidates.push(candidate);
    });
  }

  return candidates;
}

function nameTokens(value: string) {
  return normalize(value)
    .split(" ")
    .filter((token) => token.length > 1 && !NAME_STOP_WORDS.has(token));
}

function candidateMatches(candidateTitle: string, restaurantName: string) {
  const candidate = normalize(candidateTitle);
  const target = normalize(restaurantName);
  if (!candidate || !target) return false;
  if (candidate === target || candidate.includes(target) || target.includes(candidate)) {
    return true;
  }

  const targetTokens = nameTokens(restaurantName);
  if (targetTokens.length === 0) return false;
  const candidateTokens = new Set(nameTokens(candidateTitle));
  const matches = targetTokens.filter((token) => candidateTokens.has(token)).length;
  return matches >= Math.max(2, Math.ceil(targetTokens.length * 0.75));
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
  const candidates = items.flatMap((item, index) => {
    const direct = candidateFromRecord(item, index + 1);
    return [
      ...(direct ? [direct] : []),
      ...candidatesFromItem(item).filter((candidate) => candidate.title !== direct?.title),
    ];
  });
  const match = candidates.find((candidate) =>
    candidateMatches(candidate.title, restaurantName)
  );

  return match?.rank ?? null;
}

async function mapWithConcurrency<T, R>(
  items: T[],
  concurrency: number,
  mapper: (item: T) => Promise<R>
) {
  const results = new Array<R>(items.length);
  let nextIndex = 0;

  async function worker() {
    while (nextIndex < items.length) {
      const currentIndex = nextIndex;
      nextIndex += 1;
      results[currentIndex] = await mapper(items[currentIndex]);
    }
  }

  await Promise.all(
    Array.from({ length: Math.min(concurrency, items.length) }, () => worker())
  );
  return results;
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
      locationQuery:
        cell.lat && cell.lng
          ? `${cell.lat.toFixed(5)},${cell.lng.toFixed(5)}`
          : restaurant.location ?? restaurant.address ?? "Dubai",
    }))
  );

  const cellResults = await mapWithConcurrency(queryKeys, 4, async (entry) => {
    const result = await runActor<Record<string, unknown>>(
      env.APIFY_ACTOR_GMAPS,
      {
        searchStringsArray: [entry.keyword],
        locationQuery: entry.locationQuery,
        maxCrawledPlacesPerSearch: 10,
        language: "en",
        maxImages: 0,
        includeOpeningHours: false,
        scrapeSocialMediaProfiles: {
          facebooks: false,
          instagrams: false,
          youtubes: false,
          tiktoks: false,
          twitters: false,
        },
        maximumLeadsEnrichmentRecords: 0,
      },
      {
        timeoutMs: 120_000,
        estimateCostUsd: 0.03,
        maxItems: 10,
        maxTotalChargeUsd: 0.5,
        memoryMbytes: 4096,
      }
    );

    return {
      ...entry,
      rank: rankFromResults(result.items, restaurant.name),
      estimatedCostUsd: result.estimatedCostUsd,
    };
  });

  const keywordResults: RankGridKeywordResult[] = keywords.map((keyword) => {
    const entries = cellResults.filter((entry) => entry.keyword === keyword);
    const cells = entries.map((entry) => ({
      ...entry.cell,
      rank: entry.rank,
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
    estimatedCostUsd: cellResults.reduce((sum, entry) => sum + entry.estimatedCostUsd, 0),
  };
}
