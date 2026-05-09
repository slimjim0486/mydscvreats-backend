import type { AudienceRecipe } from "./types";

// =============================================================================
// AUDIENCE TARGETING RECIPES — copy-pasteable for restaurants in MENA / 2026
// =============================================================================

export const audienceRecipes: AudienceRecipe[] = [
  // ---------------------------------------------------------------------------
  // META — 5 saved audiences for restaurants
  // ---------------------------------------------------------------------------
  {
    id: "meta_geo_5km_foodie",
    platform: "meta",
    name: "5km Geo-Fence Foodie",
    setup: "Geo: 5km radius around branch. Age 22-50. Detailed targeting: 'Restaurants' interest + 'Foodie' + 1 cuisine match. Languages: English + Arabic.",
    bestFor: ["tofu", "mofu"],
    scalingNotes: "Expand to 8km if CPM rises; 3km in dense Marina/JLT/Riyadh boulevard.",
    applicableCountries: ["AE", "SA", "QA", "KW", "BH", "OM", "EG", "JO", "LB"],
  },
  {
    id: "meta_lookalike_whatsapp",
    platform: "meta",
    name: "Lookalike of WhatsApp Engagers",
    setup: "Source: Custom audience of WhatsApp message senders 90d. Lookalike 1-3% UAE.",
    bestFor: ["bofu"],
    scalingNotes: "Start 1%, scale to 3% only after 50+ conversions/week. Combine with retargeting layer.",
    applicableCountries: ["AE", "SA", "QA", "KW", "BH", "OM"],
  },
  {
    id: "meta_lookalike_page_visitors",
    platform: "meta",
    name: "Lookalike of Page Visitors (28d)",
    setup: "Source: Pixel + CAPI page-visit event 28d. Lookalike 1-2% UAE.",
    bestFor: ["bofu"],
    scalingNotes: "Combine with retargeting layer for full BOFU stack.",
    applicableCountries: ["AE", "SA", "QA", "KW", "BH", "OM"],
  },
  {
    id: "meta_cuisine_interest_foodies",
    platform: "meta",
    name: "Cuisine-Interest Detail Foodies",
    setup: "Detailed targeting: [cuisine name] + interest in 2+ food publications (Time Out Dubai, FACT, Khaleej Times Food). Age 28-45.",
    bestFor: ["tofu", "mofu"],
    scalingNotes: "Layer with geo for multi-location chains.",
    applicableCountries: ["AE", "QA", "BH"],
  },
  {
    id: "meta_video_viewers_75pct",
    platform: "meta",
    name: "Video Viewers 75%+ Last 28 Days",
    setup: "Custom audience: video views ≥75% on any campaign 28d.",
    bestFor: ["mofu", "bofu"],
    scalingNotes: "Highest-CVR retargeting pool — scale spend aggressively here.",
    applicableCountries: ["AE", "SA", "QA", "KW", "BH", "OM", "EG", "JO", "LB"],
  },
  {
    id: "meta_geo_delivery_zone",
    platform: "meta",
    name: "Delivery Zone Geo-Fence",
    setup: "Geo by delivery zone (3-5km drive radius), peak-hour day-parting (lunch + dinner peaks).",
    bestFor: ["bofu"],
    applicableCountries: ["AE", "SA", "QA", "KW", "BH", "OM"],
  },
  {
    id: "meta_lookalike_repeat_orderers",
    platform: "meta",
    name: "Lookalike of Repeat Orderers",
    setup: "Source: Custom audience of past customers with 2+ orders. Lookalike 1-3%.",
    bestFor: ["bofu"],
    applicableCountries: ["AE", "SA", "QA", "KW", "BH", "OM"],
  },
  {
    id: "meta_business_district_geo",
    platform: "meta",
    name: "Business District Geo (Catering)",
    setup: "Geo: business districts (Marina, JLT, BB, DIFC, Sheikh Zayed Rd; Riyadh KAFD; Doha West Bay). Age 28-50. Interest: office events.",
    bestFor: ["mofu", "bofu"],
    applicableCountries: ["AE", "SA", "QA"],
  },
  {
    id: "meta_hnw_neighborhoods",
    platform: "meta",
    name: "High-Net-Worth Neighborhoods (Premium)",
    setup: "Geo: Emirates Hills, Palm, Saadiyat, AlUla, Jumeirah Bay, Riyadh Diplomatic Quarter, Doha Pearl. Age 35-65, English+Arabic, lookalike of past CC-spend >AED 800/visit.",
    bestFor: ["bofu"],
    applicableCountries: ["AE", "SA", "QA"],
  },
  {
    id: "meta_per_location_geo_fence",
    platform: "meta",
    name: "Per-Location Geo-Fence (Multi-Location)",
    setup: "Geo-fenced ad sets per location (3-5km radius each), with chain-level brand layer above. Use Dynamic Creative with location asset feed.",
    bestFor: ["tofu", "mofu", "bofu"],
    scalingNotes: "Add per-emirate sensitivities: Sharjah = no alcohol creative, RAK/Fujairah = lower CPMs.",
    applicableCountries: ["AE", "SA"],
  },
  {
    id: "meta_lookalike_creator_engagers",
    platform: "meta",
    name: "Lookalike of Creator Engagers",
    setup: "Source: Custom audience of users who engaged with whitelisted creator content. LAL 1-3%.",
    bestFor: ["tofu", "mofu"],
    applicableCountries: ["AE", "SA", "QA"],
  },

  // ---------------------------------------------------------------------------
  // TIKTOK — 5 saved audiences
  // ---------------------------------------------------------------------------
  {
    id: "tiktok_uae_foodies",
    platform: "tiktok",
    name: "UAE Foodies 18-44",
    setup: "Geo: UAE. Interest: Food & Drink, Restaurants, Recipes. Age 18-44.",
    bestFor: ["tofu"],
    applicableCountries: ["AE"],
  },
  {
    id: "tiktok_spark_engagers_lal",
    platform: "tiktok",
    name: "Spark Ad Engagers Lookalike",
    setup: "Source: TikTok video engagers 60d. LAL 1-3% UAE.",
    bestFor: ["mofu"],
    applicableCountries: ["AE", "SA", "QA"],
  },
  {
    id: "tiktok_hashtag_affinity",
    platform: "tiktok",
    name: "Hashtag Affinity Layer",
    setup: "UAE + Hashtag affinity: #DubaiFoodie #UAEFood #DubaiEats #foodtok",
    bestFor: ["tofu"],
    applicableCountries: ["AE"],
  },
  {
    id: "tiktok_pixel_visitors",
    platform: "tiktok",
    name: "Past Website Visitors Retargeting",
    setup: "TikTok pixel: page-visit 30d.",
    bestFor: ["bofu"],
    applicableCountries: ["AE", "SA", "QA", "KW", "BH", "OM", "EG", "JO", "LB"],
  },
  {
    id: "tiktok_cuisine_neighborhood",
    platform: "tiktok",
    name: "Cuisine + Neighborhood Combo",
    setup: "UAE + Interest [cuisine] + topic: Dubai/Marina/Downtown.",
    bestFor: ["bofu"],
    applicableCountries: ["AE"],
  },

  // ---------------------------------------------------------------------------
  // SNAPCHAT — KSA-heavy recipes
  // ---------------------------------------------------------------------------
  {
    id: "snapchat_ksa_foodies",
    platform: "snapchat",
    name: "KSA Foodies 18-34",
    setup: "Geo: KSA-wide. Interest: Food Delivery, Restaurants. Age 18-34 (Snap's strong cohort).",
    bestFor: ["tofu"],
    applicableCountries: ["SA"],
  },
  {
    id: "snapchat_ksa_branch_geo",
    platform: "snapchat",
    name: "Riyadh + Jeddah Branch Geo",
    setup: "Geo-fence 5km around each branch. Demographic: age, gender, marital status, parental, household income.",
    bestFor: ["bofu"],
    applicableCountries: ["SA"],
  },
  {
    id: "snapchat_ksa_family",
    platform: "snapchat",
    name: "KSA Family Graph (Iftar / Eid)",
    setup: "KSA + Language Arabic + Lifestyle: Family. Age 28-50.",
    bestFor: ["bofu"],
    applicableCountries: ["SA"],
  },
  {
    id: "snapchat_ksa_ar_lal",
    platform: "snapchat",
    name: "AR-Lens Engagers Lookalike",
    setup: "Source: Lens engagement audience. LAL 1-3% KSA.",
    bestFor: ["mofu"],
    applicableCountries: ["SA"],
  },
  {
    id: "snapchat_ksa_app_lal",
    platform: "snapchat",
    name: "App-Installer Lookalike",
    setup: "Source: app-event audiences (food-delivery app integration). LAL 1-3% KSA.",
    bestFor: ["bofu"],
    applicableCountries: ["SA"],
  },

  // ---------------------------------------------------------------------------
  // GOOGLE — search keywords + PMax recipes
  // ---------------------------------------------------------------------------
  {
    id: "google_search_cuisine_near_me",
    platform: "google",
    name: "Cuisine + Near-Me Keywords",
    setup: 'Keywords: "[cuisine] restaurant near me", "best [cuisine] Dubai", Arabic equivalents "أفضل مطعم [نوع المطبخ] دبي".',
    bestFor: ["bofu"],
    applicableCountries: ["AE", "SA", "QA", "KW", "BH", "OM"],
  },
  {
    id: "google_search_iftar_brunch",
    platform: "google",
    name: "Seasonal Search Keywords",
    setup: 'Keywords: "iftar [neighborhood]", "إفطار [الحي]", "brunch Friday Dubai", "suhoor Riyadh".',
    bestFor: ["bofu"],
    applicableCountries: ["AE", "SA", "QA", "KW", "BH", "OM"],
  },
  {
    id: "google_search_brand_defense",
    platform: "google",
    name: "Brand Defense + Competitor Terms",
    setup: 'Keywords: own brand + competitor brand defense ("[competitor name] alternative"). Pin brand-name headline to position 1.',
    bestFor: ["bofu"],
    applicableCountries: ["AE", "SA", "QA", "KW", "BH", "OM", "EG", "JO", "LB"],
  },
  {
    id: "google_pmax_in_market_dining",
    platform: "google",
    name: "PMax: In-Market Dining + Customer Match",
    setup: "In-market segments: Restaurants, Food Delivery, Dining Out. Audience signal: email list of past customers + custom intent (recent searchers of competitor restaurants in 5km).",
    bestFor: ["mofu", "bofu"],
    applicableCountries: ["AE", "SA", "QA", "KW", "BH", "OM"],
  },
  {
    id: "google_search_corporate_catering",
    platform: "google",
    name: "Corporate Catering Keywords",
    setup: 'Keywords: "private dining Dubai", "catering Dubai office", "corporate iftar catering", "office lunch delivery".',
    bestFor: ["mofu", "bofu"],
    applicableCountries: ["AE", "SA"],
  },

  // ---------------------------------------------------------------------------
  // CUSTOM (POS / WhatsApp / Email driven)
  // ---------------------------------------------------------------------------
  {
    id: "custom_birthday_audience",
    platform: "meta",
    name: "Birthday Custom Audience",
    setup: "Custom audience of past guests with birthday data (collected via Bustan reservation form + WhatsApp opt-in). Trigger 7 days before birthday.",
    bestFor: ["retention"],
    applicableCountries: ["AE", "SA", "QA", "KW", "BH", "OM"],
  },
  {
    id: "custom_dormant_90day",
    platform: "meta",
    name: "Dormant 90-Day Customers",
    setup: "Custom audience: past customers, last order/visit > 90 days ago. Layer 'active in past 7d' exclusion.",
    bestFor: ["retention"],
    applicableCountries: ["AE", "SA", "QA", "KW", "BH", "OM"],
  },
  {
    id: "custom_past_customers",
    platform: "meta",
    name: "Past Customers Retargeting",
    setup: "Custom audience: all past purchasers/order placers from POS + WhatsApp + Talabat/Careem CSV uploads.",
    bestFor: ["bofu", "retention"],
    applicableCountries: ["AE", "SA", "QA", "KW", "BH", "OM"],
  },
  {
    id: "linkedin_office_managers",
    platform: "google", // Note: LinkedIn handled separately; this is a placeholder
    name: "LinkedIn Office Managers (UAE)",
    setup: "LinkedIn: HR/Office Mgrs/Admin Mgrs in Dubai/AD/Sharjah, company size 50-500.",
    bestFor: ["bofu"],
    applicableCountries: ["AE", "SA"],
  },
];

// =============================================================================
// COMBINATION RULES
// =============================================================================

export const audienceCombinationRules = {
  combineWhen: [
    { combo: "retargeting + lookalike", reason: "Compounds intent without forcing exclusion" },
    { combo: "geo-fence + interest", reason: "Increases relevance for local restaurants" },
  ],
  keepSeparateWhen: [
    { reason: "brand-defense vs cold acquisition — very different bid logic" },
    { reason: "delivery zones across cities — separate budgeting" },
  ],
  alwaysExclude: ["past-purchasers from acquisition campaigns"],
} as const;
