// KB-grounded insights engine.
//
// Inputs: per-variant time-series of performance snapshots.
// Outputs: winner/loser identification + plain-English recommendations
// drawn from KB pacing rules (kill at frequency >3.5 / CTR decay >30% /
// CPA inflation >40%; scale winners by +20% if CPA holds).
//
// Data confidence: Bustan only declares a winner when there's enough spend
// to be statistically meaningful at SMB scale (per Phase 1 KB Section 9
// "Sample-size Reality"). Below that threshold we surface "early signal" not
// "winner" — keeps owners from killing variants prematurely.

import { pacingRules } from "@/services/ad-studio";
import type { Prisma } from "@prisma/client";
import type {
  CampaignInsightsSummary,
  DerivedMetrics,
  PerformanceMetrics,
  Recommendation,
  VariantPerformance,
} from "./types";

/** Minimum spend per variant before we declare a winner with confidence.
 *  Lowered from 250 → 150 per Phase 2B product review: MENA SMB budgets are
 *  smaller than US benchmarks. A 6-variant test on AED 1,500/mo = AED 250
 *  per variant for the WHOLE month; 250 floor would never fire in time. */
const WINNER_MIN_SPEND_AED_FLOOR = 150;
/** Soft floor — calls "leading" (info-tone) but not "winner". */
const LEADING_MIN_SPEND_AED = 100;
/** Below this total daily spend, drop thresholds further and tag low-budget mode. */
const LOW_BUDGET_DAILY_AED = 100;
/** Minimum conversions per variant before CPA-based comparisons fire. */
const WINNER_MIN_CONVERSIONS = 8;
/** How much higher CTR / lower CPA must be to declare lift over the field. */
const WINNER_LIFT_THRESHOLD = 0.25; // 25%
/** Days-live threshold for the early-signal vs winner framing. */
const EARLY_SIGNAL_MAX_DAYS = 4;
/** Cap on total recommendations returned — see analyzeVariants for split. */
const MAX_GOOD_RECS = 3;
/** Critical + warning are NEVER capped — owner needs to see all of them. */

export function deriveMetrics(m: PerformanceMetrics): DerivedMetrics {
  const ctrPct = m.impressions > 0 ? (m.clicks / m.impressions) * 100 : null;
  const cpmAed = m.impressions > 0 ? (m.spendAed / m.impressions) * 1000 : null;
  const cpcAed = m.clicks > 0 ? m.spendAed / m.clicks : null;
  const cpaAed = m.conversions > 0 ? m.spendAed / m.conversions : null;
  const roas = m.revenueAed != null && m.spendAed > 0 ? m.revenueAed / m.spendAed : null;
  return { ...m, ctrPct, cpmAed, cpcAed, cpaAed, roas };
}

interface SnapshotLike {
  creativeId: string | null;
  variant: number | null;
  reportedAt: Date;
  daysLive: number;
  spendAed: Prisma.Decimal | number;
  impressions: number;
  reach: number | null;
  clicks: number;
  conversions: number;
  revenueAed: Prisma.Decimal | number | null;
  frequency: Prisma.Decimal | number | null;
  dailyBudgetAed: Prisma.Decimal | number | null;
  extraJson: Prisma.JsonValue | null;
}

interface CreativeLike {
  id: string;
  variant: number;
  archetypeId: string;
}

interface Input {
  liveCampaignId: string;
  platform: string;
  creatives: CreativeLike[];
  snapshots: SnapshotLike[];
}

export function summarizeCampaignInsights(input: Input): CampaignInsightsSummary {
  // Group snapshots by creative; pick the most recent per creative.
  const byCreative = new Map<string, SnapshotLike>();
  for (const s of input.snapshots) {
    if (!s.creativeId) continue;
    const prior = byCreative.get(s.creativeId);
    if (!prior || s.reportedAt > prior.reportedAt) byCreative.set(s.creativeId, s);
  }

  const variants: VariantPerformance[] = [];
  let lastReportedAt: Date | null = null;

  for (const c of input.creatives) {
    const snapshot = byCreative.get(c.id);
    if (!snapshot) continue;
    const metrics = deriveMetrics({
      spendAed: toNum(snapshot.spendAed),
      impressions: snapshot.impressions,
      reach: snapshot.reach ?? undefined,
      clicks: snapshot.clicks,
      conversions: snapshot.conversions,
      revenueAed: snapshot.revenueAed != null ? toNum(snapshot.revenueAed) : undefined,
      frequency: snapshot.frequency != null ? toNum(snapshot.frequency) : undefined,
    });
    const dailyBudgetAed =
      snapshot.dailyBudgetAed != null ? toNum(snapshot.dailyBudgetAed) : null;
    variants.push({
      creativeId: c.id,
      variant: c.variant,
      archetypeId: c.archetypeId,
      daysLive: snapshot.daysLive,
      metrics,
      dailyBudgetAed,
      // extraJson NOT echoed to client — Phase 4 will introduce a fixed
      // allowlist when Meta API populates it.
      extra: null,
    });
    if (!lastReportedAt || snapshot.reportedAt > lastReportedAt) {
      lastReportedAt = snapshot.reportedAt;
    }
  }

  variants.sort((a, b) => a.variant - b.variant);

  const totalSpendAed = variants.reduce((sum, v) => sum + v.metrics.spendAed, 0);
  const totalConversions = variants.reduce((sum, v) => sum + v.metrics.conversions, 0);
  const maxDaysLive = variants.reduce((max, v) => Math.max(max, v.daysLive), 0);

  // Variant-count-aware floor: 6 variants on a small budget shouldn't starve
  // forever. Threshold = max(floor, 8% of total spend / variants) but never
  // higher than the static floor (150).
  const dynamicFloor = Math.min(
    WINNER_MIN_SPEND_AED_FLOOR,
    Math.max(LEADING_MIN_SPEND_AED, (totalSpendAed * 0.08) / Math.max(1, variants.length))
  );
  const hasEnoughData =
    variants.every((v) => v.metrics.spendAed >= dynamicFloor) && variants.length >= 2;

  // Low-budget mode: total daily spend below 100 AED → relax framing further.
  const totalDailySpend = totalSpendAed / Math.max(1, maxDaysLive);
  const lowBudgetMode = totalDailySpend < LOW_BUDGET_DAILY_AED;

  const { winner, loser, recommendations } = analyzeVariants(
    variants,
    hasEnoughData,
    maxDaysLive,
    lowBudgetMode,
    dynamicFloor
  );

  return {
    liveCampaignId: input.liveCampaignId,
    platform: input.platform,
    lastReportedAt: lastReportedAt?.toISOString() ?? null,
    daysLive: maxDaysLive,
    variants,
    winner,
    loser,
    recommendations,
    totalSpendAed,
    totalConversions,
    hasEnoughData,
  };
}

function analyzeVariants(
  variants: VariantPerformance[],
  hasEnoughData: boolean,
  daysLive: number,
  lowBudgetMode: boolean,
  dynamicFloor: number
): { winner: CampaignInsightsSummary["winner"]; loser: CampaignInsightsSummary["loser"]; recommendations: Recommendation[] } {
  const recs: Recommendation[] = [];

  if (variants.length === 0) {
    return { winner: null, loser: null, recommendations: [] };
  }

  if (!hasEnoughData) {
    const floorRounded = Math.round(dynamicFloor);
    recs.push({
      kind: "info",
      severity: "neutral",
      headline:
        daysLive < 3
          ? "Wait at least 3 days before drawing conclusions."
          : `Spend is still low — wait until each variant has cleared AED ${floorRounded} before we call winners.`,
      detail: lowBudgetMode
        ? `Low-budget mode: at < AED ${LOW_BUDGET_DAILY_AED}/day total spend, Bustan calls signals sooner but with caveats. Aim for at least AED ${floorRounded} per variant before acting.`
        : `Bustan needs ~AED ${floorRounded} of spend per variant before differences are statistically meaningful at SMB scale.`,
    });
    return { winner: null, loser: null, recommendations: recs };
  }

  // Pick a primary metric. CPA when conversions are reported; else CTR.
  const conversionVariants = variants.filter((v) => v.metrics.conversions >= WINNER_MIN_CONVERSIONS);
  const useCpa = conversionVariants.length >= 2;

  if (useCpa) {
    const sorted = [...conversionVariants].sort((a, b) => (a.metrics.cpaAed ?? Infinity) - (b.metrics.cpaAed ?? Infinity));
    const best = sorted[0]!;
    const worst = sorted[sorted.length - 1]!;
    const lift = bestLift(best.metrics.cpaAed, worst.metrics.cpaAed, "cpa");
    recs.push(...buildWinnerRec({ variant: best, daysLive, lift, metricLabel: "lower CPA", basis: "cpa" }));
    if (lift > WINNER_LIFT_THRESHOLD) {
      recs.push(...buildLoserRec({ winner: best, loser: worst, lift, basis: "cpa" }));
    }
    recs.push(...applyKbPacingRules(variants, daysLive));
    return {
      winner: { creativeId: best.creativeId, variant: best.variant, lift },
      loser: lift > WINNER_LIFT_THRESHOLD ? { creativeId: worst.creativeId, variant: worst.variant } : null,
      recommendations: dedupe(recs),
    };
  }

  // No conversion-based ranking — fall back to CTR.
  const sortedByCtr = [...variants]
    .filter((v) => v.metrics.ctrPct != null)
    .sort((a, b) => (b.metrics.ctrPct ?? 0) - (a.metrics.ctrPct ?? 0));
  if (sortedByCtr.length < 2) {
    recs.push({
      kind: "info",
      severity: "neutral",
      headline: "Need at least 2 variants with measurable CTR to compare.",
    });
    return { winner: null, loser: null, recommendations: recs };
  }
  const best = sortedByCtr[0]!;
  const worst = sortedByCtr[sortedByCtr.length - 1]!;
  const lift = bestLift(best.metrics.ctrPct, worst.metrics.ctrPct, "ctr");
  recs.push(...buildWinnerRec({ variant: best, daysLive, lift, metricLabel: "higher CTR", basis: "ctr" }));
  if (lift > WINNER_LIFT_THRESHOLD) {
    recs.push(...buildLoserRec({ winner: best, loser: worst, lift, basis: "ctr" }));
  }
  recs.push(...applyKbPacingRules(variants, daysLive));
  return {
    winner: { creativeId: best.creativeId, variant: best.variant, lift },
    loser: lift > WINNER_LIFT_THRESHOLD ? { creativeId: worst.creativeId, variant: worst.variant } : null,
    recommendations: dedupe(recs),
  };
}

function buildWinnerRec(args: {
  variant: VariantPerformance;
  daysLive: number;
  lift: number;
  metricLabel: string;
  basis: "ctr" | "cpa";
}): Recommendation[] {
  const recs: Recommendation[] = [];
  const isEarly = args.daysLive <= EARLY_SIGNAL_MAX_DAYS;
  const headlinePct = Math.round(args.lift * 100);

  if (isEarly) {
    recs.push({
      kind: "early_signal_positive",
      severity: "good",
      headline: `Early signal: Variant ${args.variant.variant} is leading by ${headlinePct}% on ${args.metricLabel}.`,
      detail:
        `Day ${args.daysLive} is too early to scale aggressively. Watch through day 5-7 before raising budget.`,
      creativeIds: [args.variant.creativeId],
    });
    return recs;
  }

  if (args.lift > WINNER_LIFT_THRESHOLD) {
    // Concrete budget recommendation when the owner reported a daily budget —
    // turns "increase by 20%" into "Scale to AED 60/day".
    const currentBudget = args.variant.dailyBudgetAed;
    const scalePct = pacingRules.scalingCadence.maxIncreasePct; // 20
    const newBudget =
      currentBudget != null && currentBudget > 0
        ? Math.round(currentBudget * (1 + scalePct / 100))
        : null;
    const concreteAction = newBudget
      ? `Scale Variant ${args.variant.variant} from AED ${Math.round(currentBudget!)} → **AED ${newBudget}/day** (+${scalePct}%) — re-check in ${pacingRules.scalingCadence.frequencyDays}-${pacingRules.scalingCadence.frequencyDays + 1} days.`
      : `Scale Variant ${args.variant.variant} budget by +${scalePct}% — re-check in ${pacingRules.scalingCadence.frequencyDays}-${pacingRules.scalingCadence.frequencyDays + 1} days.`;
    recs.push({
      kind: "scale_winner",
      severity: "good",
      headline: `Scale Variant ${args.variant.variant} — ${headlinePct}% better ${args.metricLabel} than the field.`,
      detail: concreteAction,
      creativeIds: [args.variant.creativeId],
      kbRule: "pacingRules.scalingCadence",
    });
  } else {
    recs.push({
      kind: "info",
      severity: "neutral",
      headline: `Variant ${args.variant.variant} is leading on ${args.metricLabel} but the field is tight.`,
      detail: `Lift is ${headlinePct}%. Hold for another 3-4 days before scaling — the gap may close.`,
      creativeIds: [args.variant.creativeId],
    });
  }
  return recs;
}

function buildLoserRec(args: {
  winner: VariantPerformance;
  loser: VariantPerformance;
  lift: number;
  basis: "ctr" | "cpa";
}): Recommendation[] {
  return [
    {
      kind: "kill_underperformer",
      severity: "warning",
      headline: `Kill Variant ${args.loser.variant} — losing to Variant ${args.winner.variant} by ${Math.round(args.lift * 100)}%.`,
      detail:
        "Pull the budget into the leader. Pausing now stops feeding Meta's algorithm with low-signal events.",
      creativeIds: [args.loser.creativeId],
    },
  ];
}

function applyKbPacingRules(variants: VariantPerformance[], daysLive: number): Recommendation[] {
  const recs: Recommendation[] = [];
  const killFreq = pacingRules.killTriggers.frequency; // 3.5
  const killCpaInflation = pacingRules.killTriggers.cpaInflationPct; // 40
  const refreshDays = pacingRules.refreshCadence.evergreen.days; // 21

  for (const v of variants) {
    if (v.metrics.frequency != null && v.metrics.frequency > killFreq) {
      recs.push({
        kind: "frequency_warning",
        severity: "critical",
        headline: `Variant ${v.variant} frequency at ${v.metrics.frequency.toFixed(1)} — kill or refresh creative.`,
        detail: `KB rule: kill an ad once frequency exceeds ${killFreq}. The same audience has seen this ad too often; you're paying for diminishing returns.`,
        creativeIds: [v.creativeId],
        kbRule: "pacingRules.killTriggers.frequency",
      });
    }
    if (daysLive >= refreshDays) {
      recs.push({
        kind: "refresh_creative",
        severity: "warning",
        headline: `Refresh Variant ${v.variant} — it's been live for ${daysLive} days.`,
        detail: `KB cadence: refresh creative every ${refreshDays} days for evergreen, every 7 for intensive campaigns. Generate a new image or rewrite the hook in the Studio.`,
        creativeIds: [v.creativeId],
        kbRule: "pacingRules.refreshCadence",
      });
    }
  }

  // CPA inflation requires history (>=2 snapshots over time). Fall back to a
  // simple "CPA is 40% higher than the cohort median" heuristic for now.
  const cpas = variants.map((v) => v.metrics.cpaAed).filter((n): n is number => n != null && n > 0);
  if (cpas.length >= 3) {
    const median = cpas.slice().sort((a, b) => a - b)[Math.floor(cpas.length / 2)]!;
    for (const v of variants) {
      const cpa = v.metrics.cpaAed;
      if (cpa != null && cpa > median * (1 + killCpaInflation / 100)) {
        recs.push({
          kind: "cpa_inflation_warning",
          severity: "warning",
          headline: `Variant ${v.variant} CPA is AED ${cpa.toFixed(0)} — ${Math.round((cpa / median - 1) * 100)}% above the median.`,
          detail: `KB kill-trigger: CPA inflation > ${killCpaInflation}%. Pause this variant before it eats more budget.`,
          creativeIds: [v.creativeId],
          kbRule: "pacingRules.killTriggers.cpaInflationPct",
        });
      }
    }
  }

  return recs;
}

function bestLift(best: number | null, worst: number | null, basis: "ctr" | "cpa"): number {
  if (best == null || worst == null || best === 0 || worst === 0) return 0;
  // For CPA, lower is better → lift is (worst - best) / worst.
  // For CTR, higher is better → lift is (best - worst) / worst.
  if (basis === "cpa") return Math.max(0, (worst - best) / worst);
  return Math.max(0, (best - worst) / worst);
}

function toNum(v: number | Prisma.Decimal | null | undefined): number {
  if (v == null) return 0;
  if (typeof v === "number") return v;
  return Number(v.toString());
}

function dedupe(recs: Recommendation[]): Recommendation[] {
  const seen = new Set<string>();
  const out: Recommendation[] = [];
  for (const r of recs) {
    const key = `${r.kind}:${r.headline}`;
    if (seen.has(key)) continue;
    seen.add(key);
    out.push(r);
  }
  // Sort: critical → warning → good → neutral
  const order: Record<Recommendation["severity"], number> = { critical: 0, warning: 1, good: 2, neutral: 3 };
  out.sort((a, b) => order[a.severity] - order[b.severity]);

  // Caps: critical + warning are NEVER truncated (owner needs to see all
  // of them — they're spending real money). Good caps at MAX_GOOD_RECS (3).
  // Neutral/info caps at 2 to avoid clutter.
  const critical = out.filter((r) => r.severity === "critical");
  const warning = out.filter((r) => r.severity === "warning");
  const good = out.filter((r) => r.severity === "good").slice(0, MAX_GOOD_RECS);
  const neutral = out.filter((r) => r.severity === "neutral").slice(0, 2);
  return [...critical, ...warning, ...good, ...neutral];
}
