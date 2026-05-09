import type { CinematographyRule, VideoTemplate } from "./types";

// =============================================================================
// FOOD CINEMATOGRAPHY RULES — what separates amateur from performant
// =============================================================================

export const cinematographyRules: CinematographyRule[] = [
  // -------------------------------------------------------------------------
  // LIGHTING
  // -------------------------------------------------------------------------
  { category: "lighting", rule: "Natural side or 45° back light is the default — adds depth and shape; creates the freshness highlight" },
  { category: "lighting", rule: "Always backlight steam — without rim light, steam disappears on camera" },
  { category: "lighting", rule: "Avoid ring lights for hero food — flat, doll-like, kills texture; reserve for talking heads" },
  { category: "lighting", rule: "Avoid harsh top-down spot — causes deep shadows in food crevices, reads 'cheap'" },
  { category: "lighting", rule: "Golden hour through a window > studio — warm temperature feels appetizing" },
  { category: "lighting", rule: "Bounce a white card on the shadow side — lifts shadows by 1 stop without flattening" },
  { category: "lighting", rule: "Phone torch is a last resort — mixes with ambient and looks blue-cast" },

  // -------------------------------------------------------------------------
  // ANGLES BY FOOD TYPE
  // -------------------------------------------------------------------------
  { category: "angle", rule: "90° overhead for pizza, mezze spread, salad bowl, soup, mandi platter — flat/circular foods read best from above", appliesTo: ["pizza", "mezze", "mandi"] },
  { category: "angle", rule: "3/4 (45°) for burger, sandwich, shawarma, layered cake — shows layers and stack", appliesTo: ["burger", "shawarma"] },
  { category: "angle", rule: "Eye-level (0°) for layered drinks, parfaits, ice cream cones, knafeh slice — layers and drips read best", appliesTo: ["dessert", "kunafa"] },
  { category: "angle", rule: "60° for steak, sear marks, knafeh top, charcuterie — surface detail + dimension" },
  { category: "angle", rule: "Macro close eye-level for pasta twirl, cheese pull, sauce drip — texture-driven trigger moments" },

  // -------------------------------------------------------------------------
  // COLOR & SATURATION
  // -------------------------------------------------------------------------
  { category: "color", rule: "Warm color temperature (3200-4500K) feels appetizing" },
  { category: "color", rule: "Slightly punched reds/yellows; resist Hollywood teal-and-orange grade — makes food look fake" },
  { category: "color", rule: "Avoid blue plates, blue garnishes, blue tablecloths — psychologically suppress appetite" },
  { category: "color", rule: "Saturation +5 to +15 is normal; >+20 reads filtered" },
  { category: "color", rule: "Match white balance to the dish's anchor: bread = warm, seafood = neutral, leafy greens = slightly cooler" },

  // -------------------------------------------------------------------------
  // PROPS & SURFACES (by tier)
  // -------------------------------------------------------------------------
  { category: "props", rule: "Premium tier: linen, raw stone, dark walnut, marble surfaces; bare wood, brushed brass cutlery, crystal glassware; off-white ceramic plates with organic edges", appliesTo: ["fine_dining", "premium_casual"] },
  { category: "props", rule: "Casual tier: light oak, butcher block, kraft paper surfaces; black cutlery, mason jars, enamel cups; speckled stoneware plates", appliesTo: ["casual"] },
  { category: "props", rule: "Streetfood tier: newsprint, foil tray, plastic basket, brown paper; bare hands, cheap fork; foil/paper plates", appliesTo: ["streetfood"] },
  { category: "props", rule: "Café/brunch tier: pale marble, terrazzo, light wood; matte-black cutlery, glass carafe; pastel ceramics", appliesTo: ["cafe", "brunch"] },

  // -------------------------------------------------------------------------
  // HANDS-IN-FRAME
  // -------------------------------------------------------------------------
  { category: "hands", rule: "A human hand reaching boosts CTR" },
  { category: "hands", rule: "Clean nails; no plasters; no smudged manicure" },
  { category: "hands", rule: "Remove watches and rings unless on-brand" },
  { category: "hands", rule: "MENA: Always right hand for eating gestures (left hand has impure-hand association)" },
  { category: "hands", rule: "Women's henna-decorated hands fit traditional cuisine" },
  { category: "hands", rule: "Bare male forearm fits streetfood/grill" },

  // -------------------------------------------------------------------------
  // TRIGGER MOMENTS (anchor hooks for opening 1.5 seconds)
  // -------------------------------------------------------------------------
  { category: "trigger_moment", rule: "Cheese pull (mozzarella, kunafa, halloumi, fondue)" },
  { category: "trigger_moment", rule: "Sauce drip / drizzle (tahini, honey, syrup, oil)" },
  { category: "trigger_moment", rule: "Knife slicing into yolk / cake / steak — yolk-break is universal" },
  { category: "trigger_moment", rule: "Pour (chai, coffee, drinks, syrup)" },
  { category: "trigger_moment", rule: "Sizzle on grill / pan" },
  { category: "trigger_moment", rule: "Steam rising — must be backlit" },
  { category: "trigger_moment", rule: "Splash (oil, water, sauce)" },
  { category: "trigger_moment", rule: "Crunch break (samosa, bread, falafel)" },
  { category: "trigger_moment", rule: "Hand reach + pickup" },
  { category: "trigger_moment", rule: "Match-cut reveal (raw → finished)" },

  // -------------------------------------------------------------------------
  // 9:16 COMPOSITION RULES
  // -------------------------------------------------------------------------
  { category: "composition", rule: "Frame at 1080×1920 (9:16) native; never shoot horizontal and crop" },
  { category: "composition", rule: "Top safe zone: top 250 px reserved for Reels username/handle" },
  { category: "composition", rule: "Bottom safe zone: bottom 450 px reserved for caption + sticker UI on TikTok and Reels" },
  { category: "composition", rule: "Place dish on lower-third intersection (around y = 1100-1300 px)" },
  { category: "composition", rule: "Headroom for talent: face at upper-third intersection (y ≈ 600 px)" },
  { category: "composition", rule: "Logo bottom-left at ~100 px from edges (avoids bottom UI; share button is bottom-right)" },
  { category: "composition", rule: "Text overlays: middle 60% of vertical span, never edge-to-edge" },

  // -------------------------------------------------------------------------
  // DISQUALIFIERS (always avoid)
  // -------------------------------------------------------------------------
  { category: "disqualifier", rule: "Dim phone footage (under 100 lux)" },
  { category: "disqualifier", rule: "Blue plates / blue light (suppresses appetite)" },
  { category: "disqualifier", rule: "Wilted herbs as garnish" },
  { category: "disqualifier", rule: "Smudged glassware" },
  { category: "disqualifier", rule: "Motion blur on the hero subject" },
  { category: "disqualifier", rule: "Overexposed whites (loss of texture in cheese, sauce)" },
  { category: "disqualifier", rule: "Visible plastic packaging in foreground" },
  { category: "disqualifier", rule: "Crumbs and sauce smears outside the plate" },
  { category: "disqualifier", rule: "Hot top-light that flattens dimensional food" },
  { category: "disqualifier", rule: "Stock footage in any provenance/origin story (death of trust)" },
];

// =============================================================================
// HERO / COVER FRAME RULES
// =============================================================================

export const heroFrameRules = {
  mustCommunicateInOneSecond: [
    { priority: 1, item: "What dish it is — recognizable in a thumbnail at 1.75×1.75 inches" },
    { priority: 2, item: "A trigger moment — steam, drip, pull, bite, pour, sizzle" },
    { priority: 3, item: "A scale cue — hand, fork, glass; never empty plate" },
    { priority: 4, item: "Restaurant signal — logo at corner, distinctive plateware, branded napkin" },
  ],
} as const;

// =============================================================================
// VIDEO STRUCTURE TEMPLATES
// =============================================================================

export const videoTemplates: VideoTemplate[] = [
  {
    id: "bumper_6s",
    durationSec: 6,
    beats: [
      { fromSec: 0, toSec: 1.5, description: "Hero trigger moment (cheese pull / pour / sizzle)" },
      { fromSec: 1.5, toSec: 4.0, description: "Dish wide reveal + brand text overlay" },
      { fromSec: 4.0, toSec: 6.0, description: "Logo + location end-card" },
    ],
    bestFor: ["tofu"],
    notes: "YouTube bumper, awareness on Meta",
  },
  {
    id: "hook_payoff_cta_15s",
    durationSec: 15,
    beats: [
      { fromSec: 0, toSec: 3.0, description: "Pattern-break hook (visual or text overlay)" },
      { fromSec: 3.0, toSec: 8.0, description: "Build / reveal / story" },
      { fromSec: 8.0, toSec: 12.0, description: "Money shot" },
      { fromSec: 12.0, toSec: 15.0, description: "CTA + logo" },
    ],
    bestFor: ["tofu", "mofu", "bofu"],
    notes: "The default Reels/TikTok ad length",
  },
  {
    id: "mini_story_30s",
    durationSec: 30,
    beats: [
      { fromSec: 0, toSec: 3.0, description: "Problem hook ('Friday brunch is broken')" },
      { fromSec: 3.0, toSec: 8.0, description: "Agitation / context" },
      { fromSec: 8.0, toSec: 22.0, description: "Solution build" },
      { fromSec: 22.0, toSec: 27.0, description: "Money shot" },
      { fromSec: 27.0, toSec: 30.0, description: "CTA + address + logo" },
    ],
    bestFor: ["mofu", "bofu"],
  },
  {
    id: "build_60s",
    durationSec: 60,
    beats: [
      { fromSec: 0, toSec: 5.0, description: "Strong visual hook" },
      { fromSec: 5.0, toSec: 15.0, description: "Setup (origin, chef intro, ingredient sourcing)" },
      { fromSec: 15.0, toSec: 40.0, description: "Process / story body" },
      { fromSec: 40.0, toSec: 55.0, description: "Payoff (finished dish, customer reaction)" },
      { fromSec: 55.0, toSec: 60.0, description: "CTA + logo" },
    ],
    bestFor: ["mofu"],
  },
  {
    id: "long_form_90s",
    durationSec: 90,
    beats: [
      { fromSec: 0, toSec: 8.0, description: "Cinematic hook with title" },
      { fromSec: 8.0, toSec: 30.0, description: "Setup" },
      { fromSec: 30.0, toSec: 70.0, description: "Story development with 2-3 sub-acts" },
      { fromSec: 70.0, toSec: 85.0, description: "Climax / payoff" },
      { fromSec: 85.0, toSec: 90.0, description: "CTA + logo" },
    ],
    bestFor: ["mofu"],
    notes: "YouTube Shorts upper limit",
  },
];

// =============================================================================
// OPENING 3 SECONDS — MANDATORY RULES
// =============================================================================

export const openingThreeSeconds = {
  rules: [
    "Dish, person, or motion VISIBLE in first frame (no fade-from-black for ads)",
    "Audio peaks within 1 second",
    "Text overlay (if any) appears by 0.5 sec",
    "Brand mark in corner from frame 1 (small, not dominant)",
  ],
  avoid: [
    "Logo splash openings",
    "Slow camera pushes",
    "Dialogue intros",
    "Brand reveal as the hook",
  ],
} as const;

// =============================================================================
// MID-ROLL RETENTION SAVES
// =============================================================================

export const midRollSaves = [
  "Sudden zoom-in on dish",
  "Whip-pan cut",
  "Title card / number ('3/5')",
  "New character/voice introduced",
  "Sound effect punch (knife click, sizzle pop)",
] as const;

// =============================================================================
// LOOP-BAIT ENDINGS
// =============================================================================

export const loopBaitRules = {
  goal: "Match first frame to last frame so viewer doesn't notice the loop",
  trick: "End on the same trigger moment that opened the video",
  benefit: "Loops count as completion in TikTok/Reels algorithm",
} as const;

// =============================================================================
// END CARD STANDARDS
// =============================================================================

export const endCardRules = {
  durationSec: { min: 2, max: 3 },
  elements: [
    "Logo center or top-third",
    "Address in 1 line",
    "CTA in 1 line ('Reserve via WhatsApp')",
    "Single trending sound bed underneath",
    "Brand color background or last money shot frozen",
  ],
} as const;
