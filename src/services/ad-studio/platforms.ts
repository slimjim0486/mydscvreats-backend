import type { PlatformFormat, PlatformBenchmarks } from "./types";

// =============================================================================
// PLATFORM FORMAT SPECS — Q2 2026
// =============================================================================
//
// Master rule: 9:16 at 1080×1920 is the universal default. 4:5 is the only
// meaningful alternative for Meta Feed. 1:1 only for carousels and PMax.
// Always design with sound-off support (burned-in captions) but optimize sound
// for TikTok and Snap (sound-on dominant).

export const platformFormats: PlatformFormat[] = [
  // ---------------------------------------------------------------------------
  // META — INSTAGRAM + FACEBOOK
  // ---------------------------------------------------------------------------
  {
    id: "meta_feed",
    platform: "meta",
    surface: "Feed (Image & Video)",
    aspectRatios: ["1:1", "4:5", "16:9"],
    recommendedPx: { width: 1080, height: 1350 }, // 4:5 best on mobile
    minPx: { width: 600, height: 600 },
    maxVideoSeconds: 14400, // 240 min — but 60s recommended
    minVideoSeconds: 1,
    recommendedVideoSeconds: { min: 15, max: 30 },
    maxFileSizeMb: 4096,
    fileTypes: ["JPG", "PNG", "MP4", "MOV"],
    characterLimits: [
      { field: "headline", max: 40, notes: "FB only; IG auto-truncates" },
      { field: "primary_text", max: 125, truncatedAt: 125, notes: "Visible before 'See more'" },
      { field: "description", max: 25, notes: "FB only" },
    ],
    ctaButtons: ["Order Now", "Book Now", "Send Message", "Learn More", "Get Offer", "Call Now", "Reserve"],
    placement: "Facebook Feed, Instagram Feed",
    soundDefault: "sound_off",
    captionsRequired: true,
  },
  {
    id: "meta_reels",
    platform: "meta",
    surface: "Reels Ads (FB + IG)",
    aspectRatios: ["9:16"],
    recommendedPx: { width: 1080, height: 1920 },
    minPx: { width: 500, height: 888 },
    maxVideoSeconds: 90,
    minVideoSeconds: 1,
    recommendedVideoSeconds: { min: 15, max: 30 },
    maxFileSizeMb: 4096,
    fileTypes: ["MP4", "MOV"],
    safeZone: {
      topPx: 270,
      bottomPx: 670,
      leftPx: 65,
      rightPx: 65,
      notes: "Top 270px hidden behind profile/sponsored label; bottom 670px (~35%) hidden behind CTA, caption, audio dock",
    },
    characterLimits: [
      { field: "headline", max: 40 },
      { field: "primary_text", max: 72, notes: "Truncated more aggressively in Reels than Feed" },
    ],
    ctaButtons: ["Order Food", "Reserve", "Get Directions", "Send WhatsApp Message", "Order Now", "Book Now"],
    placement: "Reels feed (FB + IG)",
    soundDefault: "sound_off",
    captionsRequired: true,
    notes: ["Hook in first 1.5 sec — attention curves shifted earlier in 2025-26", "Reels 30% lower CPM than Feed in MENA"],
  },
  {
    id: "meta_stories",
    platform: "meta",
    surface: "Stories (FB + IG)",
    aspectRatios: ["9:16"],
    recommendedPx: { width: 1080, height: 1920 },
    minPx: { width: 1080, height: 1920 },
    maxVideoSeconds: 120,
    minVideoSeconds: 1,
    recommendedVideoSeconds: { min: 5, max: 15 },
    maxFileSizeMb: 4096,
    fileTypes: ["JPG", "PNG", "MP4", "MOV"],
    safeZone: {
      topPx: 250,
      bottomPx: 340,
      notes: "Top 250px reserved for profile, bottom 340px reserved for swipe-up/CTA UI",
    },
    characterLimits: [
      { field: "headline", max: 40 },
      { field: "primary_text", max: 125 },
    ],
    ctaButtons: ["Order Food", "Reserve", "Get Directions", "Send WhatsApp Message"],
    placement: "Stories tray (FB + IG)",
    soundDefault: "sound_off",
    captionsRequired: true,
    notes: ["IG Stories beat FB Feed by 61% CTR for food in MENA"],
  },
  {
    id: "meta_carousel",
    platform: "meta",
    surface: "Carousel (FB + IG)",
    aspectRatios: ["1:1", "4:5", "1.91:1"],
    recommendedPx: { width: 1080, height: 1080 },
    minPx: { width: 600, height: 600 },
    maxVideoSeconds: 14400,
    minVideoSeconds: 1,
    maxFileSizeMb: 4096,
    fileTypes: ["JPG", "PNG", "MP4", "MOV"],
    characterLimits: [
      { field: "headline", max: 45, notes: "Per card; cuts off after ~45" },
      { field: "primary_text", max: 125, notes: "One shared, above carousel" },
      { field: "description", max: 18, notes: "Per card; often suppressed on mobile" },
    ],
    ctaButtons: ["Order Now", "Book Now", "Learn More", "Send WhatsApp Message"],
    placement: "Feed (FB + IG)",
    soundDefault: "sound_off",
    captionsRequired: false,
    notes: ["2-10 cards. 5-card story arc is the gold standard. 70% of viewers don't swipe past card 1 — lead with money shot"],
  },
  {
    id: "meta_ctwa",
    platform: "meta",
    surface: "Click-to-WhatsApp Ad",
    aspectRatios: ["9:16", "1:1", "4:5"],
    recommendedPx: { width: 1080, height: 1920 },
    fileTypes: ["JPG", "PNG", "MP4", "MOV"],
    characterLimits: [
      { field: "headline", max: 40 },
      { field: "primary_text", max: 125 },
      { field: "description", max: 25 },
      { field: "greeting_message", max: 600, notes: "Auto-loaded into chat on tap" },
    ],
    ctaButtons: ["Send WhatsApp Message"],
    placement: "Inherits from underlying Meta placement (Feed/Reels/Stories)",
    soundDefault: "sound_off",
    captionsRequired: true,
    notes: [
      "72-hour free conversation window after CTWA click — substantial economic advantage in MENA",
      "Greeting message must be in customer's likely language; generate Arabic + English variants",
      "30-50% lower CPC than landing-page ads in UAE/KSA per agency reports",
    ],
  },

  // ---------------------------------------------------------------------------
  // TIKTOK
  // ---------------------------------------------------------------------------
  {
    id: "tiktok_in_feed",
    platform: "tiktok",
    surface: "In-Feed Ad (For You)",
    aspectRatios: ["9:16", "1:1", "16:9"],
    recommendedPx: { width: 1080, height: 1920 },
    minPx: { width: 540, height: 960 },
    maxVideoSeconds: 60,
    minVideoSeconds: 5,
    recommendedVideoSeconds: { min: 9, max: 15 },
    maxFileSizeMb: 500,
    fileTypes: ["MP4", "MOV", "MPEG", "3GP", "AVI"],
    safeZone: {
      topPx: 130,
      bottomPx: 484,
      notes: "Top 130px = creator profile/sponsored label; bottom 484px = caption + CTA + music name",
    },
    characterLimits: [
      { field: "brand_name", max: 20 },
      { field: "caption", max: 100, notes: "12+ recommended for performance" },
    ],
    ctaButtons: ["Shop Now", "Learn More", "Sign Up", "Order Now", "Book Now", "Get Quote", "Watch More"],
    placement: 'TikTok "For You" feed',
    soundDefault: "sound_on",
    captionsRequired: true,
    notes: ["Sound-on critical — 90%+ users have sound on", "Trending audio: refresh weekly", "Native/raw outperforms polished by 25-40%"],
  },
  {
    id: "tiktok_spark",
    platform: "tiktok",
    surface: "Spark Ad (boosted creator post)",
    aspectRatios: ["9:16"],
    recommendedPx: { width: 1080, height: 1920 },
    maxVideoSeconds: 600, // Up to 10 min for some accounts
    minVideoSeconds: 1,
    recommendedVideoSeconds: { min: 9, max: 15 },
    fileTypes: ["MP4", "MOV"],
    characterLimits: [
      { field: "caption", max: 4000, notes: "Inherits original caption; no override" },
    ],
    ctaButtons: ["Shop Now", "Learn More", "Order Now", "Book Now"],
    placement: 'TikTok "For You" feed (taps through to creator profile)',
    soundDefault: "sound_on",
    captionsRequired: true,
    notes: ["30-50% cheaper CPC than In-Feed", "Whitelist creator handles for 30-60 days for best results"],
  },
  {
    id: "tiktok_topview",
    platform: "tiktok",
    surface: "TopView (full-screen takeover)",
    aspectRatios: ["9:16"],
    recommendedPx: { width: 1080, height: 1920 },
    minPx: { width: 540, height: 960 },
    maxVideoSeconds: 60,
    minVideoSeconds: 5,
    maxFileSizeMb: 500,
    fileTypes: ["MP4", "MOV"],
    safeZone: { topPx: 130, bottomPx: 484 },
    characterLimits: [{ field: "caption", max: 100 }],
    ctaButtons: ["Shop Now", "Learn More", "Order Now", "Book Now"],
    placement: "Full-screen takeover when user opens TikTok",
    soundDefault: "sound_on",
    captionsRequired: true,
  },

  // ---------------------------------------------------------------------------
  // SNAPCHAT — Critical for KSA restaurant marketing
  // ---------------------------------------------------------------------------
  {
    id: "snapchat_snap_ad",
    platform: "snapchat",
    surface: "Single Image / Video Ad (Snap Ad)",
    aspectRatios: ["9:16"],
    recommendedPx: { width: 1080, height: 1920 },
    minPx: { width: 720, height: 1280 },
    maxVideoSeconds: 180,
    minVideoSeconds: 3,
    recommendedVideoSeconds: { min: 5, max: 6 },
    maxFileSizeMb: 1024,
    fileTypes: ["MP4", "MOV", "JPG", "PNG"],
    safeZone: { topPx: 150, bottomPx: 150, notes: "No logo, text, disclaimer in those zones" },
    characterLimits: [
      { field: "brand_name", max: 25 },
      { field: "headline", max: 34, notes: "25-28 typical, 34 max" },
    ],
    ctaButtons: ["Order Now", "Book Now", "Watch", "Install Now", "Sign Up", "Apply Now", "More"],
    placement: "Between Stories, on Discover, in Spotlight",
    soundDefault: "sound_on",
    captionsRequired: true,
    notes: ["Snapchat reaches 87.7% of Saudis 13+ — KSA's #1 platform", "AR Lens integration boosts CTR 2-3x", "KSA Arabic-first creative outperforms English by 30-40%"],
  },
  {
    id: "snapchat_story_ad",
    platform: "snapchat",
    surface: "Story Ad (Discover branded tile)",
    aspectRatios: ["9:16"],
    recommendedPx: { width: 1080, height: 1920 },
    minPx: { width: 720, height: 1280 },
    maxVideoSeconds: 180,
    minVideoSeconds: 3,
    maxFileSizeMb: 1024,
    fileTypes: ["MP4", "MOV", "JPG", "PNG"],
    safeZone: { topPx: 150, bottomPx: 150 },
    characterLimits: [
      { field: "brand_name", max: 25, notes: "Discover tile" },
      { field: "headline", max: 34, notes: "Per-card" },
    ],
    ctaButtons: ["Order Now", "Book Now", "Watch", "More"],
    placement: "Discover feed (3-20 cards)",
    soundDefault: "sound_on",
    captionsRequired: true,
  },
  {
    id: "snapchat_ar_lens",
    platform: "snapchat",
    surface: "Sponsored AR Lens",
    aspectRatios: ["9:16"],
    recommendedPx: { width: 1080, height: 1920 },
    maxFileSizeMb: 8,
    fileTypes: ["Lens Studio package"],
    characterLimits: [
      { field: "brand_name", max: 25 },
      { field: "headline", max: 34 },
    ],
    ctaButtons: ["Order Now", "Book Now", "Shop Now"],
    placement: "Camera Lens carousel; swipe-to-CTA after capture",
    soundDefault: "sound_on",
    captionsRequired: false,
    notes: ["85% of KSA + UAE Snapchatters engage with AR daily", "Highest engagement-per-impression of any Snap format"],
  },
  {
    id: "snapchat_filter",
    platform: "snapchat",
    surface: "Geo / Audience Filter",
    aspectRatios: ["9:16"],
    recommendedPx: { width: 1080, height: 1920 },
    maxFileSizeMb: 0.3, // 300KB
    fileTypes: ["PNG (transparent)"],
    safeZone: { topPx: 150, bottomPx: 150, notes: "Center 25% should be empty (subject's face)" },
    characterLimits: [],
    ctaButtons: [],
    placement: "After taking a Snap",
    soundDefault: "sound_off",
    captionsRequired: false,
  },
  {
    id: "snapchat_spotlight",
    platform: "snapchat",
    surface: "Spotlight Ad (TikTok-style feed)",
    aspectRatios: ["9:16"],
    recommendedPx: { width: 1080, height: 1920 },
    maxVideoSeconds: 60,
    minVideoSeconds: 5,
    maxFileSizeMb: 1024,
    fileTypes: ["MP4", "MOV"],
    safeZone: { topPx: 150, bottomPx: 150 },
    characterLimits: [
      { field: "brand_name", max: 25 },
      { field: "headline", max: 34 },
    ],
    ctaButtons: ["Order Now", "Book Now", "Watch", "More"],
    placement: "Spotlight feed",
    soundDefault: "sound_on",
    captionsRequired: true,
  },
  {
    id: "snapchat_collection",
    platform: "snapchat",
    surface: "Collection Ad",
    aspectRatios: ["9:16"],
    recommendedPx: { width: 1080, height: 1920 },
    maxVideoSeconds: 180,
    minVideoSeconds: 3,
    maxFileSizeMb: 1024,
    fileTypes: ["MP4", "MOV", "JPG", "PNG"],
    safeZone: { topPx: 150, bottomPx: 150 },
    characterLimits: [
      { field: "brand_name", max: 25 },
      { field: "headline", max: 34 },
    ],
    ctaButtons: ["Shop Now", "Order Now"],
    placement: "Between Stories",
    soundDefault: "sound_on",
    captionsRequired: true,
    notes: ["Hero 9:16 + 4 product tiles (160×160 each)"],
  },

  // ---------------------------------------------------------------------------
  // GOOGLE
  // ---------------------------------------------------------------------------
  {
    id: "google_search",
    platform: "google",
    surface: "Search (Responsive Search Ad + AI Max)",
    aspectRatios: [],
    recommendedPx: { width: 0, height: 0 },
    fileTypes: [],
    characterLimits: [
      { field: "headline", max: 30, notes: "3-15 headlines" },
      { field: "long_headline", max: 90, notes: "1-5 long headlines for PMax/DemandGen assets" },
      { field: "description", max: 90, notes: "2-4 descriptions" },
      { field: "path", max: 15, notes: "Path 1 / Path 2" },
    ],
    ctaButtons: [],
    placement: "Google Search results",
    soundDefault: "sound_off",
    captionsRequired: false,
    notes: ["Use Arabic + English headline pairs in MENA", "AI Max for Search out of beta March 2026 — mixed real-world results"],
  },
  {
    id: "google_pmax",
    platform: "google",
    surface: "Performance Max (image + video)",
    aspectRatios: ["1:1", "1.91:1", "4:5", "4:1", "9:16", "16:9"],
    recommendedPx: { width: 1200, height: 1200 }, // Square baseline
    minPx: { width: 300, height: 300 },
    maxVideoSeconds: 10800, // 3 hours technically, 15-60s recommended
    minVideoSeconds: 10,
    recommendedVideoSeconds: { min: 15, max: 60 },
    maxFileSizeMb: 5,
    fileTypes: ["JPG", "PNG", "MP4", "MOV"],
    characterLimits: [
      { field: "headline", max: 30, notes: "1-15 headlines" },
      { field: "long_headline", max: 90, notes: "1-5" },
      { field: "description", max: 90, notes: "1-5" },
      { field: "brand_name", max: 25 },
    ],
    ctaButtons: ["Shop Now", "Order Now", "Book Now", "Learn More"],
    placement: "Google Search, YouTube, Display, Discover, Maps, Gmail",
    soundDefault: "sound_off",
    captionsRequired: true,
    notes: ["Always upload a real 9:16 video — auto-generated quality is mediocre", "30+ conversions/30 days minimum for full optimization"],
  },
  {
    id: "google_demand_gen",
    platform: "google",
    surface: "Demand Gen (image, video, carousel)",
    aspectRatios: ["1:1", "1.91:1", "4:5", "9:16", "16:9"],
    recommendedPx: { width: 1200, height: 1200 },
    fileTypes: ["JPG", "PNG", "MP4", "MOV"],
    minVideoSeconds: 10,
    characterLimits: [
      { field: "headline", max: 40, notes: "5 headlines" },
      { field: "long_headline", max: 90, notes: "1" },
      { field: "description", max: 90, notes: "5" },
    ],
    ctaButtons: ["Shop Now", "Order Now", "Book Now"],
    placement: "Discover feed, Gmail, YouTube In-Feed",
    soundDefault: "sound_off",
    captionsRequired: true,
  },

  // ---------------------------------------------------------------------------
  // YOUTUBE
  // ---------------------------------------------------------------------------
  {
    id: "youtube_in_stream",
    platform: "youtube",
    surface: "Skippable in-stream (TrueView)",
    aspectRatios: ["16:9", "9:16", "1:1"],
    recommendedPx: { width: 1920, height: 1080 },
    maxVideoSeconds: 360,
    minVideoSeconds: 12,
    recommendedVideoSeconds: { min: 15, max: 30 },
    fileTypes: ["MP4", "MOV"],
    characterLimits: [
      { field: "headline", max: 15 },
      { field: "description", max: 90 },
    ],
    ctaButtons: ["Shop Now", "Order Now", "Visit Site", "Learn More", "Sign Up"],
    placement: "Pre-roll/mid-roll on YouTube videos",
    soundDefault: "sound_on",
    captionsRequired: true,
  },
  {
    id: "youtube_bumper",
    platform: "youtube",
    surface: "Bumper Ad (non-skippable)",
    aspectRatios: ["16:9", "9:16", "1:1"],
    recommendedPx: { width: 1920, height: 1080 },
    maxVideoSeconds: 6,
    minVideoSeconds: 6,
    fileTypes: ["MP4", "MOV"],
    characterLimits: [
      { field: "headline", max: 15 },
      { field: "description", max: 15 },
    ],
    ctaButtons: ["Shop Now", "Order Now", "Visit Site"],
    placement: "Pre-roll/mid-roll",
    soundDefault: "sound_on",
    captionsRequired: true,
  },
  {
    id: "youtube_shorts",
    platform: "youtube",
    surface: "YouTube Shorts ad",
    aspectRatios: ["9:16"],
    recommendedPx: { width: 1080, height: 1920 },
    minPx: { width: 720, height: 1280 },
    maxVideoSeconds: 180,
    minVideoSeconds: 1,
    recommendedVideoSeconds: { min: 15, max: 45 },
    fileTypes: ["MP4", "MOV"],
    safeZone: { topPx: 290, bottomPx: 480, notes: "Top ~15% for handle/sponsored, bottom ~25% for CTA card + music label + like/share rail" },
    characterLimits: [
      { field: "description", max: 90, notes: "Channel name + description shown" },
    ],
    ctaButtons: ["Shop Now", "Order Now", "Visit Site", "Learn More", "Sign Up"],
    placement: "Shorts feed",
    soundDefault: "sound_on",
    captionsRequired: true,
    notes: ["CTR 1.24% (Q1 2026) — ~2× skippable in-stream", "Hook in 1.5 sec; show food in frame 1"],
  },

  // ---------------------------------------------------------------------------
  // X (Twitter) — Deprioritized for restaurants
  // ---------------------------------------------------------------------------
  {
    id: "x_image",
    platform: "x",
    surface: "Image Ad",
    aspectRatios: ["1.91:1", "1:1"],
    recommendedPx: { width: 1200, height: 628 },
    maxFileSizeMb: 5,
    fileTypes: ["JPG", "PNG"],
    characterLimits: [
      { field: "post_copy", max: 280, notes: "257 if link included" },
      { field: "media_headline", max: 70 },
    ],
    ctaButtons: ["Shop Now", "Book Now", "Order Food"],
    placement: "X timeline",
    soundDefault: "sound_off",
    captionsRequired: false,
  },
  {
    id: "x_video",
    platform: "x",
    surface: "Video Ad",
    aspectRatios: ["16:9", "1:1", "9:16"],
    recommendedPx: { width: 1080, height: 1920 },
    maxVideoSeconds: 140, // 2:20
    recommendedVideoSeconds: { min: 15, max: 30 },
    maxFileSizeMb: 1024,
    fileTypes: ["MP4", "MOV"],
    characterLimits: [
      { field: "post_copy", max: 280 },
    ],
    ctaButtons: ["Shop Now", "Book Now", "Order Food"],
    placement: "X timeline",
    soundDefault: "sound_off",
    captionsRequired: true,
  },

  // ---------------------------------------------------------------------------
  // PINTEREST — Niche, for café/dessert/aesthetic-led restaurants
  // ---------------------------------------------------------------------------
  {
    id: "pinterest_pin",
    platform: "pinterest",
    surface: "Promoted Pin (image)",
    aspectRatios: ["2:3", "1:1"],
    recommendedPx: { width: 1000, height: 1500 },
    maxFileSizeMb: 20,
    fileTypes: ["PNG", "JPG"],
    characterLimits: [
      { field: "title", max: 100, truncatedAt: 40 },
      { field: "description", max: 500 },
    ],
    ctaButtons: ["Shop Now"],
    placement: "Pinterest feed + search",
    soundDefault: "sound_off",
    captionsRequired: false,
  },
  {
    id: "pinterest_video",
    platform: "pinterest",
    surface: "Video Pin",
    aspectRatios: ["9:16", "1:1", "2:3"],
    recommendedPx: { width: 1080, height: 1920 },
    maxVideoSeconds: 900, // 15 min
    recommendedVideoSeconds: { min: 5, max: 60 },
    maxFileSizeMb: 2048,
    fileTypes: ["MP4", "MOV"],
    characterLimits: [
      { field: "title", max: 100 },
      { field: "description", max: 500 },
    ],
    ctaButtons: ["Shop Now"],
    placement: "Pinterest feed + search",
    soundDefault: "sound_off",
    captionsRequired: true,
  },

  // ---------------------------------------------------------------------------
  // WHATSAPP STATUS / TEMPLATE
  // ---------------------------------------------------------------------------
  {
    id: "whatsapp_status",
    platform: "whatsapp",
    surface: "WhatsApp Status Ad",
    aspectRatios: ["9:16"],
    recommendedPx: { width: 1080, height: 1920 },
    maxVideoSeconds: 30,
    minVideoSeconds: 3,
    fileTypes: ["MP4", "JPG", "PNG"],
    characterLimits: [
      { field: "greeting_message", max: 600 },
    ],
    ctaButtons: ["Send WhatsApp Message"],
    placement: "Status tray",
    soundDefault: "sound_off",
    captionsRequired: true,
    notes: ["Rolling out globally through 2025-2026"],
  },
  {
    id: "whatsapp_template",
    platform: "whatsapp",
    surface: "WhatsApp Template Message (post-click)",
    aspectRatios: [],
    recommendedPx: { width: 0, height: 0 },
    fileTypes: ["JPG", "PNG", "MP4", "PDF"],
    characterLimits: [
      { field: "headline", max: 60, notes: "Header text" },
      { field: "primary_text", max: 1024, notes: "Body" },
      { field: "description", max: 60, notes: "Footer" },
    ],
    ctaButtons: ["Send Message"],
    placement: "Inside WhatsApp chat after CTWA click",
    soundDefault: "sound_off",
    captionsRequired: false,
    notes: ["Up to 10 buttons (quick reply or URL)", "Marketing template rates: UAE ~$0.0499 + BSP markup; KSA ~$0.0379-0.04 base"],
  },
];

// =============================================================================
// PERFORMANCE BENCHMARKS — F&B vertical, MENA / Q2 2026
// =============================================================================

export const platformBenchmarks: PlatformBenchmarks[] = [
  {
    platformId: "meta",
    vertical: "restaurant",
    metrics: [
      { metric: "cpm", unit: "AED", range: [10, 25], region: "UAE", source: "Hikmah AI Dubai 2026", confidence: "medium", asOf: "2026-Q2" },
      { metric: "cpm", unit: "AED", range: [15, 40], region: "UAE", source: "IG Feed F&B 2026", confidence: "medium", asOf: "2026-Q2" },
      { metric: "ctr", unit: "%", range: [1.5, 4], region: "MENA", source: "Adamigo 2026", confidence: "medium", asOf: "2026-Q2" },
      { metric: "cvr", unit: "%", range: [1.54, 1.93], region: "global", source: "Get-Ryze 2026", confidence: "medium", asOf: "2026-Q2" },
      { metric: "cpl", unit: "AED", range: [8, 15], region: "UAE", source: "Standard CTWA UAE", confidence: "medium", asOf: "2026-Q2" },
      { metric: "roas", unit: "x", range: [2.5, 4.5], region: "MENA", source: "Industry benchmark", confidence: "medium", asOf: "2026-Q2" },
    ],
  },
  {
    platformId: "tiktok",
    vertical: "restaurant",
    metrics: [
      { metric: "cpm", unit: "USD", range: [1.35, 2.8], region: "UAE", source: "Hovi Digital 2026", confidence: "medium", asOf: "2026-Q2" },
      { metric: "cpm", unit: "USD", range: [1.2, 2.4], region: "KSA", source: "Hovi Digital 2026", confidence: "medium", asOf: "2026-Q2" },
      { metric: "ctr", unit: "%", range: [0.7, 1.2], region: "global", source: "Lebesgue 2026", confidence: "medium", asOf: "2026-Q2" },
      { metric: "video_completion_6s", unit: "%", range: [40, 60], region: "global", source: "Lebesgue 2026", confidence: "medium", asOf: "2026-Q2" },
      { metric: "hook_rate_3s", unit: "%", range: [50, 65], region: "global", source: "Lebesgue 2026", confidence: "medium", asOf: "2026-Q2" },
    ],
  },
  {
    platformId: "snapchat",
    vertical: "restaurant",
    metrics: [
      { metric: "cpm", unit: "USD", range: [1.88, 8.85], region: "GCC", source: "LeadsBridge 2025", confidence: "low", asOf: "2026-Q2" },
      { metric: "cpm", unit: "USD", range: [2, 4], region: "KSA", source: "Industry estimate", confidence: "medium", asOf: "2026-Q2" },
      { metric: "ctr", unit: "%", range: [1.5, 4], region: "KSA", source: "Snap For Business cases", confidence: "medium", asOf: "2026-Q2" },
    ],
  },
  {
    platformId: "google",
    vertical: "restaurant",
    metrics: [
      { metric: "cpc", unit: "USD", range: [1.5, 3.5], region: "global", source: "PPCChief 2026", confidence: "medium", asOf: "2026-Q2" },
      { metric: "ctr", unit: "%", range: [5, 10], region: "global", source: "PPCChief 2026 (search)", confidence: "medium", asOf: "2026-Q2" },
      { metric: "cvr", unit: "%", range: [5, 9], region: "global", source: "PPCChief 2026 (search)", confidence: "medium", asOf: "2026-Q2" },
      { metric: "cpl", unit: "USD", range: [25, 35], region: "global", source: "PPCChief 2026 (search)", confidence: "medium", asOf: "2026-Q2" },
    ],
  },
  {
    platformId: "youtube",
    vertical: "restaurant",
    metrics: [
      { metric: "cpm", unit: "USD", range: [4.85, 6], region: "global", source: "DigitalApplied Q1 2026", confidence: "medium", asOf: "2026-Q2" },
      { metric: "ctr", unit: "%", range: [1, 1.5], region: "global", source: "DigitalApplied Q1 2026", confidence: "medium", asOf: "2026-Q2" },
    ],
  },
  {
    platformId: "whatsapp",
    vertical: "restaurant",
    metrics: [
      { metric: "ctr", unit: "%", range: [15, 80], region: "global", source: "Sendwo CTWA 2025", confidence: "low", asOf: "2026-Q2" },
      { metric: "cpl", unit: "AED", range: [4, 12], region: "UAE", source: "Industry CTWA estimate", confidence: "medium", asOf: "2026-Q2" },
    ],
  },
];

// =============================================================================
// MASTER SPEC CARD — Cross-platform cheat sheet
// =============================================================================

export const masterSpecCard = {
  // Universal target export — design once, render everywhere.
  primaryDeliverable: {
    aspectRatio: "9:16" as const,
    px: { width: 1080, height: 1920 },
    durationSec: { min: 6, max: 30 },
    safeZone: {
      topPx: 270,
      bottomPx: 670,
      notes: "Conservative safe zone covering Reels/TikTok/Snap/Shorts. Keep all critical text/dish in middle 60% vertically.",
    },
  },
  charLimitsToRemember: {
    metaHeadline: 40,
    metaPrimaryText: 125,
    metaDescription: 25,
    tiktokCaption: 100,
    snapBrandName: 25,
    snapHeadline: 34,
    youtubeShortsDesc: 90,
    googleSearchHeadline: 30,
    googleSearchDescription: 90,
    pinterestTitle: 100,
    whatsappGreeting: 600,
    xPostCopy: 280,
  },
  twentySixTrends: [
    "9:16 dominant; 4:5 only for Meta Feed; 1:1 only for carousels and PMax",
    "AI-assistive (Advantage+ Creative, Symphony, Smart+) rewarded; fully-synthetic suppressed",
    "Sound-on for TikTok/Snap; sound-off everywhere else — but burned-in captions universal",
    "Hook in 1.5–2 sec, not 3 — attention curves shifted earlier",
    "8+ creatives per ad set on Meta to clear Andromeda's diversification preference",
    "Click-to-WhatsApp is the standout MENA-specific lever",
    "Snapchat = primary channel for under-35 KSA dining (87.7% reach)",
    "Restaurants are excluded from Google LSA in 2026",
    "AI Overviews answer 78% of restaurant queries — pair Search with structured data + GBP",
    "Arabic-first creative outperforms English by 15-40% across Meta/Snap/TikTok in KSA",
  ],
} as const;
