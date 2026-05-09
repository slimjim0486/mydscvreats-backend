// Meta Insights → Bustan AdPerformanceSnapshot sync.
//
// Maps Meta's per-ad insight rows back to Bustan creatives via the
// `externalAdIds[]` list captured at link-time. If externalAdIds is empty,
// we fall back to a campaign-level aggregate snapshot (creativeId=null).

import { Prisma } from "@prisma/client";
import { ApiError } from "@/lib/errors";
import { prisma } from "@/lib/prisma";
import { decryptMetaAdsToken } from "./crypto";
import { getCampaignAdInsights, type MetaInsightsRow } from "./client";

interface SyncResult {
  liveCampaignId: string;
  snapshotsWritten: number;
  perAdRowsReceived: number;
  reportedAt: Date;
}

/**
 * Pull latest insights for one live campaign and persist snapshots.
 *
 * Tolerates partial token failures: if Meta returns 401/403, we mark the
 * integration `expired` and the live campaign records `lastSyncError` for
 * the UI to surface.
 */
export async function syncLiveCampaignFromMeta(liveCampaignId: string): Promise<SyncResult> {
  const live = await prisma.adLiveCampaign.findUnique({
    where: { id: liveCampaignId },
    include: {
      metaIntegration: true,
      project: { select: { id: true, restaurantId: true, creatives: { select: { id: true } } } },
    },
  });
  if (!live) throw new ApiError("Live campaign not found", 404);
  if (!live.metaIntegration || live.metaIntegration.status !== "connected") {
    throw new ApiError("Meta integration is not connected for this campaign.", 409);
  }
  if (!live.metaIntegration.accessTokenCipher) {
    throw new ApiError("Meta integration has no stored token.", 409);
  }

  const accessToken = decryptMetaAdsToken(live.metaIntegration.accessTokenCipher);
  let insightRows: MetaInsightsRow[];
  try {
    insightRows = await getCampaignAdInsights({
      accessToken,
      campaignId: live.externalCampaignId,
      datePreset: "lifetime",
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown Meta API error";
    // Surface to live campaign + integration so UI can prompt reconnect.
    await prisma.$transaction([
      prisma.adLiveCampaign.update({
        where: { id: live.id },
        data: { lastSyncError: message.slice(0, 500) },
      }),
      prisma.metaAdsIntegration.update({
        where: { id: live.metaIntegration.id },
        data: {
          lastError: message.slice(0, 500),
          // Heuristic: 401/403 in the message → reconsent flow needed.
          status: /401|403|expired|invalid/i.test(message) ? "needs_reconsent" : live.metaIntegration.status,
        },
      }),
    ]);
    throw error;
  }

  const reportedAt = new Date();
  const projectCreativeIds = new Set(live.project.creatives.map((c) => c.id));
  const externalAdToCreativeId = mapExternalAdsToCreatives(live.externalAdIds, live.project.creatives.map((c) => c.id));

  const rows = buildSnapshotRows({
    liveCampaignId: live.id,
    insightRows,
    externalAdToCreativeId,
    projectCreativeIds,
    reportedAt,
  });

  if (rows.length === 0) {
    // No mappable rows. Still update the lastSyncedAt so we don't hammer the API.
    await prisma.metaAdsIntegration.update({
      where: { id: live.metaIntegration.id },
      data: { lastSyncedAt: reportedAt, lastError: null },
    });
    await prisma.adLiveCampaign.update({
      where: { id: live.id },
      data: { lastSyncedAt: reportedAt, lastSyncError: null },
    });
    return { liveCampaignId: live.id, snapshotsWritten: 0, perAdRowsReceived: insightRows.length, reportedAt };
  }

  await prisma.$transaction(async (tx) => {
    await tx.adPerformanceSnapshot.createMany({ data: rows });
    await tx.adLiveCampaign.update({
      where: { id: live.id },
      data: {
        lastSyncedAt: reportedAt,
        lastSyncError: null,
        status: "reporting",
      },
    });
    await tx.metaAdsIntegration.update({
      where: { id: live.metaIntegration!.id },
      data: { lastSyncedAt: reportedAt, lastError: null },
    });
  });

  return {
    liveCampaignId: live.id,
    snapshotsWritten: rows.length,
    perAdRowsReceived: insightRows.length,
    reportedAt,
  };
}

/**
 * Build the externalAdId → creativeId map. Bustan stores externalAdIds[] in
 * the same order the owner reported them at link time; if the array length
 * matches the project's creative count, we positionally pair them. Otherwise
 * we fall back to creativeId=null (campaign-level aggregate).
 */
function mapExternalAdsToCreatives(externalAdIds: string[], creativeIds: string[]): Map<string, string | null> {
  const map = new Map<string, string | null>();
  if (externalAdIds.length === 0) return map;
  if (externalAdIds.length === creativeIds.length) {
    for (let i = 0; i < externalAdIds.length; i++) {
      map.set(externalAdIds[i]!, creativeIds[i]!);
    }
  } else {
    for (const id of externalAdIds) map.set(id, null);
  }
  return map;
}

function buildSnapshotRows(args: {
  liveCampaignId: string;
  insightRows: MetaInsightsRow[];
  externalAdToCreativeId: Map<string, string | null>;
  projectCreativeIds: Set<string>;
  reportedAt: Date;
}): Prisma.AdPerformanceSnapshotCreateManyInput[] {
  const rows: Prisma.AdPerformanceSnapshotCreateManyInput[] = [];
  for (const r of args.insightRows) {
    const adId = r.ad_id ?? "";
    const creativeId = adId ? args.externalAdToCreativeId.get(adId) ?? null : null;
    // Cross-tenant safety: if we end up with a creativeId that ISN'T in this
    // project's creatives, force null instead of writing the wrong row.
    const safeCreativeId = creativeId && args.projectCreativeIds.has(creativeId) ? creativeId : null;

    const spend = parseFloat(r.spend ?? "0") || 0;
    const impressions = parseInt(r.impressions ?? "0", 10) || 0;
    const reach = r.reach ? parseInt(r.reach, 10) : null;
    const clicks = parseInt(r.inline_link_clicks ?? r.clicks ?? "0", 10) || 0;
    const frequency = r.frequency ? parseFloat(r.frequency) : null;

    // Conversion totals: prefer "purchase" / "lead" / "complete_registration".
    const conversionsActions = (r.actions ?? []).filter((a) =>
      ["purchase", "lead", "complete_registration", "schedule", "submit_application"].includes(
        a.action_type
      )
    );
    const conversions = conversionsActions.reduce((sum, a) => sum + (parseInt(a.value, 10) || 0), 0);

    const revenueActions = (r.action_values ?? []).filter((a) =>
      ["purchase", "omni_purchase"].includes(a.action_type)
    );
    const revenue = revenueActions.reduce((sum, a) => sum + (parseFloat(a.value) || 0), 0) || null;

    const ctrPct = impressions > 0 ? (clicks / impressions) * 100 : null;
    const cpmAed = impressions > 0 ? (spend / impressions) * 1000 : null;
    const cpcAed = clicks > 0 ? spend / clicks : null;
    const cpaAed = conversions > 0 ? spend / conversions : null;

    // daysLive — derive from date_start/date_stop when available; default to 1.
    const daysLive =
      r.date_start && r.date_stop
        ? Math.max(
            1,
            Math.ceil(
              (new Date(r.date_stop).getTime() - new Date(r.date_start).getTime()) /
                (1000 * 60 * 60 * 24)
            ) + 1
          )
        : 1;

    // Stable allowlisted extra fields only (per Phase 2B M5 fix).
    const extra: Record<string, unknown> = {};
    if (r.adset_id) extra.adset_id = r.adset_id;
    if (r.campaign_id) extra.campaign_id = r.campaign_id;
    if (r.date_start && r.date_stop) {
      extra.window = { from: r.date_start, to: r.date_stop };
    }

    rows.push({
      liveCampaignId: args.liveCampaignId,
      creativeId: safeCreativeId,
      variant: null,
      source: "meta_api",
      reportedAt: args.reportedAt,
      daysLive,
      spendAed: new Prisma.Decimal(spend.toFixed(2)),
      impressions,
      reach,
      clicks,
      conversions,
      revenueAed: revenue != null ? new Prisma.Decimal(revenue.toFixed(2)) : null,
      ctrPct: ctrPct != null ? new Prisma.Decimal(ctrPct.toFixed(3)) : null,
      cpmAed: cpmAed != null ? new Prisma.Decimal(cpmAed.toFixed(2)) : null,
      cpcAed: cpcAed != null ? new Prisma.Decimal(cpcAed.toFixed(2)) : null,
      cpaAed: cpaAed != null ? new Prisma.Decimal(cpaAed.toFixed(2)) : null,
      frequency: frequency != null ? new Prisma.Decimal(frequency.toFixed(2)) : null,
      dailyBudgetAed: null, // Insights API doesn't return budget; pulled separately if needed
      extraJson: extra as Prisma.InputJsonValue,
    });
  }
  return rows;
}
