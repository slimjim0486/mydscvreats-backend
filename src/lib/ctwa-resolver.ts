/**
 * P1 — Resolves a Meta CTWA `source_id` (a platform-side ad ID) to the
 * Bustan AdProject (and, if mapped, the specific AdCreative variant) that
 * launched it. Tenant-isolated by restaurantId.
 *
 * Two-stage lookup:
 *  1. AdLiveCampaignAdMapping (per-ad → variant), inserted when the owner
 *     links a Meta campaign with structured ad mappings. Strongest signal:
 *     gives us project + creative.
 *  2. Fallback: legacy AdLiveCampaign.externalAdIds[] (flat array, no
 *     creative mapping). Project-only attribution.
 *
 * Both lookups verify the project belongs to the calling restaurant —
 * Meta ad IDs are globally unique across Meta's universe but our DB
 * could in theory contain mappings written under a different restaurant
 * if data ever leaks across tenants. Defence in depth.
 */

import type { Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";

export type ResolvedReferral = {
  projectId: string | null;
  creativeId: string | null;
};

type Tx = Prisma.TransactionClient | typeof prisma;

const PLATFORM = "meta";

export async function resolveAdProjectByMetaAdId(
  tx: Tx,
  restaurantId: string,
  sourceId: string | null
): Promise<ResolvedReferral> {
  if (!sourceId) {
    return { projectId: null, creativeId: null };
  }

  // 1. Structured mapping → both project and creative.
  const mapping = await tx.adLiveCampaignAdMapping.findUnique({
    where: {
      platform_externalAdId: {
        platform: PLATFORM,
        externalAdId: sourceId,
      },
    },
    select: {
      creativeId: true,
      liveCampaign: {
        select: {
          projectId: true,
          project: { select: { restaurantId: true } },
        },
      },
    },
  });

  if (mapping && mapping.liveCampaign.project.restaurantId === restaurantId) {
    return {
      projectId: mapping.liveCampaign.projectId,
      creativeId: mapping.creativeId ?? null,
    };
  }

  // 2. Legacy fallback: flat externalAdIds array on AdLiveCampaign. The
  //    GIN index added in the P1 migration makes `has` an index lookup.
  const live = await tx.adLiveCampaign.findFirst({
    where: {
      platform: PLATFORM,
      externalAdIds: { has: sourceId },
      project: { restaurantId },
    },
    select: { projectId: true },
  });

  if (live) {
    return { projectId: live.projectId, creativeId: null };
  }

  return { projectId: null, creativeId: null };
}
