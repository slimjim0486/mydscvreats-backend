import type { KbMeta } from "./types";

// =============================================================================
// KB METADATA — version, last-verified date, confidence flags, sources
// =============================================================================

export const kbMeta: KbMeta = {
  version: "1.0.0",
  lastVerified: "2026-05-09",
  nextReviewBy: "2026-09-30", // Refresh before Q4 2026 lunar-date confirmations and Q3 platform spec drift
  confidence: {
    platformSpecs: "high",
    benchmarks: "medium",
    culturalRules: "high",
    creativeArchetypes: "high",
  },
  sources: [
    // Track 1 — Platform specs
    { track: 1, title: "Meta Ads Guide" },
    { track: 1, title: "Meta Carousel Ad Specs (AdManage 2026)" },
    { track: 1, title: "FirstPier Instagram Ad Safe Zones 2026" },
    { track: 1, title: "TikTok For Business — Symphony Automation 2026" },
    { track: 1, title: "Snapchat For Business — Ad Formats" },
    { track: 1, title: "Google Ads Help — Asset specs (responsive)" },
    { track: 1, title: "Adamigo Meta Benchmarks 2026" },
    { track: 1, title: "Hovi Digital — Performance Marketing KSA & UAE 2026" },
    { track: 1, title: "Hikmah AI Agency — Meta Ads Cost Dubai 2026" },
    { track: 1, title: "Lebesgue TikTok Benchmarks 2026" },
    { track: 1, title: "Snap For Business — KUDU & HungerStation case studies" },
    { track: 1, title: "PPCChief Restaurants & Food Google Benchmarks 2026" },

    // Track 2 — MENA dynamics
    { track: 2, title: "DataReportal Digital 2026 — UAE / KSA / Lebanon" },
    { track: 2, title: "Snap × Publicis NRG study — KSA shopping" },
    { track: 2, title: "GMI Saudi Arabia & UAE Social Media Statistics" },
    { track: 2, title: "Caterer Middle East — GCC top delivery platforms" },
    { track: 2, title: "Pinsent Masons / Richman — UAE NMA Advertiser Permit" },
    { track: 2, title: "GAMR (Saudi General Authority for Media Regulation)" },
    { track: 2, title: "SFDA — Calorie disclosure rules (effective July 1, 2025)" },
    { track: 2, title: "Yamammi UAE Influencer Rates 2026" },
    { track: 2, title: "Influencer Marketing Hub — Saudi Arabia Guide 2026" },
    { track: 2, title: "Al Jazeera — Ramadan 2026 dates" },
    { track: 2, title: "Al Arabiya — MENA Mother's Day = March 21" },
    { track: 2, title: "Visit Saudi — Founding Day, Saudi National Day" },

    // Track 3 — Creative archetypes
    { track: 3, title: "Otter — 30 Instagram Reels ideas for restaurants 2026" },
    { track: 3, title: "Versacreative — Instagram Reels Marketing 2026 Guide" },
    { track: 3, title: "TikTok For Business — Food Advertising Guide" },
    { track: 3, title: "TikTok Creative Center — F&B creative tips" },
    { track: 3, title: "NPR — Viral cheese pull and chain restaurants" },
    { track: 3, title: "MarketingBlocks — 50+ Viral Hook Templates 2026" },
    { track: 3, title: "Retiplex — 47 Viral Hook Ideas 2026" },
    { track: 3, title: "Phoode — The Steam Effect in Food Photography" },
    { track: 3, title: "AuditSocials — TikTok AI Content Labeling 2026" },
    { track: 3, title: "Krumzi — UGC Complete Guide 2026" },

    // Track 4 — Campaign strategy
    { track: 4, title: "Talabat Q3 2025 results / Annual Report 2024" },
    { track: 4, title: "Servmeco — Ramadan Promotion Ideas for Restaurants" },
    { track: 4, title: "DigiDesire — Ramadan Social Media Campaign UAE 2026" },
    { track: 4, title: "Memob — GCC Consumers During Ramadan 2026" },
    { track: 4, title: "Modern Marketing Institute — Meta Learning Phase 2026" },
    { track: 4, title: "DataAlly / Get-Ryze — Meta CAPI 2026 Setup" },
    { track: 4, title: "GoFoodservice — Restaurant Coupons & Promotions / Circana 2025" },
    { track: 4, title: "MMA Smarties MENA 2025 winners" },
  ],
};

// Operating principles encoded as text — for system prompts.
export const operatingPrinciples = [
  "Country selector drives a hard ruleset for: alcohol, modesty, music gender, calorie display, currency decimals, and dialect.",
  "Date-aware ad calendar auto-suggests creative templates ~21 days before each cultural moment, with auto-shift for next year's lunar dates.",
  "Mother's Day default = March 21, never US date.",
  "Snap KSA placement = mandatory line item for any KSA campaign over a minimum threshold; AR Lens templates available.",
  "Click-to-WhatsApp is the default conversion goal for any UAE/KSA/Qatar/Kuwait independent restaurant campaign unless aggregator-direct.",
  "Influencer license check: if the user adds a creator, prompt for permit/Mawthooq # — store and remind about disclosure.",
  "RTL QA pass before export: scan for mirrored logos, broken phone numbers, mispositioned CTAs, wrong line height.",
  "Khaleeji vs Egyptian vs Levantine vs MSA: based on geo + audience, pre-fill correct dialect; allow override; never default to MSA for Gulf social ad.",
  "No-go list filter: alcohol/pork/gambling/LGBTQ/Quranic/Kaaba imagery suppression with country-specific overrides only.",
  "Currency decimals: enforce 3-decimals for KWD/BHD/OMR/JOD; 2-decimals for AED/SAR/QAR/EGP; USD-default for Lebanon.",
] as const;
