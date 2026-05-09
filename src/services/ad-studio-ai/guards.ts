// Cost + abuse guardrails for the Ad Studio.
// Two layers: per-restaurant per-day generate cap, and a global daily USD cap.

import { ApiError } from "@/lib/errors";
import { env } from "@/lib/env";
import { prisma } from "@/lib/prisma";

/**
 * Hard-cap how many generation runs a single restaurant can request per UTC day.
 * Counts AiUsageLog rows where feature = "ad_studio_project" since UTC midnight.
 */
export async function enforceGenerateRateLimit(restaurantId: string): Promise<void> {
  const dayStart = new Date();
  dayStart.setUTCHours(0, 0, 0, 0);

  // Counts only full-project generation. Image regenerations have their own
  // pool (see enforceImageRegenRateLimit) so users aren't blocked from
  // re-shooting a single variant after spending their project quota.
  const used = await prisma.aiUsageLog.count({
    where: {
      restaurantId,
      feature: "ad_studio_project",
      createdAt: { gte: dayStart },
    },
  });

  if (used >= env.AD_STUDIO_GENERATE_PER_DAY) {
    throw new ApiError(
      `Daily Ad Studio generation limit reached (${env.AD_STUDIO_GENERATE_PER_DAY}/day). Try again tomorrow or contact support.`,
      429
    );
  }
}

/**
 * Per-restaurant export rate limit (daily + hourly burst).
 * Bundle exports are CPU/memory-intensive (sharp × 24 resizes, 50MB ZIP build).
 * Without this, a Pro user — or a compromised owner token — could pin a
 * Railway container by spamming the export endpoint.
 */
export async function enforceExportRateLimit(restaurantId: string): Promise<void> {
  const now = Date.now();
  const dayStart = new Date(now);
  dayStart.setUTCHours(0, 0, 0, 0);
  const hourAgo = new Date(now - 60 * 60 * 1000);

  const [usedToday, usedThisHour] = await Promise.all([
    prisma.adExport.count({
      where: {
        project: { restaurantId },
        createdAt: { gte: dayStart },
      },
    }),
    prisma.adExport.count({
      where: {
        project: { restaurantId },
        createdAt: { gte: hourAgo },
      },
    }),
  ]);

  if (usedThisHour >= env.AD_STUDIO_EXPORT_PER_HOUR) {
    throw new ApiError(
      `Hourly export limit reached (${env.AD_STUDIO_EXPORT_PER_HOUR}/hour). Try again in a bit.`,
      429
    );
  }
  if (usedToday >= env.AD_STUDIO_EXPORT_PER_DAY) {
    throw new ApiError(
      `Daily export limit reached (${env.AD_STUDIO_EXPORT_PER_DAY}/day). Try again tomorrow.`,
      429
    );
  }
}

/**
 * Per-restaurant rate limit for owner-reported metrics submissions.
 * Cheap to call, but at scale a scripted owner could fill the snapshot table.
 */
export async function enforceReportMetricsRateLimit(restaurantId: string): Promise<void> {
  const now = Date.now();
  const dayStart = new Date(now);
  dayStart.setUTCHours(0, 0, 0, 0);
  const hourAgo = new Date(now - 60 * 60 * 1000);

  const [usedToday, usedThisHour] = await Promise.all([
    prisma.adPerformanceSnapshot.count({
      where: {
        liveCampaign: { project: { restaurantId } },
        createdAt: { gte: dayStart },
      },
    }),
    prisma.adPerformanceSnapshot.count({
      where: {
        liveCampaign: { project: { restaurantId } },
        createdAt: { gte: hourAgo },
      },
    }),
  ]);

  // 100 snapshots/day allows weekly reporting on 14 variants × 7 days even in
  // an aggressive use case; 30/hour blocks scripted firehoses.
  if (usedThisHour >= 30) {
    throw new ApiError("Hourly metrics-report limit reached. Try again in a bit.", 429);
  }
  if (usedToday >= 100) {
    throw new ApiError("Daily metrics-report limit reached. Try again tomorrow.", 429);
  }
}

/**
 * Per-restaurant rate limit for outbound Meta Marketing API calls.
 *
 * Two reasons this matters:
 *   1. Meta will throttle (and ultimately ban) the App ID if our call
 *      pattern looks like scraping — that directly threatens Tech Provider
 *      standing. Cheaper to enforce on our side.
 *   2. Each call decrypts the long-lived token; repeated decryption multiplies
 *      side-channel exposure.
 *
 * In-memory token bucket per restaurant: 30/min, 200/day. Single-instance
 * Railway is fine; multi-instance would need Redis.
 */
const META_API_WINDOW_MS = 60_000;
const META_API_MAX_PER_MIN = 30;
const META_API_MAX_PER_DAY = 200;
const metaApiHits = new Map<string, { minuteStart: number; minuteCount: number; dayStart: number; dayCount: number }>();

export function enforceMetaApiRateLimit(restaurantId: string): void {
  const now = Date.now();
  const dayStart = new Date(now);
  dayStart.setUTCHours(0, 0, 0, 0);
  const dayStartMs = dayStart.getTime();

  let entry = metaApiHits.get(restaurantId);
  if (!entry) {
    entry = { minuteStart: now, minuteCount: 0, dayStart: dayStartMs, dayCount: 0 };
    metaApiHits.set(restaurantId, entry);
  }
  if (now - entry.minuteStart > META_API_WINDOW_MS) {
    entry.minuteStart = now;
    entry.minuteCount = 0;
  }
  if (entry.dayStart < dayStartMs) {
    entry.dayStart = dayStartMs;
    entry.dayCount = 0;
  }

  if (entry.minuteCount >= META_API_MAX_PER_MIN) {
    throw new ApiError("Too many Meta API calls — try again in a minute.", 429);
  }
  if (entry.dayCount >= META_API_MAX_PER_DAY) {
    throw new ApiError("Daily Meta API limit reached.", 429);
  }
  entry.minuteCount += 1;
  entry.dayCount += 1;
}

// Periodic cleanup so the map doesn't grow unbounded across days.
setInterval(() => {
  const now = Date.now();
  for (const [key, entry] of metaApiHits) {
    if (now - entry.minuteStart > 24 * 60 * 60 * 1000) metaApiHits.delete(key);
  }
}, 60 * 60 * 1000).unref?.();

/**
 * Per-restaurant rate limit for live-campaign link operations.
 */
export async function enforceLinkCampaignRateLimit(restaurantId: string): Promise<void> {
  const dayStart = new Date();
  dayStart.setUTCHours(0, 0, 0, 0);
  const used = await prisma.adLiveCampaign.count({
    where: { project: { restaurantId }, createdAt: { gte: dayStart } },
  });
  if (used >= 30) {
    throw new ApiError("Daily link-campaign limit reached.", 429);
  }
}

/**
 * Per-restaurant per-day cap on single-variant image regenerations.
 * Separate pool from project generation so re-shooting a variant doesn't
 * eat a user's expensive project quota.
 */
export async function enforceImageRegenRateLimit(restaurantId: string): Promise<void> {
  const dayStart = new Date();
  dayStart.setUTCHours(0, 0, 0, 0);

  const used = await prisma.aiUsageLog.count({
    where: {
      restaurantId,
      feature: "ad_studio_image",
      createdAt: { gte: dayStart },
    },
  });

  if (used >= env.AD_STUDIO_REGEN_IMAGE_PER_DAY) {
    throw new ApiError(
      `Daily image regeneration limit reached (${env.AD_STUDIO_REGEN_IMAGE_PER_DAY}/day). Approve a variant or try again tomorrow.`,
      429
    );
  }
}

/**
 * Hard-cap total USD spend across all restaurants per UTC day.
 * Returns false (do not generate) if the cap has been hit.
 */
export async function isGlobalBudgetExhausted(): Promise<boolean> {
  if (env.AD_STUDIO_GLOBAL_USD_PER_DAY <= 0) return false; // 0 = disabled

  const dayStart = new Date();
  dayStart.setUTCHours(0, 0, 0, 0);

  const aggregate = await prisma.aiUsageLog.aggregate({
    where: {
      feature: { in: ["ad_studio_project", "ad_studio_image"] },
      createdAt: { gte: dayStart },
    },
    _sum: { costUsd: true },
  });

  const spent = aggregate._sum.costUsd ?? 0;
  return spent >= env.AD_STUDIO_GLOBAL_USD_PER_DAY;
}

export async function enforceGlobalBudget(): Promise<void> {
  if (await isGlobalBudgetExhausted()) {
    throw new ApiError(
      "Ad Studio is temporarily unavailable due to a global daily cost ceiling. Please try again tomorrow.",
      503
    );
  }
}
