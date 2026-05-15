# Ad Studio v2 — Product Plan

**Owner:** Saleem
**Date:** 2026-05-14 (last update 2026-05-15)
**Status:** Sabt Pack v1 ✅ shipped; remaining 6 features ⚫ not started

**Legend** (used per feature below):
- ✅ Shipped — live in production, verified end-to-end
- 🟡 In progress — partially built, behind a flag, or in review
- ⚫ Not started

## Guiding principles

- **Customer is king.** The customer is a restaurant owner who's been awake since 5am and hasn't eaten yet. Every feature takes work *off* her plate.
- **English-first by default.** UAE F&B is expat-dominant — Dubai Marina, JLT, Downtown, DIFC, JBR, City Walk are 80%+ English-first. Arabic is opt-in polish, not the default rail. (KSA expansion changes this calculus later.)
- **Real food beats AI food.** Anchor every visual on the owner's actual menu photo. Generative is for variation and motion, never replacement.
- **Approve-on-WhatsApp, never auto-post.** Trust > convenience for a new platform in a new category.
- **Image-to-video, not text-to-video.** Half the cost, twice the brand fidelity.

## The 7-feature stack (ranked)

### 1. Sabt Pack — Weekly Post Pack ✅ Shipped
**One line:** Every Sunday 7am Gulf time, owner gets an email from Bustan (plus an in-dashboard banner) with 7 ready-to-post creatives for the week.

**Why email, not WhatsApp:** The restaurant's connected WABA is for customer-facing messages. Using it to message the owner herself would (a) confusingly come from her own number, (b) eat into her per-WABA daily messaging tier, and (c) needs a Meta template approval cycle. Email via Resend (already configured) is cleaner and free at our volume.

**Status detail (as of 2026-05-15):**
- Migration `add_sabt_pack` applied to Railway prod
- Backend orchestrator + Sunday `0 3 * * 0` UTC cron live; pg-boss fanout + generate workers registered
- Frontend tab nav in Ad Studio (Campaigns / Sabt Pack / Integrations); mobile review surface with sticky approve bar, inline edit, slideshow swipe, polling during generation
- Resend email delivery + dashboard banner fallback; `getbustan.com` domain verified
- Smoke-tested end-to-end against `zaytoun-kitchen`: generation, banner, review surface, owner email all confirmed working
- Security pass complete (SSRF allowlist, tenant scoping, transactional idempotency, slug-or-cuid resolution, token redaction, prompt-injection wrapping, etc.)
- Cost cap raised to $1.00/restaurant/week with absolute $1.00 circuit-breaker; projection fixed so AI image gen actually runs

**Open (post-launch tuning, not blocking):**
- Watch median actual cost after the first real Sunday cron (May 17) — expected ~$0.64
- Instrument engagement: email open rate, approve rate, time-to-approve
- Local `.env` `RESEND_FROM_EMAIL` still set to old `mydscvr.ai` brand — update to `getbustan.com` for parity

- **JTBD:** "Stop making me figure out what to post on Tuesday."
- **Output mix (v1, images-only):** 1 slideshow / TikTok Photo Mode, 1 Reel cover still, 1 IG Feed, 1 Carousel, 1 GBP image, 1 WhatsApp Status, 1 GBP post. (Video Reels deferred to Auto-Reel in feature #3.)
- **Inputs (zero owner effort):** existing menu photos, this week's UAE calendar (Friday brunch, Wednesday lull, Ramadan/National Day/weekend triggers), neighborhood + cuisine context from the restaurant profile.
- **Complexity:** M. Recombines existing KB archetypes, copy pipeline, calendar service, image renderer.
- **COGS:** ~$0.64/restaurant/week (Claude ~$0.40 + Gemini ~$0.24). Pro-tier included. Annual ~$33/restaurant = 3.4% of Pro AED 299 revenue.
- **Viral hook:** 7× the "Made with Bustan" public share footprint per restaurant, compounding weekly.
- **Why first:** Solves the 52-week-a-year content treadmill, not the once-a-quarter campaign. Foundation that every other feature on this list plugs into.

### 2. Slideshow / TikTok Photo Mode composer ⚫ Not started
**One line:** Templates only, 90 seconds end-to-end, exports to TikTok Photo Mode, IG Carousel, Snap Spotlight, IG Stories.

> Standalone composer outside of Sabt Pack. Sabt Pack v1 already ships a 5-frame slideshow as slot 1; this feature is the *ad-hoc* composer for off-cycle moments (Eid drops, soft launches, supplier surprises).

- **JTBD:** "Post the slow-scroll, snackable thing that's quietly outperforming Reels in 2026 without hiring an editor."
- **Why it works in 2026:** TikTok Photo Mode is ~38% of MENA For You feed; IG slideshows have higher save rates than Reels (DM-share is the #1 Reels ranking signal); zero new photography needed.
- **Design rule:** No timeline editor. Templates only. Owner picks template, edits 3 captions, done.
- **Music:** Curated royalty-free library (~50 tracks tagged by vibe: energetic, cozy, premium, Ramadan). Default is silent/music — no voiceover on slideshows.
- **Complexity:** S–M. `sharp` + ffmpeg on existing image-resizer worker. No new generative cost.
- **COGS:** ~$0.
- **Viral hook:** Each slideshow is a public share link → "Made with Bustan" footer.

### 3. Auto-Reel (image-to-video) ⚫ Not started
**One line:** Pick a dish + a vibe (ASMR sizzle / POV first bite / cheese pull / chef's hands) → 7–15s 9:16 vertical video generated from the existing menu photo.

- **JTBD:** "I can't film. I can't edit. I want a Reel that doesn't look fake."
- **Tech:** Veo 3.1 native audio (voiceover + ambient + music in the same render — no separate TTS). Image-to-video anchored on real menu photo.
- **Complexity:** L. Schema needs `videoUrl` / `videoStoryboard` columns from original implementation plan.
- **COGS:** $0.30–$0.80 per render. **Margin discipline required.**
- **Pricing gate:** Portfolio-tier included (1/wk per brand). Pro = 1/wk per brand included, AED 9 per extra. Cache aggressively keyed on (dish_id, archetype, vibe).
- **Viral hook:** "Wait, that's AI?" — screenshotted on F&B operator WhatsApp groups, where UAE word-of-mouth actually happens.

### 4. Bilingual polish + optional Arabic dialect ⚫ Not started
**One line:** Toggle to re-render the pack in proper Khaleeji / Egyptian / Levantine Arabic instead of MSA-mirror, plus matched-dialect voice options.

> Note: Sabt Pack v1 already wires the `dialect` field through the orchestrator and the planner can choose `bilingual` / `khaleeji` / `egyptian` / `levantine`. This feature surfaces it as an owner-facing toggle and refines the MENA dialect output quality.

- **JTBD:** "When I want Arabic, give me Arabic that doesn't sound like a newspaper."
- **Reality check:** Default stays English-first. Most UAE restaurants serve an expat customer base and run English-dominant social. This is opt-in polish, surfaced as a clear toggle — not a re-architecture.
- **Where it matters most:** Sharjah, Ajman, RAK, parts of Abu Dhabi, traditional Emirati / Khaleeji / Levantine cuisines, and the KSA expansion later. Marina/JLT/DIFC owners will leave it off.
- **Implementation note:** `dialect` field already exists in `StrategyDecision`. Today it's chosen by the orchestrator and never surfaced. Just expose it as an optional control.
- **Complexity:** S (copy) + M (TTS voice when needed).
- **COGS:** ~$0.05/project when on, $0 when off.

### 5. WhatsApp Broadcast Pack (with voice notes) ⚫ Not started
**One line:** Any creative → 1:1 hero + 60-char message + "Order on WhatsApp" CTA, pushed through the restaurant's own Meta WhatsApp Business account. Optional 15s ElevenLabs voice note in the owner's chosen language.

> Blocked on Meta Tech Provider approval (submitted 2026-05-14). Composer + queue can ship now; broadcast send goes live the day approval lands.

- **JTBD:** "I have 800 phone numbers from past customers and never message them because I don't know what to say or how to format it for WhatsApp."
- **Why huge:** WhatsApp has ~70% open rate in UAE vs. ~2% on email/SMS. Restaurant pays Meta directly — zero COGS to Bustan.
- **Voice note unlock:** WhatsApp voice notes have ~3× listen-rate vs. text broadcasts in the Gulf. No UAE restaurant currently does this. Default voice = English; Arabic dialect available when toggled on.
- **TTS choice:** ElevenLabs Multilingual v2. ~$22/mo on Creator tier supports ~165 restaurants at 4 voice notes/mo each. Phase 2: owner-cloned voice (Instant Voice Cloning, 1 min of audio → her actual voice on every broadcast).
- **Complexity:** M. Composer + queue can ship now; broadcast send goes live the day Meta Tech Provider approval lands.
- **COGS:** ~$0 platform + ~$0.03 per voice note (ElevenLabs).

### 6. Snap AR Lens / Story Ad pack ⚫ Not started
**One line:** Turn a hero dish into Snap-compatible creatives: Story Ad pack first, AR lens (try-on-the-plate, branded sticker pack, neighborhood geofilter) in phase 2.

- **JTBD:** "All my under-25 customers are on Snap, not Instagram, and I have no idea what to post there."
- **Why now:** Snap is 70%+ DAU among UAE/KSA Gen Z. Almost no restaurant has Snap content — unclaimed territory.
- **Phasing:** Ship Story Ad pack first (just new aspect ratios + Snap-flavored copy on top of existing pipeline). AR lens via Snap Lens Studio API is phase 2 and heavy.
- **Pilot:** 5 hand-picked Marina/Bayan/Riyadh restaurants before broad rollout.
- **Complexity:** L for full AR. S–M for Story Ad pack.
- **COGS:** Image-gen baseline; AR lens TBD on Snap Studio fees.

### 7. In-store Screen Pack ⚫ Not started
**One line:** Same creative project re-rendered as a 4K horizontal TV loop + printable A5 table tent with QR to the WhatsApp ordering link.

- **JTBD:** "I paid AED 6,000 for a TV in the corner that shows nothing."
- **Why ROI:** Closes the offline-to-online loop. Every walk-in becomes a future delivery customer at zero acquisition cost.
- **Complexity:** S. Just new aspect ratios + print stylesheet on top of `image-resizer.ts`.
- **COGS:** ~$0.
- **Viral hook:** Table tent QR → public menu → "Powered by Bustan" footer in front of every diner.

## Sequence

| Phase | Window | Ships | Status |
|---|---|---|---|
| 1 | 2026-05-14 → 4 weeks | Sabt Pack v1 + Slideshow composer + Bilingual toggle (opt-in dialect) | Sabt Pack ✅ done 2026-05-15; Slideshow composer + Bilingual toggle ⚫ |
| 2 | 4 → 8 weeks | WhatsApp Broadcast Pack composer + In-store Screen Pack + ElevenLabs voice notes | ⚫ |
| 3 | 8 → 14 weeks | Auto-Reel (Veo 3.1, Portfolio-gated) + Snap Story Ad pack pilot | ⚫ |
| Future | 14+ weeks | Snap AR lens, owner voice cloning, KSA dialect expansion | ⚫ |

## What we will NOT build

- ❌ Text-to-video — only image-to-video anchored on the owner's real plate.
- ❌ Full timeline / pixel-level editor — templates only. CapCut exists.
- ❌ Auto-posting on the owner's behalf — always approve-on-WhatsApp.
- ❌ AI stock photography — dilutes the "real food, real restaurant" wedge.
- ❌ Exposing every KB knob (archetype/hook/CTA) in the UI — the auto-pick *is* the magic.
- ❌ Arabic-first defaults — bilingual stays opt-in. UAE expat market is English-dominant.
- ❌ In-platform Meta Ads launcher before Tech Provider approval lands.

## COGS summary

| Feature | Per-asset cost | Tier |
|---|---|---|
| Sabt Pack ✅ | ~$0.64/wk per restaurant (verified prod) | Pro |
| Slideshow composer | ~$0 | Pro |
| Bilingual toggle / TTS | ~$0–$0.05/project | Pro |
| Auto-Reel video | $0.30–$0.80/render | Portfolio (or Pro metered) |
| WhatsApp Broadcast Pack | ~$0 (Meta paid by restaurant) | Pro |
| WhatsApp voice note | ~$0.03 (ElevenLabs) | Pro |
| Snap Story Ad pack | ~$0.04 image-gen | Pro |
| In-store Screen Pack | ~$0 | Pro |

Auto-Reel is the only feature requiring explicit margin discipline. Everything else fits comfortably inside the AED 299 Pro envelope.
