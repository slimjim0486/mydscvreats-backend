import type { CountryRules } from "./types";

// =============================================================================
// COUNTRY-LEVEL RULES — alcohol, modesty, dialect, currency, RTL, clichés
// =============================================================================
// Bustan rule: country selector must drive a hard ruleset. The AI generator
// should never produce content that violates these rules without an explicit
// operator override.

export const countryRules: CountryRules[] = [
  {
    country: "AE",
    currency: "AED",
    decimals: 2,
    alcoholImagery: "licensed_venue_only",
    porkImagery: "never",
    gamblingImagery: "avoid",
    modestyLevel: "moderate",
    primaryDialect: "khaleeji",
    acceptableDialects: ["msa", "khaleeji", "egyptian", "levantine"],
    womenSoloVocalsInAds: "ok",
    calorieDisclosureRequired: false, // Dubai Municipality requires for chains 15+ outlets — operator-specific
    influencerLicenseRegime: {
      authority: "UAE Media Council (NMA)",
      permitName: "Advertiser Permit",
      mandatorySince: "2026-02-01",
    },
    preferredPlatforms: [
      { platform: "instagram", rank: 1, note: "~85% urban 18-34" },
      { platform: "tiktok", rank: 2, note: "Rising, ~70%+ adults" },
      { platform: "whatsapp", rank: 3, note: "85.8% pop-wide" },
      { platform: "snapchat", rank: 4, note: "Strong with young Emirati women" },
      { platform: "facebook", rank: 5, note: "Skews older/expat" },
    ],
    imageryClichesToAvoid: [
      "White-robe-and-keffiyeh men in Western 'thinking businessman' poses",
      "Generic camel-and-desert backdrop for unrelated cuisine",
      "Faux-Khaleeji rhinestone Arabic letters",
      "Gold-on-everything",
      "Fake Bedouin tents in city contexts",
      "'Arabian Nights' Aladdin-coded fantasy",
      "Belly-dancer imagery",
      "Generic spice-souk + brass-coffeepot stock",
    ],
  },
  {
    country: "SA",
    currency: "SAR",
    decimals: 2,
    alcoholImagery: "banned",
    porkImagery: "never",
    gamblingImagery: "banned",
    modestyLevel: "very_modest",
    primaryDialect: "khaleeji",
    acceptableDialects: ["msa", "khaleeji"],
    womenSoloVocalsInAds: "limited", // Snap KSA still skews instrumental/male-vocal for safe coverage
    calorieDisclosureRequired: true, // SFDA mandatory since July 1, 2025
    influencerLicenseRegime: {
      authority: "GAMR (General Authority for Media Regulation)",
      permitName: "Mawthooq License",
      mandatorySince: "2024-01-01",
    },
    preferredPlatforms: [
      { platform: "snapchat", rank: 1, note: "87.7% reach Feb 2025; THE #1 platform" },
      { platform: "tiktok", rank: 2, note: "154% reach of 18+, ~34M users" },
      { platform: "instagram", rank: 3, note: "~73% (18.8M users)" },
      { platform: "whatsapp", rank: 4, note: "Near-universal" },
    ],
    imageryClichesToAvoid: [
      "Mixed-up flags (Saudi-style green takbir on UAE flag)",
      "Generic camel/desert imagery",
      "Faux-Khaleeji aesthetics",
      "Religious imagery in commercial context (Kaaba, mosques as discount backdrop)",
      "Quranic verses in promo creative",
      "Belly-dancer imagery",
      "Hindi/Bollywood music in national-day creative",
    ],
  },
  {
    country: "QA",
    currency: "QAR",
    decimals: 2,
    alcoholImagery: "banned",
    porkImagery: "banned",
    gamblingImagery: "banned",
    modestyLevel: "modest",
    primaryDialect: "khaleeji",
    acceptableDialects: ["msa", "khaleeji"],
    womenSoloVocalsInAds: "limited",
    calorieDisclosureRequired: false,
    preferredPlatforms: [
      { platform: "tiktok", rank: 1, note: "Top app per 2025 Arab survey" },
      { platform: "instagram", rank: 2 },
      { platform: "snapchat", rank: 3, note: "39.2% adult reach" },
      { platform: "whatsapp", rank: 4 },
    ],
    imageryClichesToAvoid: [
      "Generic Gulf clichés",
      "Maroon misuse (Qatar national color is sacred)",
    ],
  },
  {
    country: "KW",
    currency: "KWD",
    decimals: 3, // High-value currency — never drop decimals
    alcoholImagery: "banned",
    porkImagery: "banned",
    gamblingImagery: "banned",
    modestyLevel: "modest",
    primaryDialect: "khaleeji",
    acceptableDialects: ["msa", "khaleeji"],
    womenSoloVocalsInAds: "limited",
    calorieDisclosureRequired: false,
    preferredPlatforms: [
      { platform: "tiktok", rank: 1 },
      { platform: "instagram", rank: 2, note: "84.5% reach" },
      { platform: "snapchat", rank: 3, note: "Highly used by Kuwaiti women" },
      { platform: "whatsapp", rank: 4 },
    ],
    imageryClichesToAvoid: ["Generic Gulf clichés"],
  },
  {
    country: "BH",
    currency: "BHD",
    decimals: 3,
    alcoholImagery: "limited",
    porkImagery: "banned",
    gamblingImagery: "banned",
    modestyLevel: "modest",
    primaryDialect: "khaleeji",
    acceptableDialects: ["msa", "khaleeji"],
    womenSoloVocalsInAds: "ok",
    calorieDisclosureRequired: false,
    preferredPlatforms: [
      { platform: "instagram", rank: 1, note: "95.6% reach" },
      { platform: "tiktok", rank: 2 },
      { platform: "whatsapp", rank: 3 },
    ],
    imageryClichesToAvoid: ["Generic Gulf clichés"],
  },
  {
    country: "OM",
    currency: "OMR",
    decimals: 3,
    alcoholImagery: "limited",
    porkImagery: "banned",
    gamblingImagery: "banned",
    modestyLevel: "modest",
    primaryDialect: "khaleeji",
    acceptableDialects: ["msa", "khaleeji"],
    womenSoloVocalsInAds: "limited",
    calorieDisclosureRequired: false,
    preferredPlatforms: [
      { platform: "youtube", rank: 1, note: "81% Muscat — outlier in GCC" },
      { platform: "instagram", rank: 2, note: "44% Muscat" },
      { platform: "tiktok", rank: 3 },
      { platform: "whatsapp", rank: 4 },
    ],
    imageryClichesToAvoid: ["Disrespectful framing of late Sultan Qaboos", "Generic Gulf clichés"],
  },
  {
    country: "EG",
    currency: "EGP",
    decimals: 2,
    alcoholImagery: "limited", // OK in Cairo cosmopolitan, avoid Upper Egypt
    porkImagery: "avoid",
    gamblingImagery: "avoid",
    modestyLevel: "moderate",
    primaryDialect: "egyptian",
    acceptableDialects: ["msa", "egyptian", "arabizi"],
    womenSoloVocalsInAds: "ok",
    calorieDisclosureRequired: false,
    preferredPlatforms: [
      { platform: "facebook", rank: 1, note: "42M users, dominant for older 30+" },
      { platform: "youtube", rank: 2 },
      { platform: "tiktok", rank: 3, note: "41.3M; crushes under 25" },
      { platform: "instagram", rank: 4, note: "Strong in Cairo upper-middle" },
    ],
    imageryClichesToAvoid: ["Pyramids+camels stock", "Orientalist 'Arabian Nights' framing"],
  },
  {
    country: "JO",
    currency: "JOD",
    decimals: 3,
    alcoholImagery: "permitted", // OK in Amman-targeted; avoid in conservative areas
    porkImagery: "avoid",
    gamblingImagery: "avoid",
    modestyLevel: "moderate",
    primaryDialect: "levantine",
    acceptableDialects: ["msa", "levantine"],
    womenSoloVocalsInAds: "ok",
    calorieDisclosureRequired: false,
    preferredPlatforms: [
      { platform: "youtube", rank: 1 },
      { platform: "tiktok", rank: 2, note: "62.9% adult reach" },
      { platform: "facebook", rank: 3, note: "Still relevant for Amman 30+" },
      { platform: "whatsapp", rank: 4 },
    ],
    imageryClichesToAvoid: ["Generic 'Bedouin tent' stock", "Pyramids/Bedouin clichés"],
  },
  {
    country: "LB",
    currency: "USD", // Most pricing now in USD post-crisis; LBP only for low-end
    decimals: 2,
    alcoholImagery: "permitted",
    porkImagery: "ok_in_context", // OK in Christian-area context
    gamblingImagery: "avoid",
    modestyLevel: "permissive", // Most permissive in Arab world
    primaryDialect: "levantine",
    acceptableDialects: ["msa", "levantine", "arabizi"],
    womenSoloVocalsInAds: "ok",
    calorieDisclosureRequired: false,
    preferredPlatforms: [
      { platform: "facebook", rank: 1, note: "4.87M Dec 2025" },
      { platform: "instagram", rank: 2, note: "Beirut F&B is heavily IG-led" },
      { platform: "tiktok", rank: 3 },
    ],
    imageryClichesToAvoid: ["Stock 'Phoenician/cedar' clichés"],
  },
];

// =============================================================================
// CROSS-COUNTRY RULES — universal MENA suppression list
// =============================================================================

export const universalNoGoList = {
  alwaysSuppressInGcc: [
    "Pork imagery",
    "Alcohol imagery in cross-targeted KSA/Kuwait/Sharjah ads",
    "Gambling/casino references",
    "LGBTQ+ imagery (rainbow flags, same-sex couples in coded contexts)",
    "Quranic verses in commercial/discount creative",
    "Kaaba imagery, mosques as discount backdrop",
    "Prophet/sahaba names on products",
    "Star of David",
    "Bare midriff, thighs, cleavage, tight bodycon (in mass-market)",
    "Mixed unmarried male/female embracing or hand-holding",
    "Children's faces filmed without parent consent",
    "Hijab/niqab women filmed without explicit prior consent",
    "Left hand for eating or serving food",
    "Sole of foot or shoe pointed at camera or food",
    "OK 👌 sign (offensive in parts of MENA)",
  ],
  contextualSuppressions: [
    {
      condition: "country == 'SA' OR cross-target includes SA",
      suppress: ["alcohol_imagery", "women_solo_singing", "non_modest_clothing"],
    },
    {
      condition: "audience == 'family' OR campaign == 'iftar'",
      suppress: ["alcohol_imagery", "club_music", "couples_only_imagery"],
    },
    {
      condition: "month == 'June' AND audience includes MENA",
      suppress: ["rainbow_imagery", "pride_flag_motifs"],
    },
  ],
};

// =============================================================================
// RTL LAYOUT RULES
// =============================================================================

export const rtlLayoutRules = {
  mirror: ["arrows", "chevrons", "navigation indicators", "progress bars", "speech bubble tails"],
  doNotMirror: ["logos", "clocks", "audio/play icons", "phone numbers", "email addresses", "URLs", "photographs of food", "Latin text"],
  arabicLineHeight: { multiplier: 1.7, notes: "1.6-1.8x of Latin (descenders + diacritics)" },
  ctaPosition: "left", // In RTL, primary CTA usually sits on the left (continuing reading direction)
  numberDirection: "ltr", // Arabic numerals 0-9 stay LTR even in RTL text
  commonBugs: [
    "Phone number reverses (+971 50 123 4567 becomes 7654 321 50 179+)",
    "Mirrored logos (cardinal sin)",
    "Arabic punctuation (؟ ، ؛) lost in conversion",
    "Numerals mirrored when they shouldn't be",
  ],
} as const;

// =============================================================================
// DIALECT SELECTION RULES
// =============================================================================

export const dialectRules = {
  selectDialect: (params: {
    country: string;
    audience?: "khaleeji_emirati" | "expat_western" | "expat_arab" | "expat_south_asian" | "tourist" | "mass";
    placement?: "premium" | "casual" | "youth_tiktok";
  }) => {
    const { country, audience = "mass", placement = "casual" } = params;

    // Premium / National Day / Founding Day → Khaleeji or MSA
    if (placement === "premium" && (country === "SA" || country === "AE" || country === "QA" || country === "KW" || country === "BH")) {
      return "khaleeji";
    }
    // Youth TikTok in Levant/Egypt → Arabizi
    if (placement === "youth_tiktok" && (country === "LB" || country === "EG" || country === "JO")) {
      return "arabizi";
    }
    // Egypt mass → Egyptian
    if (country === "EG") return "egyptian";
    // Levant mass → Levantine
    if (country === "LB" || country === "JO") return "levantine";
    // Gulf mass with mixed expat audience → bilingual (Arabic + English)
    if ((country === "AE" || country === "QA") && audience === "expat_western") return "english_first_arabic_subtext";
    // Gulf default → Khaleeji with English subtitle
    return "khaleeji_first_english_subtext";
  },
} as const;

// =============================================================================
// PRICING DISPLAY RULES
// =============================================================================

export const pricingDisplayRules = {
  enforceDecimals: {
    AED: 2,
    SAR: 2,
    QAR: 2,
    EGP: 2,
    KWD: 3, // High-value — never drop
    BHD: 3,
    OMR: 3,
    JOD: 3,
    LBP: 0, // Post-crisis usually displayed in USD
    USD: 2,
  },
  format: {
    AED: { english: "AED 55", arabic: "55 درهم" },
    SAR: { english: "SAR 49", arabic: "49 ريال" },
    QAR: { english: "QAR 49", arabic: "49 ريال" },
    KWD: { english: "KWD 4.500", arabic: "4.500 دينار" },
    BHD: { english: "BHD 5.500", arabic: "5.500 دينار" },
    OMR: { english: "OMR 5.500", arabic: "5.500 ريال" },
    EGP: { english: "EGP 295", arabic: "٢٩٥ ج.م" },
    JOD: { english: "JOD 6.500", arabic: "6.500 دينار" },
    LBP: { english: "$25", arabic: "25$" }, // Post-crisis, Lebanon prices in USD
    USD: { english: "$25", arabic: "25$" },
  },
} as const;
