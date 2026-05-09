import { runActor } from "@/lib/apify";
import { env } from "@/lib/env";
import type {
  CitationPlatformResult,
  CitationsData,
  GbpData,
  RestaurantSeoContext,
} from "./types";

function text(value: unknown) {
  return typeof value === "string" && value.trim() ? value.trim() : null;
}

function normalize(value: string | null | undefined) {
  return (value ?? "")
    .toLowerCase()
    .replace(/\+971/g, "0")
    .replace(/[^a-z0-9]+/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function looseMatch(a: string | null | undefined, b: string | null | undefined) {
  const left = normalize(a);
  const right = normalize(b);
  if (!left || !right) return null;
  return left === right || left.includes(right) || right.includes(left);
}

function normalizePhone(value: string | null | undefined) {
  return (value ?? "").replace(/\D/g, "").replace(/^971/, "0");
}

function phoneMatch(a: string | null | undefined, b: string | null | undefined) {
  const left = normalizePhone(a);
  const right = normalizePhone(b);
  if (!left || !right) return null;
  return left.endsWith(right.slice(-7)) || right.endsWith(left.slice(-7));
}

function normalizePlatformItem(
  platform: CitationPlatformResult["platform"],
  url: string | null,
  item: Record<string, unknown> | null,
  restaurant: RestaurantSeoContext
): CitationPlatformResult {
  const name = text(item?.name) ?? text(item?.title) ?? text(item?.restaurantName);
  const address = text(item?.address) ?? text(item?.location) ?? text(item?.fullAddress);
  const phone = text(item?.phone) ?? text(item?.phoneNumber) ?? text(item?.telephone);
  const hours = item?.hours ?? item?.openingHours ?? null;

  return {
    platform,
    url,
    found: Boolean(item && (name || address || phone || hours)),
    name,
    address,
    phone,
    hours,
    matches: {
      name: looseMatch(name, restaurant.name),
      address: looseMatch(address, restaurant.address ?? restaurant.location),
      phone: phoneMatch(phone, restaurant.phone),
      hours: hours && restaurant.operatingHours ? true : null,
    },
  };
}

async function collectPlatform(
  platform: CitationPlatformResult["platform"],
  actorId: string | null | undefined,
  url: string | null,
  restaurant: RestaurantSeoContext
) {
  if (!actorId) {
    return {
      platform: normalizePlatformItem(platform, url, null, restaurant),
      estimatedCostUsd: 0,
    };
  }

  const result = await runActor<Record<string, unknown>>(
    actorId,
    {
      startUrls: url ? [{ url }] : undefined,
      searchStringsArray: url
        ? undefined
        : [[restaurant.name, restaurant.address ?? restaurant.location].filter(Boolean).join(" ")],
      maxItems: 1,
    },
    {
      timeoutMs: 90_000,
      estimateCostUsd: 0.06,
      maxItems: 1,
      maxTotalChargeUsd: 0.07,
      memoryMbytes: 4096,
    }
  );

  return {
    platform: normalizePlatformItem(platform, url, result.items[0] ?? null, restaurant),
    estimatedCostUsd: result.estimatedCostUsd,
  };
}

export async function collectCitationsData(
  restaurant: RestaurantSeoContext,
  gbp: GbpData | null
) {
  const google = normalizePlatformItem(
    "Google",
    restaurant.gbpConnection?.gbpUrl ?? null,
    gbp
      ? {
          name: gbp.name,
          address: gbp.address,
          phone: gbp.phone,
          hours: gbp.hours,
        }
      : null,
    restaurant
  );

  const platforms = await Promise.all([
    collectPlatform("Talabat", env.APIFY_ACTOR_TALABAT, restaurant.talabatUrl, restaurant),
    collectPlatform("Deliveroo", env.APIFY_ACTOR_DELIVEROO, restaurant.deliverooUrl, restaurant),
    collectPlatform("Careem", env.APIFY_ACTOR_CAREEM, null, restaurant),
  ]);

  return {
    data: {
      platforms: [google, ...platforms.map((entry) => entry.platform)],
    } satisfies CitationsData,
    estimatedCostUsd: platforms.reduce((sum, entry) => sum + entry.estimatedCostUsd, 0),
  };
}
