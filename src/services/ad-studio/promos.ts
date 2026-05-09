import type { PromoMechanic, BundleNamingRule } from "./types";

// =============================================================================
// PROMO MECHANICS — what works for restaurants in MENA / 2026
// =============================================================================

export const promoMechanics: PromoMechanic[] = [
  {
    id: "family_set_price",
    name: "Family-of-4 Set Price (e.g. AED 199 mandi for 4)",
    description: "Highest-converting bundle in UAE/GCC family audiences. Per-person price feels achievable.",
    redemptionPct: [40, 60],
    bestCuisineFits: ["mandi", "mezze", "lebanese", "indian", "khaleeji", "premium_casual"],
    bestFunnelStages: ["bofu"],
    menaSpecificNotes: "UAE/KSA Iftar standard: AED 79-99 per person × 4 = AED 320-400 set price. Naming matters: 'The Sharing Feast' / 'وليمة العائلة' beats '4-Person Combo'.",
  },
  {
    id: "free_dessert_with_mains",
    name: "Free Dessert with Mains",
    description: "Industry's most-redeemed offer. Costs ~AED 8-12, drives 3-item ticket from 2-item norm. Out-performs 10% off (3-8% redemption).",
    redemptionPct: [35, 50],
    bestCuisineFits: ["all", "casual", "premium_casual"],
    bestFunnelStages: ["bofu"],
    menaSpecificNotes: "Birthday-email free-dessert redemption: 47%. ROI 6-10x vs equivalent % discount.",
  },
  {
    id: "second_main_half_off",
    name: "Second Main Half Off",
    description: "Reframed BOGO. Same math as 'BOGO entire meal' but dignified positioning fit for MENA hospitality framing.",
    redemptionPct: [20, 35],
    bestCuisineFits: ["casual", "premium_casual", "burger"],
    worstCuisineFits: ["fine_dining"],
    bestFunnelStages: ["bofu"],
    menaSpecificNotes: "Use this framing instead of 'BOGO entire meal' in MENA — 'BOGO' signals desperation in GCC hospitality framing.",
  },
  {
    id: "bogo_appetizer",
    name: "BOGO Appetizer / Dessert / Drink",
    description: "Limited-scope BOGO works — entire-meal BOGO doesn't. Best for casual/QSR.",
    redemptionPct: [30, 45],
    bestCuisineFits: ["casual", "qsr", "cafe", "dessert"],
    bestFunnelStages: ["bofu"],
  },
  {
    id: "first_order_aed30_off",
    name: "First Order AED 30 Off (Delivery)",
    description: "Acquisition standard for cloud kitchens.",
    redemptionPct: [20, 35],
    bestCuisineFits: ["qsr", "casual"],
    bestFunnelStages: ["bofu"],
  },
  {
    id: "show_story_for_x",
    name: 'Show This Story for [Discount/Free Item]',
    description: "Drives Story sends + foot traffic. Generates UGC. Best validity 48-72 hours.",
    redemptionPct: [8, 15],
    bestCuisineFits: ["casual", "premium_casual"],
    bestFunnelStages: ["bofu"],
    menaSpecificNotes: "Doesn't work in dark stores / pure delivery; physical-presence only.",
  },
  {
    id: "whatsapp_coupon_code",
    name: "WhatsApp Coupon Code",
    description: "UAE-specific gold standard. WhatsApp-dominant culture. Auto-reply with menu PDF + booking calendar.",
    redemptionPct: [25, 45],
    bestCuisineFits: ["all"],
    bestFunnelStages: ["bofu"],
    menaSpecificNotes: "Caption: 'WhatsApp +971 XX XXX XXXX with code IFTAR99 for the AED 99 set.'",
  },
  {
    id: "kids_eat_free",
    name: "Kids Eat Free",
    description: "Family-driver in school holidays. Kids' menu cost is low; main party orders full price.",
    redemptionPct: [25, 40],
    bestCuisineFits: ["casual", "premium_casual"],
    bestFunnelStages: ["bofu"],
    menaSpecificNotes: "Strongest during summer (Jun-Aug) and school holidays.",
  },
  {
    id: "loyalty_after_3_visits",
    name: "After-3-Visits Free Item",
    description: "Retention, not acquisition. Drives saves and bookings.",
    redemptionPct: [15, 30],
    bestCuisineFits: ["casual", "cafe"],
    bestFunnelStages: ["retention"],
  },
  {
    id: "first_50_tables",
    name: "First 50 Tables / First 100 Covers",
    description: "Scarcity converts but credibility-fragile. Best at launch.",
    redemptionPct: [40, 70],
    bestCuisineFits: ["all"],
    bestFunnelStages: ["bofu"],
    menaSpecificNotes: "Use only at genuine launches — chronic 'first 50' framing erodes trust.",
  },
  {
    id: "48_hour_flash",
    name: "48-Hour Flash Sale",
    description: "Works for retargeting; not new-audience.",
    redemptionPct: [25, 40],
    bestCuisineFits: ["all"],
    bestFunnelStages: ["bofu", "retention"],
  },
  {
    id: "influencer_code_attribution",
    name: "Unique Code per Influencer",
    description: "Tracking + trust. Pair with visible CTA in caption.",
    redemptionPct: [15, 35],
    bestCuisineFits: ["all"],
    bestFunnelStages: ["mofu", "bofu"],
    menaSpecificNotes: "UAE/GCC influencer rates: AED 500-10,000+ per post + perf bonuses.",
  },
];

// =============================================================================
// DISCOUNT THRESHOLD RULES BY CUISINE TIER
// =============================================================================

export const discountThresholds = {
  casual_qsr: {
    minLift: { pct: 15 },
    maxBeforeCheap: { pct: 40 },
    preferred: ["first_order_aed30_off", "free_dessert_with_mains", "bogo_appetizer"],
    notes: "AED 15-25 off first order also works",
  },
  mid_tier: {
    aedAovRange: [80, 200],
    minLift: { pct: 20 },
    maxBeforeCheap: { pct: 35 },
    preferred: ["free_dessert_with_mains", "family_set_price", "second_main_half_off"],
  },
  premium: {
    aedAovRange: [250, 500],
    minLift: { pct: 15, type: "complimentary" },
    maxBeforeCheap: { pct: 0 },
    preferred: ["family_set_price", "free_dessert_with_mains"],
    notes: "Use bundling: 'wine pairing included' or 'amuse + dessert included' instead of % discounts.",
  },
  fine_dining: {
    aedAovRange: [500, 9999],
    minLift: { pct: 0 },
    maxBeforeCheap: { pct: 0 },
    preferred: [],
    notes: "NEVER discount mains. Use bundling only ('wine pairing included', 'sommelier menu', 'tasting includes amuse + petit fours').",
  },
} as const;

// =============================================================================
// ESCALATION LADDER — when a channel cools, escalate one rung at a time
// =============================================================================

export const escalationLadder = [
  { rung: 1, mechanic: "10% off" },
  { rung: 2, mechanic: "20% off" },
  { rung: 3, mechanic: "30% off" },
  { rung: 4, mechanic: "Free side" },
  { rung: 5, mechanic: "Free dessert" },
  { rung: 6, mechanic: "BOGO appetizer" },
  { rung: 7, mechanic: "BOGO main / second main half-off" },
  { rung: 8, mechanic: "Free meal with referral" },
  { rung: 9, mechanic: "AED amount-off (e.g., AED 50 off AED 200+)" },
] as const;

export const escalationRules = {
  holdEachRungWeeks: { min: 2, max: 4 },
  warning: "Skipping rungs trains audiences to wait for the deepest discount.",
} as const;

// =============================================================================
// BUNDLE NAMING RULES
// =============================================================================

export const bundleNamingRules: BundleNamingRule[] = [
  {
    context: "ramadan",
    preferredNouns: ["Iftar Spread", "Iftar Feast", "Iftar Gathering", "وليمة الإفطار", "بوفيه إفطار"],
    bannedWords: ["Combo", "Deal", "Package", "Bundle"],
  },
  {
    context: "premium",
    preferredNouns: ["Tasting Journey", "Chef's Selection", "Sommelier Menu", "Discovery Menu"],
    bannedWords: ["Combo", "Deal", "Package", "Bundle", "Set Menu" /* if too budget-coded */],
  },
  {
    context: "family",
    preferredNouns: ["Sharing Feast", "Family Gathering", "وليمة العائلة", "Family Spread", "Family Table"],
    bannedWords: ["Combo", "Deal", "Package", "4-Person Combo"],
  },
  {
    context: "default",
    preferredNouns: ["Spread", "Feast", "Gathering", "Selection", "Menu"],
    bannedWords: ["Combo", "Deal", "Package"],
  },
];

// =============================================================================
// LTO (Limited-Time Offer) RULES
// =============================================================================

export const ltoRules = {
  cadence: { perYear: { min: 6, max: 8 }, weeksBetween: { min: 6, max: 8 } },
  shelfLife: { weeks: { min: 4, max: 6, hardCap: 8 } },
  preTease: { weeks: 2 },
  postArchive: "Don't fully kill — mention 'back by demand' later",
  failureMode: "Beyond 8 weeks = stops feeling 'limited'",
} as const;

// =============================================================================
// REDEMPTION ASSUMPTIONS (Q2 2026)
// =============================================================================

export const redemptionAssumptions = {
  birthday_free_dessert: { redemptionPct: [35, 50], avgPartySize: 3.4 },
  first_order_code_delivery: { redemptionPct: [20, 35] },
  show_story_20_off: { redemptionPct: [8, 15] },
  email_only_15_off: { redemptionPct: [5, 12] },
  last_day_countdown: { redemptionPct: [25, 40] },
  bogo_appetizer: { redemptionPct: [30, 45] },
  whatsapp_coupon: { redemptionPct: [25, 45] },
  influencer_code: { redemptionPct: [15, 35] },
} as const;
