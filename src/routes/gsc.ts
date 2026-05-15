// Phase 3.1: Read-only API for the GSC dashboard.
// All data comes from the GscSnapshot table (populated by the daily sync cron).
// We never hit the live GSC API on user-facing requests.

import { Hono } from "hono";
import { getRestaurantEntitlements } from "@/lib/entitlements";
import { ApiError } from "@/lib/errors";
import { errorResponse } from "@/lib/http";
import { prisma } from "@/lib/prisma";
import { requireAuth } from "@/middleware/auth";

export const gscRoute = new Hono<{
  Variables: {
    auth: {
      clerkId: string;
      email: string | null;
    };
  };
}>().get("/:restaurantId/summary", requireAuth, async (c) => {
  try {
    const auth = c.get("auth");
    const restaurantId = c.req.param("restaurantId");
    const daysParam = c.req.query("days");
    const days = Math.max(1, Math.min(90, Number.parseInt(daysParam ?? "28", 10) || 28));

    const restaurant = await prisma.restaurant.findFirst({
      where: { id: restaurantId, owner: { clerkId: auth.clerkId } },
      include: { subscription: true, operatorAccount: true },
    });

    if (!restaurant) {
      throw new ApiError("Restaurant not found", 404);
    }

    const entitlements = getRestaurantEntitlements(restaurant);
    if (!entitlements.gscDashboardEnabled) {
      return c.json({
        gated: true,
        plan: entitlements.plan,
        message: "Upgrade to Pro to see Google Search Console data.",
      });
    }

    // Two windows: current N days and the prior N days (for delta).
    const now = new Date();
    const startCurrent = new Date(now);
    startCurrent.setUTCDate(startCurrent.getUTCDate() - days);
    const startPrior = new Date(startCurrent);
    startPrior.setUTCDate(startPrior.getUTCDate() - days);

    const [currentRows, priorRows, freshness] = await Promise.all([
      prisma.gscSnapshot.findMany({
        where: { restaurantId, date: { gte: startCurrent, lt: now } },
        orderBy: { date: "asc" },
        select: {
          date: true,
          impressions: true,
          clicks: true,
          ctr: true,
          position: true,
          topQueries: true,
        },
      }),
      prisma.gscSnapshot.findMany({
        where: { restaurantId, date: { gte: startPrior, lt: startCurrent } },
        select: { impressions: true, clicks: true, ctr: true, position: true },
      }),
      // Latest sync timestamp across ALL snapshots for this restaurant (not
      // just the window). Tells the UI when GSC last wrote to us — surfaces
      // silent staleness if the cron has been failing.
      prisma.gscSnapshot.findFirst({
        where: { restaurantId },
        orderBy: { createdAt: "desc" },
        select: { createdAt: true },
      }),
    ]);

    const sumImpressions = (rows: Array<{ impressions: number }>) =>
      rows.reduce((s, r) => s + r.impressions, 0);
    const sumClicks = (rows: Array<{ clicks: number }>) =>
      rows.reduce((s, r) => s + r.clicks, 0);
    const avgPosition = (rows: Array<{ position: unknown; impressions: number }>) => {
      const weighted = rows.reduce(
        (acc, r) => {
          const pos = Number(r.position);
          if (!Number.isFinite(pos) || r.impressions === 0) return acc;
          acc.posSum += pos * r.impressions;
          acc.imp += r.impressions;
          return acc;
        },
        { posSum: 0, imp: 0 }
      );
      return weighted.imp > 0 ? weighted.posSum / weighted.imp : null;
    };

    const currentImpressions = sumImpressions(currentRows);
    const currentClicks = sumClicks(currentRows);
    const priorImpressions = sumImpressions(priorRows);
    const priorClicks = sumClicks(priorRows);

    // Latest snapshot's topQueries
    const latest = currentRows.length > 0 ? currentRows[currentRows.length - 1] : null;
    const topQueries = Array.isArray(latest?.topQueries) ? latest.topQueries : [];

    return c.json({
      gated: false,
      plan: entitlements.plan,
      days,
      lastSyncedAt: freshness?.createdAt?.toISOString() ?? null,
      totals: {
        impressions: currentImpressions,
        clicks: currentClicks,
        ctr: currentImpressions > 0 ? currentClicks / currentImpressions : 0,
        position: avgPosition(currentRows),
      },
      priorTotals: {
        impressions: priorImpressions,
        clicks: priorClicks,
        ctr: priorImpressions > 0 ? priorClicks / priorImpressions : 0,
        position: avgPosition(priorRows),
      },
      byDay: currentRows.map((row) => ({
        date: row.date.toISOString().slice(0, 10),
        impressions: row.impressions,
        clicks: row.clicks,
      })),
      topQueries,
    });
  } catch (error) {
    return errorResponse(c, error);
  }
});
