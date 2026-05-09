import { runActor } from "@/lib/apify";
import { env } from "@/lib/env";
import type { OnPageData, RestaurantSeoContext } from "./types";

function asString(value: unknown) {
  return typeof value === "string" && value.trim() ? value.trim() : null;
}

function asNumber(value: unknown) {
  if (typeof value === "number" && Number.isFinite(value)) return value;
  if (typeof value === "string" && Number.isFinite(Number(value))) return Number(value);
  return null;
}

function extractSchemaTypes(items: Record<string, unknown>[]) {
  const types = new Set<string>();
  const visit = (value: unknown) => {
    if (!value || typeof value !== "object") return;
    if (Array.isArray(value)) {
      value.forEach(visit);
      return;
    }
    const record = value as Record<string, unknown>;
    const type = record["@type"] ?? record.type;
    if (Array.isArray(type)) {
      type.map(String).forEach((entry) => types.add(entry));
    } else if (typeof type === "string") {
      types.add(type);
    }
    Object.values(record).forEach(visit);
  };

  for (const item of items) {
    visit(item.jsonLd ?? item.jsonld ?? item.structuredData ?? item.schemaOrg);
  }

  return Array.from(types).sort();
}

function countMissingAlt(items: Record<string, unknown>[]) {
  return items.reduce((count, item) => {
    const images = item.images ?? item.imageUrls;
    if (!Array.isArray(images)) return count;
    return (
      count +
      images.filter((image) => {
        if (typeof image === "string") return false;
        if (!image || typeof image !== "object") return false;
        const alt = (image as Record<string, unknown>).alt;
        return typeof alt !== "string" || !alt.trim();
      }).length
    );
  }, 0);
}

export async function collectOnPageData(restaurant: RestaurantSeoContext) {
  if (!restaurant.website) {
    return {
      data: {
        url: null,
        title: null,
        metaDescription: null,
        schemaTypes: [],
        hasRestaurantSchema: false,
        lcpEstimateMs: null,
        mobileFriendly: null,
        missingImageAltCount: 0,
        pageCount: 0,
      } satisfies OnPageData,
      estimatedCostUsd: 0,
    };
  }

  const result = await runActor<Record<string, unknown>>(
    env.APIFY_ACTOR_WEB,
    {
      startUrls: [{ url: restaurant.website }],
      maxCrawlPages: 8,
      maxCrawlDepth: 1,
      saveHtml: false,
      saveMarkdown: false,
    },
    {
      timeoutMs: 120_000,
      maxItems: 8,
      maxTotalChargeUsd: 0.5,
    }
  );

  const homepage = result.items.find((item) => asString(item.url) === restaurant.website) ?? result.items[0] ?? {};
  const schemaTypes = extractSchemaTypes(result.items);
  const lcpEstimateMs =
    asNumber(homepage.lcp) ??
    asNumber(homepage.largestContentfulPaint) ??
    asNumber(homepage.performanceLcp) ??
    null;
  const mobileFriendlyValue = homepage.mobileFriendly ?? homepage.isMobileFriendly;

  const data: OnPageData = {
    url: restaurant.website,
    title: asString(homepage.title) ?? asString(homepage.pageTitle),
    metaDescription:
      asString(homepage.description) ??
      asString(homepage.metaDescription) ??
      asString(homepage["meta.description"]),
    schemaTypes,
    hasRestaurantSchema: schemaTypes.some((type) =>
      ["restaurant", "foodestablishment", "localbusiness"].includes(type.toLowerCase())
    ),
    lcpEstimateMs,
    mobileFriendly:
      typeof mobileFriendlyValue === "boolean" ? mobileFriendlyValue : null,
    missingImageAltCount: countMissingAlt(result.items),
    pageCount: result.items.length,
  };

  return {
    data,
    estimatedCostUsd: result.estimatedCostUsd,
  };
}
