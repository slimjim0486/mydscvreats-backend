// Types for the Phase 2B performance feedback loop.
//
// Manual-entry MVP: owner pastes per-variant metrics from Ads Manager.
// Phase 4 autopilot will plug Meta API in behind the same shape.

export interface PerformanceMetrics {
  spendAed: number;
  impressions: number;
  reach?: number;
  clicks: number;
  conversions: number;
  /** When restaurant runs sales-objective (delivery aggregator handoff) */
  revenueAed?: number;
  /** Frequency = impressions / reach. Required for kill-trigger detection. */
  frequency?: number;
}

export interface DerivedMetrics extends PerformanceMetrics {
  ctrPct: number | null;
  cpmAed: number | null;
  cpcAed: number | null;
  cpaAed: number | null;
  roas: number | null;
}

export interface VariantPerformance {
  creativeId: string;
  variant: number;
  archetypeId: string;
  daysLive: number;
  metrics: DerivedMetrics;
  /** Owner-reported current daily budget — drives concrete "scale to AED X" recs. */
  dailyBudgetAed: number | null;
  /** Most-recent snapshot's `extraJson` (e.g. video completion rate) */
  extra?: Record<string, unknown> | null;
}

export type RecommendationKind =
  | "scale_winner"
  | "kill_underperformer"
  | "refresh_creative"
  | "frequency_warning"
  | "cpa_inflation_warning"
  | "early_signal_positive"
  | "early_signal_negative"
  | "info";

export interface Recommendation {
  kind: RecommendationKind;
  severity: "good" | "neutral" | "warning" | "critical";
  /** Plain-English headline rendered prominently */
  headline: string;
  /** Optional body — 1-2 sentences with the reasoning */
  detail?: string;
  /** Optional creative IDs the recommendation applies to (for inline highlighting) */
  creativeIds?: string[];
  /** Optional KB rule reference */
  kbRule?: string;
}

export interface CampaignInsightsSummary {
  liveCampaignId: string;
  platform: string;
  /** Most-recent snapshot timestamp */
  lastReportedAt: string | null;
  /** Days since launch (or days-live of the latest snapshot) */
  daysLive: number;
  /** Per-variant aggregated metrics */
  variants: VariantPerformance[];
  /** Highest-performing variant by composite score */
  winner: { creativeId: string; variant: number; lift: number } | null;
  /** Worst-performing variant (only flagged when there's enough delta) */
  loser: { creativeId: string; variant: number } | null;
  /** Plain-English recommendations sorted by severity */
  recommendations: Recommendation[];
  /** Sum of spend across all variants */
  totalSpendAed: number;
  /** Sum of conversions */
  totalConversions: number;
  /** Whether enough data exists to generate confident insights */
  hasEnoughData: boolean;
}
