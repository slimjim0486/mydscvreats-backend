// Internal types for the ad-studio-ai orchestrator (Phase 1).

import type { CountryCode, CuisineFit, FunnelStage, PlatformId, CampaignType } from "@/services/ad-studio";

export interface AdStudioBrief {
  restaurantId: string;
  // Campaign type drives platform mix, audience recipes, etc.
  campaignType: CampaignType;
  goal: FunnelStage;
  countries: CountryCode[];
  cuisines: CuisineFit[];
  targetPlatforms: PlatformId[];
  budgetTier: "lean" | "standard" | "aggressive";
  budgetAed: number;
  durationWeeks?: number;
  // Optional context to ground the creative
  primaryDishId?: string;
  primaryDishName?: string;
  primaryDishDescription?: string | null;
  primaryDishPrice?: number;
  primaryDishImageUrl?: string | null;
  primaryDishCurrency?: string;
  brandVoice?: string;
}

export interface RestaurantBrandContext {
  restaurantId: string;
  name: string;
  cuisineType: string | null;
  description: string | null;
  location: string | null;
  address: string | null;
  whatsappNumber: string | null;
  phone: string | null;
  talabatUrl: string | null;
  deliverooUrl: string | null;
  uberEatsUrl: string | null;
}

export interface StrategyDecision {
  archetypeIds: string[];      // 3 KB archetype ids, ordered by fit
  hookIds: string[];           // 3 KB hook ids
  ctaIds: string[];            // 2 KB cta ids
  copyFrameworkId: string;     // 1 KB copy framework id
  // Per-archetype image direction (concise prompt for image gen)
  imageDirection: string;
  // Dialect choice for the creative — derived from country + audience
  dialect: "khaleeji" | "egyptian" | "levantine" | "msa" | "arabizi" | "english" | "bilingual";
  // Reasoning trace (for audit / debug; never shown to end user)
  rationale: string;
}

export interface CopyVariant {
  variant: number;               // 1, 2, 3, ...
  archetypeId: string;
  hookId: string;
  ctaId: string;
  language: "en" | "ar" | "bilingual";
  headline: string;              // primary headline (English by default)
  primaryText: string;           // main body / caption
  ctaText: string;
  // Arabic mirror (only when bilingual or ar)
  headlineAr?: string;
  primaryTextAr?: string;
  ctaTextAr?: string;
}

export interface SafetyVerdict {
  verdict: "pass" | "fail" | "warn";
  // Human-readable flags + which rule from KB universalNoGoList tripped
  flags: Array<{
    severity: "error" | "warning";
    field: "headline" | "primaryText" | "ctaText" | "imagePrompt" | "compliance";
    rule: string;
    suggestedFix?: string;
  }>;
}

export interface ImageGenResult {
  source: "menu_item" | "ai_generated";
  url: string;
  // Cost in USD; 0 when reusing existing menu image
  costUsd: number;
  prompt?: string;
  // Reference to MenuItemImage if reused
  menuItemImageId?: string;
}

export interface VariantOutput {
  copy: CopyVariant;
  hero: ImageGenResult | null;
  imagePrompt: string | null;
  safetyFlags: SafetyVerdict["flags"];
}

export interface OrchestratorResult {
  strategy: StrategyDecision;
  variants: VariantOutput[];
  totalCostUsd: number;
  tokensIn: number;
  tokensOut: number;
}
