import type { CampaignArchetype } from "./types";

// =============================================================================
// 14 CAMPAIGN ARCHETYPES — restaurants in MENA / Q2 2026
// =============================================================================
// All currency in AED unless noted (AED 1 ≈ USD 0.272).

export const campaignArchetypes: CampaignArchetype[] = [
  {
    id: "soft_launch_awareness",
    name: "Soft Launch Awareness",
    goal: "Build pre-opening awareness in 5km radius. Capture priority-list signups for opening week.",
    primaryKpi: { metric: "unique_reach", target: 60000, unit: "count", comparator: "gt" },
    duration: { weeks: 3, mode: "sprint" },
    budgetTiers: {
      lean: { minAed: 2500, maxAed: 4000 },
      standard: { minAed: 6000, maxAed: 10000 },
      aggressive: { minAed: 18000, maxAed: 30000 },
    },
    platformMix: { meta: 50, tiktok: 30, snapchat: 10, influencer: 10 },
    funnelStages: { tofu: 100, mofu: 0, bofu: 0, retention: 0 },
    audienceRecipeIds: ["meta_geo_5km_foodie"],
    creativeMix: [
      { archetypeId: "founder_origin", sharePct: 35 },
      { archetypeId: "cheese_pull_money_shot", sharePct: 20 },
      { archetypeId: "behind_the_pass", sharePct: 20 },
      { archetypeId: "hidden_gem_reveal", sharePct: 15 },
      { archetypeId: "asmr_sizzle", sharePct: 10 },
    ],
    bidding: { meta: "Reach (frequency cap 1/3 days)", tiktok: "Reach", snapchat: "Goal-Based Awareness" },
    landing: ["whatsapp", "bustan_menu"],
    trackingEvents: ["PageView", "Lead", "ViewContent"],
    benchmarks: { cpmAed: [25, 40], ctrPct: [1.5, 2.5], cplAed: [8, 15] },
    failureModes: [
      "Pushing reservations before operationally ready",
      "Generic stock food photos",
      "No Arabic creative variant in Sharjah/AD/KSA",
    ],
    seasonalMods: [
      { season: "ramadan_first_10_days", modifier: "Avoid soft-launching — low dine-in attention" },
      { season: "sept_nov_post_eid", modifier: "Best windows for soft launch" },
    ],
  },
  {
    id: "grand_opening_blitz",
    name: "Grand Opening Blitz",
    goal: "Convert first-time visitors. Cost per first-time visitor < AED 30 dine-in / < AED 35 first delivery.",
    primaryKpi: { metric: "cpa_first_visitor_aed", target: 30, unit: "AED", comparator: "lt" },
    duration: { weeks: 4, mode: "sprint" },
    budgetTiers: {
      lean: { minAed: 5000, maxAed: 8000 },
      standard: { minAed: 15000, maxAed: 25000 },
      aggressive: { minAed: 40000, maxAed: 80000 },
    },
    platformMix: { meta: 40, tiktok: 25, whatsapp: 15, influencer: 15, google: 5 },
    funnelStages: { tofu: 50, mofu: 30, bofu: 20, retention: 0 },
    audienceRecipeIds: ["meta_geo_5km_foodie", "meta_video_viewers_75pct", "meta_lookalike_whatsapp"],
    creativeMix: [
      { archetypeId: "pov_first_bite", sharePct: 30 },
      { archetypeId: "founder_origin", sharePct: 20 },
      { archetypeId: "behind_the_pass", sharePct: 20 },
      { archetypeId: "customer_reaction", sharePct: 15 },
      { archetypeId: "family_table_reveal", sharePct: 15 },
    ],
    bidding: { meta: "Sales (with CAPI)", tiktok: "Conversions", google: "PMax + brand defense" },
    landing: ["whatsapp", "bustan_menu", "aggregator_deeplink"],
    trackingEvents: ["PageView", "ViewContent", "AddToCart", "InitiateCheckout", "Reservation", "Purchase"],
    benchmarks: { cpmAed: [30, 55], ctrPct: [2, 4], cpaAed: [22, 40], roas: [2.5, 4.5] },
    failureModes: [
      "Killing ads before learning phase exits (50 events/wk on Meta)",
      "Over-reliance on a single influencer who underperforms",
      "No offer escalation if week-2 CPA balloons",
    ],
    seasonalMods: [
      { season: "dsf_dec5_jan11", modifier: "CPMs +30-40%; pad budget" },
    ],
  },
  {
    id: "iftar_fill_house",
    name: "Iftar Fill-the-House (Ramadan)",
    goal: "Sell out 80%+ Iftar covers Mon-Thu, 100% Fri-Sat. Cost per reservation < AED 15.",
    primaryKpi: { metric: "cpa_reservation_aed", target: 15, unit: "AED", comparator: "lt" },
    duration: { weeks: 6, mode: "sprint" }, // 2 pre-Ramadan + 4 Ramadan
    budgetTiers: {
      lean: { minAed: 4000, maxAed: 8000 },
      standard: { minAed: 12000, maxAed: 25000 },
      aggressive: { minAed: 35000, maxAed: 70000 },
    },
    platformMix: { meta: 45, whatsapp: 25, tiktok: 20, snapchat: 10 },
    funnelStages: { tofu: 30, mofu: 20, bofu: 50, retention: 0 },
    audienceRecipeIds: ["meta_geo_5km_foodie", "meta_lookalike_whatsapp", "snapchat_ksa_family"],
    creativeMix: [
      { archetypeId: "family_table_reveal", sharePct: 35 },
      { archetypeId: "ingredient_provenance", sharePct: 20 },
      { archetypeId: "pov_first_bite", sharePct: 15 },
      { archetypeId: "what_i_eat_in_a_day", sharePct: 15 },
      { archetypeId: "founder_origin", sharePct: 15 },
    ],
    bidding: { meta: "Lead/Messages (WhatsApp)", snapchat: "Goal-based reservations" },
    landing: ["whatsapp"],
    trackingEvents: ["PageView", "Lead", "Reservation"],
    benchmarks: { cpmAed: [35, 65], ctrPct: [3, 5], cplAed: [6, 12], cpaAed: [10, 20] },
    failureModes: [
      "Launching after Ramadan starts (lost the 2-week tease)",
      "Ignoring Suhoor as second daypart",
      'Ad copy mentions "drink" or "happy hour"',
    ],
    seasonalMods: [
      { season: "ramadan_active", modifier: "Default-on; the campaign IS the season" },
      { season: "eid_pivot", modifier: "Last 3 days pre-Eid: shift creative to Eid family brunch" },
    ],
  },
  {
    id: "delivery_acquisition",
    name: "Delivery Acquisition (Cloud Kitchens)",
    goal: "Cost per first delivery order < AED 25; repeat rate > 35% within 30 days.",
    primaryKpi: { metric: "cpa_first_order_aed", target: 25, unit: "AED", comparator: "lt" },
    duration: { weeks: null, mode: "always_on" },
    budgetTiers: {
      lean: { minAed: 3000, maxAed: 6000 },
      standard: { minAed: 9000, maxAed: 18000 },
      aggressive: { minAed: 25000, maxAed: 60000 },
    },
    platformMix: { meta: 55, tiktok: 25, google: 15, snapchat: 5 },
    funnelStages: { tofu: 30, mofu: 0, bofu: 70, retention: 0 },
    audienceRecipeIds: ["meta_geo_delivery_zone", "meta_lookalike_repeat_orderers"],
    creativeMix: [
      { archetypeId: "asmr_sizzle", sharePct: 30 },
      { archetypeId: "speed_run_60s", sharePct: 25 },
      { archetypeId: "late_night_craving_skit", sharePct: 20 },
      { archetypeId: "cheese_pull_money_shot", sharePct: 15 },
      { archetypeId: "before_after_plating", sharePct: 10 },
    ],
    bidding: { meta: "Sales (CAPI server-side from Bustan POS)", google: "PMax", tiktok: "Conversions" },
    landing: ["aggregator_deeplink"],
    trackingEvents: ["PageView", "AddToCart", "InitiateCheckout", "Purchase"],
    benchmarks: { cpmAed: [20, 45], ctrPct: [1.5, 3], cpaAed: [22, 40], roas: [2, 4] },
    failureModes: [
      "Driving traffic to own site when aggregators own the cart",
      "Ignoring rainy-day/heatwave triggers",
      "Not Arabic-localizing dish names",
    ],
    seasonalMods: [
      { season: "summer_jun_aug", modifier: "+30% budget; family bundle creative" },
      { season: "ramadan", modifier: "Pre-Iftar 4-6pm bid surge" },
    ],
  },
  {
    id: "weekday_reservation_fill",
    name: "Reservation Fill — Weekday Slumps",
    goal: "Lift Mon-Wed covers by 25%+. Cost per reservation < AED 20.",
    primaryKpi: { metric: "cpa_reservation_aed", target: 20, unit: "AED", comparator: "lt" },
    duration: { weeks: null, mode: "always_on" },
    budgetTiers: {
      lean: { minAed: 2000, maxAed: 3500 },
      standard: { minAed: 6000, maxAed: 10000 },
      aggressive: { minAed: 15000, maxAed: 25000 },
    },
    platformMix: { meta: 60, whatsapp: 25, google: 15 },
    funnelStages: { tofu: 0, mofu: 30, bofu: 70, retention: 0 },
    audienceRecipeIds: ["meta_video_viewers_75pct", "meta_geo_5km_foodie"],
    creativeMix: [
      { archetypeId: "behind_the_pass", sharePct: 25 },
      { archetypeId: "founder_origin", sharePct: 20 },
      { archetypeId: "ingredient_provenance", sharePct: 20 },
      { archetypeId: "what_i_eat_in_a_day", sharePct: 20 },
      { archetypeId: "customer_reaction", sharePct: 15 },
    ],
    bidding: { meta: "Lead (WhatsApp); day-parted Sun 6pm – Wed 9pm" },
    landing: ["whatsapp"],
    trackingEvents: ["Lead", "Reservation"],
    benchmarks: { ctrPct: [2.5, 4.5], cplAed: [5, 12], cpaAed: [12, 22] },
    failureModes: [
      "Discount cannibalizes weekend full-price covers",
      "Creative is generic instead of explicit 'Tuesday only' framing",
    ],
    seasonalMods: [
      { season: "ramadan", modifier: "Pause — low weekday dine-in" },
      { season: "post_eid", modifier: "Double down" },
    ],
  },
  {
    id: "weekend_brunch_hero",
    name: "Weekend Brunch Hero",
    goal: "100% Fri+Sat brunch sellout. Cost per booking < AED 25.",
    primaryKpi: { metric: "cpa_reservation_aed", target: 25, unit: "AED", comparator: "lt" },
    duration: { weeks: null, mode: "always_on" },
    budgetTiers: {
      lean: { minAed: 3000, maxAed: 5000 },
      standard: { minAed: 8000, maxAed: 14000 },
      aggressive: { minAed: 20000, maxAed: 35000 },
    },
    platformMix: { meta: 50, tiktok: 30, influencer: 15, whatsapp: 5 },
    funnelStages: { tofu: 35, mofu: 25, bofu: 40, retention: 0 },
    audienceRecipeIds: ["meta_geo_5km_foodie", "tiktok_uae_foodies", "meta_lookalike_whatsapp"],
    creativeMix: [
      { archetypeId: "family_table_reveal", sharePct: 30 },
      { archetypeId: "pov_first_bite", sharePct: 25 },
      { archetypeId: "customer_reaction", sharePct: 20 },
      { archetypeId: "what_i_eat_in_a_day", sharePct: 15 },
      { archetypeId: "asmr_sizzle", sharePct: 10 },
    ],
    bidding: { meta: "Reservation Lead, day-parted Wed 12pm – Fri 10am" },
    landing: ["whatsapp", "reservation_widget"],
    trackingEvents: ["Lead", "Reservation"],
    benchmarks: { ctrPct: [2, 4], cplAed: [8, 18], cpaAed: [18, 30] },
    failureModes: [
      "Generic 'brunch' framing — needs unique angle (theme, live-station, view)",
      "Launching Thu evening (too late)",
    ],
    seasonalMods: [
      { season: "summer", modifier: "Pivot to indoor / pool brunch" },
      { season: "national_day_weekend", modifier: "Themed spike" },
    ],
  },
  {
    id: "birthday_club",
    name: "Birthday-Club Retargeting",
    goal: "Reactivate dormant guests on their birthday month with 47%+ redemption.",
    primaryKpi: { metric: "redemption_pct", target: 47, unit: "%", comparator: "gt" },
    duration: { weeks: null, mode: "always_on" },
    budgetTiers: {
      lean: { minAed: 500, maxAed: 1000 },
      standard: { minAed: 1500, maxAed: 3000 },
      aggressive: { minAed: 4000, maxAed: 8000 },
    },
    platformMix: { whatsapp: 50, email: 30, meta: 20 },
    funnelStages: { tofu: 0, mofu: 0, bofu: 0, retention: 100 },
    audienceRecipeIds: ["custom_birthday_audience"],
    creativeMix: [
      { archetypeId: "customer_reaction", sharePct: 40 },
      { archetypeId: "family_table_reveal", sharePct: 30 },
      { archetypeId: "before_after_plating", sharePct: 30 },
    ],
    bidding: {},
    landing: ["whatsapp"],
    trackingEvents: ["Lead", "Reservation", "RedemptionCode"],
    benchmarks: { roas: [8, 15] },
    failureModes: ["Generic 'happy birthday' without redeemable hook (free dessert is the proven winner)"],
    seasonalMods: [],
  },
  {
    id: "weather_trigger_delivery",
    name: "Rainy-Day / Heat-Wave Delivery Push",
    goal: "Capture surge demand on weather triggers. ROAS > 4x.",
    primaryKpi: { metric: "roas", target: 4, unit: "x", comparator: "gt" },
    duration: { weeks: null, mode: "triggered" },
    budgetTiers: {
      lean: { minAed: 800, maxAed: 1500 },
      standard: { minAed: 2500, maxAed: 5000 },
      aggressive: { minAed: 8000, maxAed: 15000 },
    },
    platformMix: { meta: 50, tiktok: 30, whatsapp: 20 },
    funnelStages: { tofu: 0, mofu: 0, bofu: 100, retention: 0 },
    audienceRecipeIds: ["custom_past_customers", "meta_geo_delivery_zone"],
    creativeMix: [
      { archetypeId: "speed_run_60s", sharePct: 50 },
      { archetypeId: "asmr_sizzle", sharePct: 30 },
      { archetypeId: "late_night_craving_skit", sharePct: 20 },
    ],
    bidding: { meta: "Sales, accelerated delivery" },
    landing: ["aggregator_deeplink"],
    trackingEvents: ["AddToCart", "Purchase"],
    benchmarks: { ctrPct: [4, 6], roas: [4, 7] },
    failureModes: ["Pre-built creative not standing by — opportunity passes in hours"],
    seasonalMods: [
      { season: "summer_uae_ksa", modifier: "70% of triggers are Jun-Aug heat events" },
      { season: "winter_uae", modifier: "Limited rain triggers Dec-Feb" },
    ],
  },
  {
    id: "lto_menu_drop",
    name: "Limited-Time Menu Drop / LTO",
    goal: "Drive both repeat visits and earned media around a 2-6 week menu drop. CTR > 3.5%.",
    primaryKpi: { metric: "ctr_pct", target: 3.5, unit: "%", comparator: "gt" },
    duration: { weeks: 6, mode: "sprint" },
    budgetTiers: {
      lean: { minAed: 3000, maxAed: 5000 },
      standard: { minAed: 8000, maxAed: 14000 },
      aggressive: { minAed: 20000, maxAed: 35000 },
    },
    platformMix: { meta: 40, tiktok: 35, influencer: 20, snapchat: 5 },
    funnelStages: { tofu: 50, mofu: 25, bofu: 25, retention: 0 },
    audienceRecipeIds: ["meta_geo_5km_foodie", "meta_lookalike_whatsapp", "tiktok_uae_foodies"],
    creativeMix: [
      { archetypeId: "ingredient_provenance", sharePct: 25 },
      { archetypeId: "before_after_plating", sharePct: 25 },
      { archetypeId: "behind_the_pass", sharePct: 20 },
      { archetypeId: "pov_first_bite", sharePct: 15 },
      { archetypeId: "stop_motion_build_up", sharePct: 15 },
    ],
    bidding: { meta: "Engagement first 2 wks, Sales last 2 wks" },
    landing: ["bustan_menu", "whatsapp"],
    trackingEvents: ["PageView", "ViewContent", "Reservation", "LTO_Order"],
    benchmarks: { ctrPct: [3, 5], cpaAed: [25, 40] },
    failureModes: [
      "LTO too narrow (1 dish vs 4-dish drop)",
      "Launching when team can't execute (kitchen chaos)",
    ],
    seasonalMods: [
      { season: "fall", modifier: "Pumpkin-spice / autumn menu" },
      { season: "summer", modifier: "Mango / cooling menu" },
      { season: "ramadan", modifier: "Iftar specials" },
    ],
  },
  {
    id: "influencer_led_launch",
    name: "Influencer-Led Launch",
    goal: "Earned reach 200K+ + 100+ attributable bookings/orders in 14 days.",
    primaryKpi: { metric: "earned_reach_count", target: 200000, unit: "count", comparator: "gt" },
    duration: { weeks: 3, mode: "sprint" },
    budgetTiers: {
      lean: { minAed: 4000, maxAed: 7000 },
      standard: { minAed: 12000, maxAed: 22000 },
      aggressive: { minAed: 40000, maxAed: 90000 },
    },
    platformMix: { influencer: 70, meta: 25, tiktok: 5 },
    funnelStages: { tofu: 60, mofu: 30, bofu: 10, retention: 0 },
    audienceRecipeIds: ["meta_lookalike_creator_engagers"],
    creativeMix: [
      { archetypeId: "pov_first_bite", sharePct: 35 },
      { archetypeId: "founder_origin", sharePct: 25 },
      { archetypeId: "customer_reaction", sharePct: 20 },
      { archetypeId: "what_i_eat_in_a_day", sharePct: 20 },
    ],
    bidding: { meta: "Spark Ads / Branded Content Ads — whitelist creator handles" },
    landing: ["whatsapp", "bustan_menu"],
    trackingEvents: ["Lead", "Reservation", "Purchase", "PromoCodeRedeemed"],
    benchmarks: { roas: [3, 5] },
    failureModes: [
      "Picking creators by follower count not engagement (target 4%+ ER)",
      "Over-briefing kills authenticity",
      "No whitelisting rights = wasted earned reach",
    ],
    seasonalMods: [
      { season: "ramadan_first_10_days", modifier: "Avoid — creators reduce posting" },
      { season: "eid_dsf_summer_escapes", modifier: "Peak creator availability" },
    ],
  },
  {
    id: "dormant_reactivation",
    name: "Reactivation of Dormant Customers",
    goal: "Win back guests inactive 90+ days. Reactivation rate 8-15% within 30 days.",
    primaryKpi: { metric: "reactivation_pct", target: 8, unit: "%", comparator: "gt" },
    duration: { weeks: 4, mode: "sprint" },
    budgetTiers: {
      lean: { minAed: 1000, maxAed: 2000 },
      standard: { minAed: 3000, maxAed: 5500 },
      aggressive: { minAed: 8000, maxAed: 15000 },
    },
    platformMix: { whatsapp: 50, meta: 25, email: 25 },
    funnelStages: { tofu: 0, mofu: 0, bofu: 0, retention: 100 },
    audienceRecipeIds: ["custom_dormant_90day"],
    creativeMix: [
      { archetypeId: "customer_reaction", sharePct: 35 },
      { archetypeId: "before_after_plating", sharePct: 30 },
      { archetypeId: "family_table_reveal", sharePct: 35 },
    ],
    bidding: { meta: "Engagement (Messages)" },
    landing: ["whatsapp"],
    trackingEvents: ["Lead", "Reservation", "RedemptionCode"],
    benchmarks: { roas: [5, 10] },
    failureModes: ["Discount too small (<15% rarely moves dormant guests)", "No personalization"],
    seasonalMods: [
      { season: "post_eid_april", modifier: "Best quarter" },
      { season: "post_summer_september", modifier: "Best quarter" },
    ],
  },
  {
    id: "catering_corporate_lead_gen",
    name: "Catering / Corporate Lead Gen",
    goal: "30+ qualified corporate leads/quarter. CPL < AED 80.",
    primaryKpi: { metric: "cpl_aed", target: 80, unit: "AED", comparator: "lt" },
    duration: { weeks: null, mode: "always_on" },
    budgetTiers: {
      lean: { minAed: 2000, maxAed: 3500 },
      standard: { minAed: 6000, maxAed: 10000 },
      aggressive: { minAed: 15000, maxAed: 30000 },
    },
    platformMix: { linkedin: 35, meta: 35, google: 25, whatsapp: 5 },
    funnelStages: { tofu: 0, mofu: 40, bofu: 60, retention: 0 },
    audienceRecipeIds: ["linkedin_office_managers", "meta_business_district_geo"],
    creativeMix: [
      { archetypeId: "family_table_reveal", sharePct: 30 },
      { archetypeId: "ingredient_provenance", sharePct: 25 },
      { archetypeId: "customer_reaction", sharePct: 25 },
      { archetypeId: "behind_the_pass", sharePct: 20 },
    ],
    bidding: { meta: "Lead", google: "Search 'office catering Dubai' + 'corporate iftar catering'" },
    landing: ["lead_form", "whatsapp"],
    trackingEvents: ["Lead", "QualifiedLead"],
    benchmarks: { cplAed: [40, 90] },
    failureModes: [
      "No price transparency in ads (corporate buyers screen out)",
      "Slow WhatsApp response (>30 min kills lead)",
    ],
    seasonalMods: [
      { season: "ramadan_corporate_iftar", modifier: "2-3x demand spike Jan-Feb" },
      { season: "year_end_party_nov_dec", modifier: "Spike" },
    ],
  },
  {
    id: "premium_brand_defense",
    name: "Premium / Fine-Dining Brand Defense",
    goal: "Protect brand search, fill mid-week reservations, drive private-event leads. Cost per reservation < AED 60.",
    primaryKpi: { metric: "cpa_reservation_aed", target: 60, unit: "AED", comparator: "lt" },
    duration: { weeks: null, mode: "always_on" },
    budgetTiers: {
      lean: { minAed: 5000, maxAed: 9000 },
      standard: { minAed: 12000, maxAed: 22000 },
      aggressive: { minAed: 30000, maxAed: 60000 },
    },
    platformMix: { meta: 45, google: 30, influencer: 20, linkedin: 5 },
    funnelStages: { tofu: 10, mofu: 30, bofu: 60, retention: 0 },
    audienceRecipeIds: ["meta_hnw_neighborhoods", "google_brand_defense"],
    creativeMix: [
      { archetypeId: "behind_the_pass", sharePct: 30 },
      { archetypeId: "founder_origin", sharePct: 25 },
      { archetypeId: "ingredient_provenance", sharePct: 25 },
      { archetypeId: "day_in_life_chef", sharePct: 20 },
    ],
    bidding: { meta: "Reservation Lead", google: "Brand defense + competitor terms" },
    landing: ["reservation_widget", "bustan_menu"],
    trackingEvents: ["Lead", "Reservation", "Attendance"],
    benchmarks: { ctrPct: [1.5, 3], cplAed: [25, 50], cpaAed: [35, 70] },
    failureModes: [
      "Discounting (signals decline)",
      "Showing food too obviously (premium = restraint)",
      "Any influencer below verified-luxury tier",
    ],
    seasonalMods: [
      { season: "ramadan", modifier: "Avoid heavy dine-in push (Suhoor exception works)" },
      { season: "nye_valentines_anniversary", modifier: "Strong demand windows" },
    ],
  },
  {
    id: "multi_location_chain",
    name: "Multi-Location Chain Coordination",
    goal: "Equal-share growth across 3+ locations; avoid cannibalization; location-level ROAS >3x.",
    primaryKpi: { metric: "location_level_roas", target: 3, unit: "x", comparator: "gt" },
    duration: { weeks: null, mode: "always_on" },
    budgetTiers: {
      lean: { minAed: 8000, maxAed: 15000 },
      standard: { minAed: 25000, maxAed: 45000 },
      aggressive: { minAed: 60000, maxAed: 120000 },
    },
    platformMix: { meta: 55, tiktok: 20, google: 15, whatsapp: 10 },
    funnelStages: { tofu: 30, mofu: 30, bofu: 40, retention: 0 },
    audienceRecipeIds: ["meta_per_location_geo_fence"],
    creativeMix: [
      { archetypeId: "pov_first_bite", sharePct: 25 },
      { archetypeId: "family_table_reveal", sharePct: 25 },
      { archetypeId: "ingredient_provenance", sharePct: 20 },
      { archetypeId: "behind_the_pass", sharePct: 15 },
      { archetypeId: "customer_reaction", sharePct: 15 },
    ],
    bidding: { meta: "Advantage+ Sales with location asset feed" },
    landing: ["bustan_menu", "whatsapp"],
    trackingEvents: ["PageView", "Reservation", "Purchase"],
    benchmarks: { roas: [2.5, 4] },
    failureModes: [
      "Single national ad = poor local relevance",
      "Under-fund newer locations and they stall",
      "No exclusion between adjacent locations (cannibalization)",
    ],
    seasonalMods: [
      { season: "sharjah_specific", modifier: "No alcohol creative" },
      { season: "rak_fujairah", modifier: "Lower competition = cheaper CPMs" },
    ],
  },
];

// =============================================================================
// FUNNEL-STAGE TO CREATIVE MAPPING (cross-cutting rule)
// =============================================================================

export const funnelStageRules = {
  tofu: {
    archetypeIds: [
      "cheese_pull_money_shot",
      "pov_first_bite",
      "founder_origin",
      "asmr_sizzle",
      "texture_close_up_loop",
      "trend_audio_match_cut",
      "hand_reach_pickup",
      "before_after_plating",
      "stop_motion_build_up",
      "streetfood_walking_pov",
      "hidden_gem_reveal",
    ],
    durationSec: { min: 6, max: 15 },
    captionStyle: "no_pitch_or_soft_pitch",
    ctaStrength: "soft",
    keyKpi: ["ThruPlay rate", "hook-rate (3s play %)", "saves/shares"],
  },
  mofu: {
    archetypeIds: [
      "behind_the_pass",
      "ingredient_provenance",
      "day_in_life_chef",
      "what_i_eat_in_a_day",
      "side_by_side_taste_test",
      "locals_menu_hack",
      "customer_reaction",
    ],
    durationSec: { min: 15, max: 45 },
    captionStyle: "soft_pitch",
    ctaStrength: "medium",
    keyKpi: ["Save rate", "profile visits", "video 50%+ completion", "link CTR"],
  },
  bofu: {
    archetypeIds: [
      "speed_run_60s",
      "family_table_reveal",
      "late_night_craving_skit",
      "empty_plate_review",
    ],
    durationSec: { min: 6, max: 15 },
    captionStyle: "hard_pitch",
    ctaStrength: "explicit",
    keyKpi: ["CTR", "CVR", "CPA", "ROAS"],
  },
  retention: {
    archetypeIds: ["customer_reaction", "before_after_plating", "family_table_reveal"],
    durationSec: { min: 5, max: 15 },
    captionStyle: "warm_personal",
    ctaStrength: "personal",
    keyKpi: ["Redemption rate", "repeat-visit lift", "LTV"],
  },
} as const;

// =============================================================================
// BUDGET PACING & SPEND ALLOCATION RULES
// =============================================================================

export const pacingRules = {
  creativeConcentration: { topPct: 20, budgetPct: 80, after: "7 days of testing" },
  newRestaurantFunnelSplit: { tofu: 70, mofu: 20, bofu: 10 }, // First 90 days
  matureFunnelSplit: { tofu: 30, mofu: 30, bofu: 40 }, // After ~100K page visitors
  alwaysOnVsPulse: { alwaysOnPct: 60, pulseBurstPct: 40 },
  metaLearningPhaseEvents: 50, // Per ad set, per week
  metaLearningPhaseDailyFloor: 215, // Approx AED if CPA ~30 and need 50 events/wk
  weeklyCadenceBoosts: { wed_sat_pct: 60 }, // 60% of weekly spend
  scalingCadence: { maxIncreasePct: 20, frequencyDays: 3 },
  killTriggers: {
    frequency: 3.5,
    ctrDecayPct: 30, // week-over-week
    cpaInflationPct: 40, // 14-day
  },
  refreshCadence: {
    evergreen: { days: 21 },
    intensiveCampaign: { days: 7 },
  },
  ramadanPacing: {
    preIftarBidMultiplier: 1.5, // 2-6pm window
    suhoorAllocationPct: 15, // 11pm-2am dedicated late-night creative
  },
  seasonalCpmInflation: {
    ramadan: 1.3, // +30%
    dsf: 1.4, // +30-40%
    summer_dine_in: 0.7, // -30% — many travel
    summer_delivery: 1.5, // +50%
  },
} as const;
