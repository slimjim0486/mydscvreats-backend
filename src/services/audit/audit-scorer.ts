import { scoreSeoAnalysis } from "@/services/seo/seo-scorer";
import type { ScorecardPillar } from "@/services/seo/types";
import type {
  AuditCollectorOutput,
  AuditPillar,
  AuditScorecard,
  AuditScorecardPillar,
} from "./types";

const WEIGHTS: Record<AuditPillar, number> = {
  discoverability: 0.24,
  reputation: 0.22,
  delivery: 0.2,
  photo: 0.18,
  mobile: 0.16,
};

function clampScore(value: number) {
  return Math.max(0, Math.min(100, Math.round(value)));
}

function mapPillar(key: AuditPillar, pillar: ScorecardPillar): AuditScorecardPillar {
  return {
    key,
    label: pillar.label,
    score: pillar.score,
    summary: pillar.summary,
    signals: pillar.signals,
    degraded: pillar.degraded,
  };
}

function missingPillar(key: AuditPillar, label: string): AuditScorecardPillar {
  return {
    key,
    label,
    score: 35,
    summary: `${label} data was unavailable, so this pillar is marked degraded.`,
    signals: ["Collector did not return enough usable data."],
    degraded: true,
  };
}

function scorePhoto(output: AuditCollectorOutput): AuditScorecardPillar {
  const photoVision = output.photoVision;
  if (!photoVision || photoVision.aggregateScore === null) {
    return missingPillar("photo", "Photo Quality");
  }

  const photoCount = output.gbp?.photosCount ?? photoVision.photos.length;
  const countBonus = photoCount >= 20 ? 8 : photoCount >= 10 ? 4 : 0;
  const score = clampScore(photoVision.aggregateScore + countBonus);

  return {
    key: "photo",
    label: "Photo Quality",
    score,
    summary:
      score >= 78
        ? "Restaurant photos are likely helping food appeal and conversion."
        : "Restaurant photos are likely leaving conversion upside on the table.",
    signals: [
      `${photoVision.photos.length} photos analyzed.`,
      `${photoCount} Google photos detected.`,
      photoVision.summary,
    ].filter(Boolean),
  };
}

function scoreMobile(output: AuditCollectorOutput): AuditScorecardPillar {
  const pageSpeed = output.pageSpeed;
  if (!pageSpeed || !pageSpeed.url) {
    if (output.onPage?.url === null) {
      return {
        key: "mobile",
        label: "Mobile & Web",
        score: 30,
        summary: "No website was detected, so mobile conversion is limited to Google and delivery platforms.",
        signals: ["Google profile did not expose a website URL."],
        degraded: true,
      };
    }
    return missingPillar("mobile", "Mobile & Web");
  }

  const performance = pageSpeed.performanceScore ?? 45;
  const seo = pageSpeed.seoScore ?? 50;
  const accessibility = pageSpeed.accessibilityScore ?? 50;
  const score = clampScore(performance * 0.6 + seo * 0.25 + accessibility * 0.15);

  return {
    key: "mobile",
    label: "Mobile & Web",
    score,
    summary:
      score >= 75
        ? "Mobile website signals are strong enough for restaurant discovery."
        : "Mobile website speed or technical signals need attention.",
    signals: [
      `Performance score: ${pageSpeed.performanceScore ?? "unavailable"}.`,
      `SEO score: ${pageSpeed.seoScore ?? "unavailable"}.`,
      pageSpeed.lcpMs ? `Largest Contentful Paint: ${Math.round(pageSpeed.lcpMs)}ms.` : null,
      ...pageSpeed.diagnostics.slice(0, 2),
    ].filter((signal): signal is string => Boolean(signal)),
  };
}

export function scoreAudit(output: AuditCollectorOutput): AuditScorecard {
  const seoScorecard = scoreSeoAnalysis({
    gbp: output.gbp,
    reviews: output.reviews,
    onPage: output.onPage,
    rankGrid: null,
    citations: output.citations,
    failures: output.failures,
    estimatedApifyCostUsd: output.estimatedApifyCostUsd,
  });

  const pillars: AuditScorecard["pillars"] = {
    discoverability: mapPillar("discoverability", seoScorecard.pillars.gbp),
    reputation: mapPillar("reputation", seoScorecard.pillars.reviews),
    delivery: mapPillar("delivery", seoScorecard.pillars.citations),
    photo: scorePhoto(output),
    mobile: scoreMobile(output),
  };

  const overallScore = clampScore(
    Object.entries(pillars).reduce(
      (sum, [key, pillar]) => sum + pillar.score * WEIGHTS[key as AuditPillar],
      0
    )
  );

  return {
    overallScore,
    pillars,
  };
}
