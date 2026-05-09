// Meta Marketing API — campaign.json builder
//
// Produces a structured JSON tree that mirrors the v23+ Marketing API shape:
//   Campaign → AdSet[] → Ad[] → AdCreative[]
//
// The output is hand-uploadable via Ads Manager (Bulk Editor) OR machine-
// uploadable via the Marketing API in Phase 4 autopilot. Either way, the
// shape is stable across both code paths.
//
// We emit campaigns in PAUSED status — the owner reviews + un-pauses in
// Ads Manager. Never auto-launch from an export.

import {
  campaignArchetypes,
  audienceRecipes,
  type CampaignType,
  type CountryCode,
  type FunnelStage,
} from "@/services/ad-studio";

// =============================================================================
// Marketing API enums (v23, May 2026)
// =============================================================================

// Meta's `objective` enum we use:
//   OUTCOME_AWARENESS, OUTCOME_TRAFFIC, OUTCOME_ENGAGEMENT,
//   OUTCOME_LEADS, OUTCOME_SALES, OUTCOME_APP_PROMOTION
type MetaObjective =
  | "OUTCOME_AWARENESS"
  | "OUTCOME_TRAFFIC"
  | "OUTCOME_ENGAGEMENT"
  | "OUTCOME_LEADS"
  | "OUTCOME_SALES";

type MetaOptimizationGoal =
  | "REACH"
  | "IMPRESSIONS"
  | "LINK_CLICKS"
  | "LANDING_PAGE_VIEWS"
  | "POST_ENGAGEMENT"
  | "OFFSITE_CONVERSIONS"
  | "LEAD_GENERATION"
  | "CONVERSATIONS"
  | "QUALITY_LEAD";

type MetaBillingEvent = "IMPRESSIONS" | "LINK_CLICKS";

type MetaCallToActionType =
  | "ORDER_NOW"
  | "BOOK_TRAVEL"
  | "GET_OFFER"
  | "LEARN_MORE"
  | "MESSAGE_PAGE"
  | "WHATSAPP_MESSAGE"
  | "GET_DIRECTIONS"
  | "CALL_NOW";

// =============================================================================
// Output types
// =============================================================================

export interface MetaCampaignJson {
  /** Top-level campaign — Marketing API-shape only (no Bustan extras). */
  campaign: {
    name: string;
    objective: MetaObjective;
    status: "PAUSED";
    special_ad_categories: string[];
    buying_type: "AUCTION";
  };
  ad_sets: MetaAdSet[];
  notes: string[];
  /**
   * Bustan-only metadata kept strictly outside the Marketing API objects so
   * Bulk Importer / Marketing API don't reject "unknown parameter". Includes
   * the list of placeholder paths the user must hand-edit before upload.
   */
  _bustan: {
    campaign_type: CampaignType;
    goal: FunnelStage;
    countries: CountryCode[];
    kb_version: string;
    generated_at: string;
    /** JSON paths that the user MUST replace before machine-uploading. */
    requires_replacement: string[];
    /** Per-ad-set / per-ad trace for audit + Phase 4 autopilot reuse. */
    trace: BustanTrace;
  };
}

interface BustanTrace {
  ad_sets: Array<{
    name: string;
    /** Plain-English source of the audience recipe. */
    source: string;
    ads: Array<{
      name: string;
      creative_id: string;
      variant: number;
      archetype_id: string;
      hook_id: string | null;
      cta_id: string | null;
      copy_variants: {
        en: { headline: string; primary_text: string; cta_text: string };
        ar?: { headline: string; primary_text: string; cta_text: string };
      };
      image_paths: {
        "9:16": string;
        "4:5": string;
        "1:1": string;
        "1.91:1": string;
      };
    }>;
  }>;
}

interface MetaAdSet {
  name: string;
  status: "PAUSED";
  /** AED minor units (fils). e.g. 50000 = AED 500.00 */
  daily_budget: number;
  currency: "AED" | "SAR" | "USD";
  optimization_goal: MetaOptimizationGoal;
  billing_event: MetaBillingEvent;
  bid_strategy: "LOWEST_COST_WITHOUT_CAP" | "LOWEST_COST_WITH_BID_CAP" | "COST_CAP";
  targeting: MetaTargeting;
  /** Each variant becomes one ad inside the set. */
  ads: MetaAd[];
}

interface MetaTargeting {
  /** Geo-fences keyed off countries from the brief. */
  geo_locations: {
    countries?: CountryCode[];
    custom_locations?: Array<{
      latitude?: number;
      longitude?: number;
      radius?: number;
      distance_unit?: "kilometer" | "mile";
      name?: string;
      country?: CountryCode;
    }>;
  };
  age_min: number;
  age_max: number;
  /** Bustan: keep these as plain-English suggestions; Meta requires interest IDs which the user maps in Ads Manager. */
  interest_suggestions: string[];
  /** Whether to enable Advantage+ Audience expansion. */
  advantage_audience: 0 | 1;
  /** Optional Custom Audience handles — populated when the brief implies it (e.g., past customers). */
  custom_audience_keys: string[];
  /** Optional Lookalike — same. */
  lookalike_keys: string[];
}

interface MetaAd {
  name: string;
  status: "PAUSED";
  creative: MetaAdCreative;
}

interface MetaAdCreative {
  name: string;
  /**
   * Object story spec — the actual ad body. `page_id` is intentionally OMITTED
   * (not a placeholder string) so Meta's Bulk Importer fails fast with
   * "missing required field" if the user uploads without replacing.
   * The owner fills this in via Ads Manager UI when selecting their Page.
   * See `_bustan.requires_replacement` for the list of fields the user must add.
   */
  object_story_spec: {
    instagram_actor_id?: string;
    link_data?: {
      link: string;
      message: string;
      name: string;
      description?: string;
      image_paths: string[];
      call_to_action: { type: MetaCallToActionType; value?: { link?: string } };
    };
    video_data?: {
      video_id?: string;
      title: string;
      message: string;
      call_to_action: { type: MetaCallToActionType };
    };
  };
}

// =============================================================================
// Builder
// =============================================================================

interface BuildInput {
  project: {
    id: string;
    name: string;
    campaignType: CampaignType;
    goal: FunnelStage;
    countries: CountryCode[];
    budgetAed: number;
    durationWeeks: number | null;
  };
  creatives: Array<{
    id: string;
    variant: number;
    archetypeId: string;
    hookId: string | null;
    ctaId: string | null;
    headline: string;
    primaryText: string;
    ctaText: string;
    headlineAr: string | null;
    primaryTextAr: string | null;
    ctaTextAr: string | null;
    /** R2 image URL — caller resizes to all aspect ratios in image-resizer.ts. */
    heroImageUrl: string;
  }>;
  /** Where the creative's "Learn more" / CTA link sends. */
  destinationUrl: string;
  /** Sales-objective campaigns need a pixel id — owner fills in Ads Manager. */
  pixelIdHint?: string;
  /** Restaurant Page name (Meta Page) — Bustan can't know the Page ID; we leave a placeholder. */
  pageNameHint: string;
  kbVersion: string;
}

export function buildMetaCampaignJson(input: BuildInput): MetaCampaignJson {
  const archetype = campaignArchetypes.find((c) => c.id === input.project.campaignType);

  const objective: MetaObjective = mapToMetaObjective(input.project.goal, input.project.campaignType);
  const optimization_goal: MetaOptimizationGoal = mapToOptimizationGoal(objective);
  const billing_event: MetaBillingEvent = "IMPRESSIONS";

  // Daily budget = total / (duration weeks × 7), in AED minor units (fils).
  const durationDays = (input.project.durationWeeks ?? 4) * 7;
  const dailyAed = Math.max(50, Math.round(input.project.budgetAed / durationDays));
  const dailyMinor = dailyAed * 100;

  // Pull Meta-flavored audience recipes from the KB. Each becomes one ad set.
  const recipes = (archetype?.audienceRecipeIds ?? [])
    .map((id) => audienceRecipes.find((r) => r.id === id))
    .filter((r): r is NonNullable<typeof r> => Boolean(r) && r!.platform === "meta");

  // Each helper returns both the clean Marketing API object AND the Bustan
  // trace data, so we can keep the two shapes strictly separated.
  const adSetPairs = recipes.length === 0
    ? [buildBroadDefaultAdSet(input, dailyMinor, optimization_goal, billing_event)]
    : recipes.map((r) =>
        buildAdSetFromRecipe(r, input, dailyMinor, optimization_goal, billing_event)
      );
  const adSets: MetaAdSet[] = adSetPairs.map((p) => p.adSet);
  const adSetSources: string[] = adSetPairs.map((p) => p.source);

  // Build the per-ad creative refs from each variant.
  const adPairs = input.creatives.map((c) => buildAdFromCreative(c, input));
  const ads: MetaAd[] = adPairs.map((p) => p.ad);
  const adTraceByName = new Map(adPairs.map((p) => [p.ad.name, p.trace] as const));

  // Distribute ads evenly across ad sets — owners can rebalance in Ads Manager.
  const split = Math.max(1, Math.ceil(ads.length / adSets.length));
  for (let i = 0; i < adSets.length; i++) {
    adSets[i].ads = ads.slice(i * split, (i + 1) * split);
  }
  // Make sure no ad set is empty (push leftover into the first one).
  if (adSets.some((s) => s.ads.length === 0)) {
    for (const set of adSets) {
      if (set.ads.length === 0 && ads.length > 0) {
        set.ads = [ads[0]!];
      }
    }
  }

  const notes = buildNotes(input, archetype);

  // Build the Bustan trace (separate from Marketing-API-shaped objects)
  const trace: BustanTrace = {
    ad_sets: adSets.map((set, idx) => ({
      name: set.name,
      source: adSetSources[idx] ?? "",
      ads: set.ads.map((ad) => {
        const adTrace = adTraceByName.get(ad.name);
        return adTrace ?? {
          name: ad.name,
          creative_id: "",
          variant: 0,
          archetype_id: "",
          hook_id: null,
          cta_id: null,
          copy_variants: { en: { headline: "", primary_text: "", cta_text: "" } },
          image_paths: { "9:16": "", "4:5": "", "1:1": "", "1.91:1": "" },
        };
      }),
    })),
  };

  return {
    campaign: {
      name: `${input.project.name} — ${archetype?.name ?? input.project.campaignType}`,
      objective,
      status: "PAUSED",
      special_ad_categories: [],
      buying_type: "AUCTION",
    },
    ad_sets: adSets,
    notes,
    _bustan: {
      campaign_type: input.project.campaignType,
      goal: input.project.goal,
      countries: input.project.countries,
      kb_version: input.kbVersion,
      generated_at: new Date().toISOString(),
      requires_replacement: [
        "ad_sets[*].ads[*].creative.object_story_spec.page_id (your Facebook Page ID)",
        "ad_sets[*].targeting.custom_audience_keys (link to actual Custom Audience IDs in Ads Manager)",
        "ad_sets[*].targeting.lookalike_keys (link to actual Lookalike Audience IDs)",
      ],
      trace,
    },
  };
}

function mapToMetaObjective(goal: FunnelStage, campaignType: CampaignType): MetaObjective {
  // Restaurants typically optimize for messages (CTWA) or leads (reservations).
  // Sales is for delivery-aggregator-direct flows (rare in MVP).
  switch (campaignType) {
    case "delivery_acquisition":
      return "OUTCOME_SALES";
    case "catering_corporate_lead_gen":
      return "OUTCOME_LEADS";
    case "soft_launch_awareness":
      return "OUTCOME_AWARENESS";
    default:
      break;
  }
  switch (goal) {
    case "tofu":
      return "OUTCOME_AWARENESS";
    case "mofu":
      return "OUTCOME_ENGAGEMENT";
    case "bofu":
      return "OUTCOME_LEADS";
    case "retention":
      return "OUTCOME_ENGAGEMENT";
  }
}

function mapToOptimizationGoal(objective: MetaObjective): MetaOptimizationGoal {
  switch (objective) {
    case "OUTCOME_AWARENESS":
      return "REACH";
    case "OUTCOME_TRAFFIC":
      return "LINK_CLICKS";
    case "OUTCOME_ENGAGEMENT":
      return "POST_ENGAGEMENT";
    case "OUTCOME_LEADS":
      return "CONVERSATIONS"; // CTWA-first for MENA F&B
    case "OUTCOME_SALES":
      return "OFFSITE_CONVERSIONS";
  }
}

function buildAdSetFromRecipe(
  recipe: { id: string; name: string; setup: string },
  input: BuildInput,
  dailyMinor: number,
  optimization_goal: MetaOptimizationGoal,
  billing_event: MetaBillingEvent
): { adSet: MetaAdSet; source: string } {
  return {
    adSet: {
      name: recipe.name,
      status: "PAUSED",
      daily_budget: dailyMinor,
      currency: "AED",
      optimization_goal,
      billing_event,
      bid_strategy: "LOWEST_COST_WITHOUT_CAP",
      targeting: {
        geo_locations: { countries: input.project.countries },
        age_min: 22,
        age_max: 50,
        interest_suggestions: extractInterestSuggestions(recipe.setup),
        advantage_audience: 1,
        custom_audience_keys: extractCustomAudienceKeys(recipe.id),
        lookalike_keys: extractLookalikeKeys(recipe.id),
      },
      ads: [],
    },
    source: recipe.setup,
  };
}

function buildBroadDefaultAdSet(
  input: BuildInput,
  dailyMinor: number,
  optimization_goal: MetaOptimizationGoal,
  billing_event: MetaBillingEvent
): { adSet: MetaAdSet; source: string } {
  return {
    adSet: {
      name: "Broad audience (Advantage+)",
      status: "PAUSED",
      daily_budget: dailyMinor,
      currency: "AED",
      optimization_goal,
      billing_event,
      bid_strategy: "LOWEST_COST_WITHOUT_CAP",
      targeting: {
        geo_locations: { countries: input.project.countries },
        age_min: 22,
        age_max: 55,
        interest_suggestions: ["Restaurants", "Foodie", "Cuisine"],
        advantage_audience: 1,
        custom_audience_keys: [],
        lookalike_keys: [],
      },
      ads: [],
    },
    source: "Default broad audience — KB had no Meta audience recipe for this archetype.",
  };
}

function buildAdFromCreative(
  c: BuildInput["creatives"][number],
  input: BuildInput
): { ad: MetaAd; trace: BustanTrace["ad_sets"][number]["ads"][number] } {
  const callToAction: MetaCallToActionType = mapCtaToMetaCta(c.ctaId);
  const adName = `Variant ${c.variant} — ${c.archetypeId.replace(/_/g, " ")}`;

  // Marketing-API-clean ad shape (no bustan_* fields anywhere).
  const ad: MetaAd = {
    name: adName,
    status: "PAUSED",
    creative: {
      name: `Bustan creative — ${c.id.slice(0, 8)}`,
      object_story_spec: {
        // page_id intentionally omitted; see _bustan.requires_replacement.
        link_data: {
          link: input.destinationUrl,
          message: c.primaryText,
          name: c.headline,
          image_paths: [
            `creatives/variant-${c.variant}/hero-1x1.jpg`,
            `creatives/variant-${c.variant}/hero-4x5.jpg`,
            `creatives/variant-${c.variant}/hero-9x16.jpg`,
          ],
          call_to_action: { type: callToAction, value: { link: input.destinationUrl } },
        },
      },
    },
  };

  // Bustan-only trace, shipped under top-level _bustan.trace.
  const trace: BustanTrace["ad_sets"][number]["ads"][number] = {
    name: adName,
    creative_id: c.id,
    variant: c.variant,
    archetype_id: c.archetypeId,
    hook_id: c.hookId,
    cta_id: c.ctaId,
    copy_variants: {
      en: { headline: c.headline, primary_text: c.primaryText, cta_text: c.ctaText },
      ...(c.headlineAr
        ? {
            ar: {
              headline: c.headlineAr,
              primary_text: c.primaryTextAr ?? "",
              cta_text: c.ctaTextAr ?? c.ctaText,
            },
          }
        : {}),
    },
    image_paths: {
      "9:16": `creatives/variant-${c.variant}/hero-9x16.jpg`,
      "4:5": `creatives/variant-${c.variant}/hero-4x5.jpg`,
      "1:1": `creatives/variant-${c.variant}/hero-1x1.jpg`,
      "1.91:1": `creatives/variant-${c.variant}/hero-191x1.jpg`,
    },
  };

  return { ad, trace };
}

function mapCtaToMetaCta(ctaId: string | null): MetaCallToActionType {
  if (!ctaId) return "LEARN_MORE";
  if (ctaId.includes("whatsapp")) return "WHATSAPP_MESSAGE";
  if (ctaId.includes("order")) return "ORDER_NOW";
  if (ctaId.includes("book") || ctaId.includes("reserve")) return "BOOK_TRAVEL";
  if (ctaId.includes("walk") || ctaId.includes("visit")) return "GET_DIRECTIONS";
  if (ctaId.includes("free_dessert") || ctaId.includes("discount") || ctaId.includes("offer")) {
    return "GET_OFFER";
  }
  if (ctaId.includes("call")) return "CALL_NOW";
  return "LEARN_MORE";
}

function extractInterestSuggestions(setup: string): string[] {
  // Heuristic: pull interest names that appear after "Interest:" in the recipe setup.
  const m = setup.match(/Interest[s]?:\s*([^.]+)/i);
  if (!m) return ["Restaurants", "Foodie"];
  return m[1]!
    .split(/[,/]/)
    .map((s) => s.trim().replace(/['"]/g, ""))
    .filter((s) => s.length > 1)
    .slice(0, 6);
}

function extractCustomAudienceKeys(recipeId: string): string[] {
  if (recipeId.includes("whatsapp_engagers") || recipeId.includes("page_visitors")) {
    return [recipeId];
  }
  return [];
}

function extractLookalikeKeys(recipeId: string): string[] {
  if (recipeId.includes("lookalike")) return [recipeId];
  return [];
}

function buildNotes(input: BuildInput, archetype: typeof campaignArchetypes[number] | undefined): string[] {
  const notes: string[] = [];
  notes.push(
    `Campaigns are exported in PAUSED status. Review every ad set and ad before un-pausing in Ads Manager.`
  );
  notes.push(
    `Replace <<REPLACE_WITH_YOUR_META_PAGE_ID>> in each ad's object_story_spec.page_id with your Facebook Page ID.`
  );
  notes.push(
    `If your campaign uses CTWA (WhatsApp), update the linked WhatsApp number in Ads Manager — Bustan does not embed it in the JSON.`
  );
  if (input.pixelIdHint) {
    notes.push(`Pixel events: connect your Pixel ${input.pixelIdHint} on each ad set under Tracking.`);
  } else {
    notes.push(
      `For OUTCOME_SALES or OUTCOME_LEADS campaigns, attach your Meta Pixel under each ad set's Tracking section.`
    );
  }
  if (archetype) {
    notes.push(
      `KB benchmarks for this campaign type: CTR ${archetype.benchmarks.ctrPct?.[0] ?? "?"}-${archetype.benchmarks.ctrPct?.[1] ?? "?"}%, CPM AED ${archetype.benchmarks.cpmAed?.[0] ?? "?"}-${archetype.benchmarks.cpmAed?.[1] ?? "?"}, CPA AED ${archetype.benchmarks.cpaAed?.[0] ?? "?"}-${archetype.benchmarks.cpaAed?.[1] ?? "?"}.`
    );
    notes.push(
      `Recommended creative refresh cadence: every 14-21 days. Kill an ad if frequency > 3.5 or CTR drops > 30% week-over-week.`
    );
  }
  return notes;
}
