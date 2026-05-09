// =============================================================================
// Bustan Ad Creative Studio — Knowledge Base
// =============================================================================
//
// A typed, structured knowledge base of restaurant marketing best practices
// for UAE / GCC / MENA, current as of Q2 2026.
//
// This module is consumed by:
//   1. The AI generator (system-prompt context for Claude when producing
//      creative briefs, copy, hook variations, campaign plans)
//   2. The dashboard UX (drop-down options, validators, suggestions)
//   3. Validators that ensure exported creative meets platform specs and
//      country cultural rules
//
// Re-verify the data in this KB before Q4 2026 — see meta.ts for last
// verified date and confidence flags.

export * from "./types";
export * from "./platforms";
export * from "./archetypes";
export * from "./hooks";
export * from "./ctas";
export * from "./copy-frameworks";
export * from "./campaigns";
export * from "./calendar";
export * from "./cultural-rules";
export * from "./audiences";
export * from "./promos";
export * from "./cinematography";
export * from "./meta";

// =============================================================================
// PUBLIC API — typed accessor helpers for the AI generator and dashboard
// =============================================================================

import { platformFormats, platformBenchmarks } from "./platforms";
import { creativeArchetypes, archetypeDecisionRules } from "./archetypes";
import { hookTemplates, menaSignatureHooks } from "./hooks";
import { ctaPatterns, ctaSelectionRules } from "./ctas";
import { campaignArchetypes, funnelStageRules, pacingRules } from "./campaigns";
import { calendarMoments, getMomentsForCountry, getNextMomentForCountry } from "./calendar";
import { countryRules, universalNoGoList, dialectRules, pricingDisplayRules } from "./cultural-rules";
import { audienceRecipes } from "./audiences";
import { promoMechanics, discountThresholds, escalationLadder, bundleNamingRules } from "./promos";
import { cinematographyRules, videoTemplates } from "./cinematography";
import type {
  CountryCode,
  CreativeArchetype,
  HookTemplate,
  CtaPattern,
  CampaignArchetype,
  CampaignType,
  CalendarMoment,
  PlatformId,
  PlatformFormat,
  FunnelStage,
  CuisineFit,
  CountryRules,
  AudienceRecipe,
  PromoMechanic,
  CopyFramework,
} from "./types";
import { copyFrameworks } from "./copy-frameworks";

// -----------------------------------------------------------------------------
// PLATFORM ACCESSORS
// -----------------------------------------------------------------------------

export function getPlatformFormat(id: PlatformId): PlatformFormat | undefined {
  return platformFormats.find((p) => p.id === id);
}

export function getPlatformFormatsForPlatform(platform: PlatformFormat["platform"]): PlatformFormat[] {
  return platformFormats.filter((p) => p.platform === platform);
}

// -----------------------------------------------------------------------------
// ARCHETYPE ACCESSORS
// -----------------------------------------------------------------------------

export function getArchetype(id: string): CreativeArchetype | undefined {
  return creativeArchetypes.find((a) => a.id === id);
}

export function getArchetypesForFunnelStage(stage: FunnelStage): CreativeArchetype[] {
  return creativeArchetypes.filter((a) => a.funnelStages.includes(stage));
}

export function getArchetypesForCuisine(cuisine: CuisineFit): CreativeArchetype[] {
  return creativeArchetypes.filter((a) => a.cuisineFits.includes(cuisine) || a.cuisineFits.includes("all"));
}

export function getArchetypesForPlatform(platformId: PlatformId): CreativeArchetype[] {
  return creativeArchetypes.filter((a) => a.bestPlatforms.includes(platformId));
}

// -----------------------------------------------------------------------------
// HOOK ACCESSORS
// -----------------------------------------------------------------------------

export function getHook(id: string): HookTemplate | undefined {
  return hookTemplates.find((h) => h.id === id);
}

export function getHooksForFunnelStage(stage: FunnelStage): HookTemplate[] {
  return hookTemplates.filter((h) => h.funnelStages.includes(stage));
}

export function getHooksForPlatform(platformId: PlatformId): HookTemplate[] {
  return hookTemplates.filter((h) => h.bestPlatforms.includes(platformId));
}

export function getNonFatigueHooksForFunnelStage(stage: FunnelStage): HookTemplate[] {
  return hookTemplates.filter(
    (h) => h.funnelStages.includes(stage) && h.fatigue !== "heavy"
  );
}

// -----------------------------------------------------------------------------
// CTA ACCESSORS
// -----------------------------------------------------------------------------

export function getCta(id: string): CtaPattern | undefined {
  return ctaPatterns.find((c) => c.id === id);
}

export function getCtasForCampaign(campaignId: CampaignType): CtaPattern[] {
  const ids = (ctaSelectionRules.byCampaignType as Record<CampaignType, readonly string[]>)[campaignId] ?? [];
  return ids.map((id) => ctaPatterns.find((c) => c.id === id)).filter((c): c is CtaPattern => Boolean(c));
}

export function getCtasForFunnelStage(stage: FunnelStage): CtaPattern[] {
  return ctaPatterns.filter((c) => c.funnelStages.includes(stage));
}

// -----------------------------------------------------------------------------
// COPY FRAMEWORK ACCESSORS
// -----------------------------------------------------------------------------

export function getCopyFramework(id: string): CopyFramework | undefined {
  return copyFrameworks.find((f) => f.id === id);
}

export function getCopyFrameworksForFunnelStage(stage: FunnelStage): CopyFramework[] {
  return copyFrameworks.filter((f) => f.bestFor.includes(stage));
}

// -----------------------------------------------------------------------------
// CAMPAIGN ACCESSORS
// -----------------------------------------------------------------------------

export function getCampaign(id: CampaignType): CampaignArchetype | undefined {
  return campaignArchetypes.find((c) => c.id === id);
}

export function listCampaignTypes(): CampaignArchetype[] {
  return campaignArchetypes;
}

// -----------------------------------------------------------------------------
// CALENDAR ACCESSORS (re-exported from calendar.ts)
// -----------------------------------------------------------------------------

export { getMomentsForCountry, getNextMomentForCountry };

// -----------------------------------------------------------------------------
// CULTURAL RULE ACCESSORS
// -----------------------------------------------------------------------------

export function getCountryRules(country: CountryCode): CountryRules | undefined {
  return countryRules.find((c) => c.country === country);
}

export function isImageryAllowed(
  country: CountryCode,
  imagery: "alcohol" | "pork" | "gambling" | "non_modest" | "lgbtq"
): boolean {
  const rules = getCountryRules(country);
  if (!rules) return false;
  switch (imagery) {
    case "alcohol":
      return rules.alcoholImagery === "permitted" || rules.alcoholImagery === "licensed_venue_only";
    case "pork":
      return rules.porkImagery === "ok_in_context";
    case "gambling":
      return rules.gamblingImagery === "ok";
    case "non_modest":
      return rules.modestyLevel === "permissive";
    case "lgbtq":
      return false; // Universal NO across MENA per cultural-rules.ts
  }
}

// -----------------------------------------------------------------------------
// AUDIENCE ACCESSORS
// -----------------------------------------------------------------------------

export function getAudienceRecipe(id: string): AudienceRecipe | undefined {
  return audienceRecipes.find((a) => a.id === id);
}

export function getAudienceRecipesForPlatform(platform: AudienceRecipe["platform"]): AudienceRecipe[] {
  return audienceRecipes.filter((a) => a.platform === platform);
}

// -----------------------------------------------------------------------------
// PROMO ACCESSORS
// -----------------------------------------------------------------------------

export function getPromoMechanic(id: string): PromoMechanic | undefined {
  return promoMechanics.find((p) => p.id === id);
}

export function getPromosForCuisineTier(tier: keyof typeof discountThresholds): PromoMechanic[] {
  const ids = discountThresholds[tier].preferred;
  return ids
    .map((id) => promoMechanics.find((p) => p.id === id))
    .filter((p): p is PromoMechanic => Boolean(p));
}

// -----------------------------------------------------------------------------
// HIGH-LEVEL CONTEXT BUILDER
// -----------------------------------------------------------------------------
//
// Builds a structured, AI-prompt-friendly object describing what the AI generator
// should know for a given brief. Used when producing creative or campaign plans.

export interface BriefContext {
  country: CountryCode;
  cuisine: CuisineFit;
  goal: FunnelStage;
  platforms: PlatformId[];
  campaignType?: CampaignType;
  asOfIsoDate: string;
}

export function buildKbContextForBrief(brief: BriefContext): {
  countryRules: CountryRules | undefined;
  archetypes: CreativeArchetype[];
  hooks: HookTemplate[];
  ctas: CtaPattern[];
  copyFrameworks: CopyFramework[];
  upcomingMoment: CalendarMoment | null;
  campaignArchetype: CampaignArchetype | undefined;
  audienceRecipes: AudienceRecipe[];
  noGoList: typeof universalNoGoList;
  pricingFormat: ReturnType<typeof getPricingFormat>;
  dialect: string;
} {
  const cRules = getCountryRules(brief.country);

  const archetypeIds = new Set<string>();
  archetypeDecisionRules.byCuisine[
    cuisineToBucket(brief.cuisine)
  ]?.forEach((id) => archetypeIds.add(id));
  archetypeDecisionRules.byGoalAndBudget[
    goalToBucket(brief.goal)
  ]?.forEach((id) => archetypeIds.add(id));
  const archetypes = Array.from(archetypeIds)
    .map((id) => creativeArchetypes.find((a) => a.id === id))
    .filter((a): a is CreativeArchetype => Boolean(a));

  return {
    countryRules: cRules,
    archetypes,
    hooks: getNonFatigueHooksForFunnelStage(brief.goal).slice(0, 12),
    ctas: brief.campaignType ? getCtasForCampaign(brief.campaignType) : getCtasForFunnelStage(brief.goal),
    copyFrameworks: getCopyFrameworksForFunnelStage(brief.goal),
    upcomingMoment: getNextMomentForCountry(brief.country, brief.asOfIsoDate),
    campaignArchetype: brief.campaignType ? getCampaign(brief.campaignType) : undefined,
    audienceRecipes: brief.platforms
      .map((p) => p.split("_")[0] as AudienceRecipe["platform"])
      .filter((p, i, arr) => arr.indexOf(p) === i)
      .flatMap((p) => getAudienceRecipesForPlatform(p))
      .filter((a) => a.applicableCountries.includes(brief.country)),
    noGoList: universalNoGoList,
    pricingFormat: getPricingFormat(brief.country),
    dialect: dialectRules.selectDialect({ country: brief.country }),
  };
}

function cuisineToBucket(cuisine: CuisineFit): keyof typeof archetypeDecisionRules.byCuisine {
  switch (cuisine) {
    case "fine_dining":
      return "fine_dining";
    case "streetfood":
      return "streetfood";
    case "qsr":
    case "burger":
    case "pizza":
      return "qsr_delivery";
    case "cafe":
    case "dessert":
      return "cafe_dessert";
    default:
      return "family_casual";
  }
}

function goalToBucket(stage: FunnelStage): keyof typeof archetypeDecisionRules.byGoalAndBudget {
  switch (stage) {
    case "tofu":
      return "awareness_low_budget";
    case "mofu":
      return "consideration";
    case "bofu":
    case "retention":
      return "conversion";
  }
}

function getPricingFormat(country: CountryCode) {
  const rules = getCountryRules(country);
  if (!rules) return undefined;
  const fmt = pricingDisplayRules.format[rules.currency];
  return { currency: rules.currency, decimals: rules.decimals, format: fmt };
}

// -----------------------------------------------------------------------------
// SYSTEM PROMPT BUILDER — produces a Claude-ready string of relevant KB context
// -----------------------------------------------------------------------------

export function buildSystemPromptContext(brief: BriefContext): string {
  const ctx = buildKbContextForBrief(brief);

  const archetypesSummary = ctx.archetypes
    .slice(0, 6)
    .map((a) => `- ${a.name} — ${a.why}`)
    .join("\n");

  const hooksSummary = ctx.hooks
    .slice(0, 8)
    .map((h) => `- ${h.template}${h.templateAr ? ` (AR: ${h.templateAr})` : ""}`)
    .join("\n");

  const ctaSummary = ctx.ctas
    .slice(0, 6)
    .map((c) => `- ${c.english}${c.arabic ? ` / ${c.arabic}` : ""}`)
    .join("\n");

  const cRules = ctx.countryRules;
  const noGoSnippet = cRules
    ? [
        `Alcohol imagery: ${cRules.alcoholImagery}`,
        `Pork imagery: ${cRules.porkImagery}`,
        `Modesty: ${cRules.modestyLevel}`,
        `Calorie disclosure required: ${cRules.calorieDisclosureRequired}`,
        `Primary dialect: ${cRules.primaryDialect}`,
      ].join("; ")
    : "";

  const upcoming = ctx.upcomingMoment;
  const upcomingSnippet = upcoming
    ? `Upcoming moment: ${upcoming.name} (${upcoming.dates[0]?.from} – ${upcoming.dates[0]?.to}). Spend pulse: ${upcoming.spendPulse}. Creative angles: ${upcoming.creativeAngles.slice(0, 3).join(" / ")}. Avoid: ${upcoming.doNotList.slice(0, 3).join(" / ")}.`
    : "";

  return `# Restaurant Ad Creative Studio — KB Context

## Country: ${brief.country}
${noGoSnippet}

## Cuisine: ${brief.cuisine}
## Goal: ${brief.goal}
## Platforms: ${brief.platforms.join(", ")}
## Dialect to use: ${ctx.dialect}
${ctx.pricingFormat ? `## Currency: ${ctx.pricingFormat.currency} (${ctx.pricingFormat.decimals} decimals)` : ""}

## Recommended creative archetypes
${archetypesSummary}

## Recommended hooks (avoid 2026-fatigued)
${hooksSummary}

## Recommended CTAs
${ctaSummary}

${upcomingSnippet}

## Universal MENA suppression list (NEVER produce)
${ctx.noGoList.alwaysSuppressInGcc.slice(0, 8).map((s) => `- ${s}`).join("\n")}
`;
}
