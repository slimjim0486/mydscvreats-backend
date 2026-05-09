import type {
  CitationPlatformResult,
  CollectorOutput,
  GbpData,
  OnPageData,
  RestaurantSeoContext,
  ReviewData,
  SeoProgressStatus,
  SeoRecommendation,
  ScorecardPillar,
} from "@/services/seo/types";

export type AuditProgressStep =
  | "gbp"
  | "reviews"
  | "onPage"
  | "citations"
  | "pageSpeed"
  | "peers"
  | "photos"
  | "synthesis"
  | "recommendations";

export type AuditProgress = Record<AuditProgressStep, SeoProgressStatus>;

export type AuditPillar =
  | "discoverability"
  | "reputation"
  | "delivery"
  | "photo"
  | "mobile";

export interface AuditRestaurantContext extends RestaurantSeoContext {
  id: string;
  name: string;
  location: string;
}

export interface PageSpeedData {
  url: string | null;
  performanceScore: number | null;
  accessibilityScore: number | null;
  seoScore: number | null;
  lcpMs: number | null;
  cls: number | null;
  inpMs: number | null;
  diagnostics: string[];
}

export interface PhotoVisionScore {
  url: string;
  score: number;
  lighting: number;
  composition: number;
  foodAppeal: number;
  notes: string;
}

export interface PhotoVisionData {
  aggregateScore: number | null;
  photos: PhotoVisionScore[];
  summary: string;
}

export interface PeerBenchmarkPlace {
  name: string | null;
  rating: number | null;
  reviewCount: number | null;
  address: string | null;
}

export interface PeerBenchmarkData {
  cuisine: string | null;
  location: string;
  medianRating: number | null;
  medianReviewCount: number | null;
  peers: PeerBenchmarkPlace[];
}

export interface AuditCollectorOutput extends CollectorOutput {
  onPage: OnPageData | null;
  reviews: ReviewData | null;
  gbp: GbpData | null;
  citations: {
    platforms: CitationPlatformResult[];
  } | null;
  pageSpeed: PageSpeedData | null;
  photoVision: PhotoVisionData | null;
  peerBenchmark: PeerBenchmarkData | null;
}

export interface AuditScorecardPillar extends Omit<ScorecardPillar, "key"> {
  key: AuditPillar;
}

export interface AuditScorecard {
  overallScore: number;
  pillars: Record<AuditPillar, AuditScorecardPillar>;
}

export interface AuditSynthesis {
  executiveSummary: string;
  photoCritique: string;
  peerNarrative: string;
  tokensIn: number;
  tokensOut: number;
}

export interface AuditRecommendationResult {
  recommendations: SeoRecommendation[];
  tokensIn: number;
  tokensOut: number;
}
