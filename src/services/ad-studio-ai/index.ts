// Public entry point for the Ad Studio AI orchestrator.
//
// Per-variant pipeline (Phase 1 v2 — fixes both reviewers' P1/H7 findings):
//   1. Strategy pass (Claude Sonnet) — picks archetypes/hooks/CTAs/framework + image direction
//   2. Copy pass (Claude Sonnet) — produces N variants of {headline, primaryText, ctaText}
//   3. Safety pass on copy (deterministic regex) — fail-fast if any variant has an error-level flag
//   4. Per-variant image prompt pass (Claude Sonnet) — one prompt per variant, country-rule aware
//   5. Safety pass on each image prompt — variants with prompt-level errors generate NO image
//   6. Image gen — real-photo-first per variant, AI fallback per variant prompt

import { ApiError } from "@/lib/errors";
import { generateHeroImage } from "./image-gen";
import {
  runStrategyPass,
  runCopyPass,
  runImagePromptPass,
  runPerVariantSafety,
  aggregateSafety,
  type UsageTotals,
} from "./claude-orchestrator";
import { runSafetyPass } from "./safety";
import { kbMeta } from "@/services/ad-studio";
import type {
  AdStudioBrief,
  ImageGenResult,
  OrchestratorResult,
  RestaurantBrandContext,
  VariantOutput,
} from "./types";

export type {
  AdStudioBrief,
  OrchestratorResult,
  RestaurantBrandContext,
  VariantOutput,
} from "./types";
export {
  briefInputSchema,
  hydrateBrief,
  validateBudgetTierAgainstCampaign,
  getRecommendedPlatformsForCountries,
  type BriefInput,
} from "./brief-builder";

export type GenerationPhase = "strategy" | "copy" | "images";

interface RunGenerationOptions {
  brief: AdStudioBrief;
  brand: RestaurantBrandContext;
  numberOfVariants: number;
  /** Optional callback fired at each pass boundary so callers can persist progress. */
  onPhase?: (phase: GenerationPhase) => Promise<void> | void;
}

export async function runAdStudioGeneration(opts: RunGenerationOptions): Promise<OrchestratorResult> {
  const totals: UsageTotals = { tokensIn: 0, tokensOut: 0, costUsd: 0 };

  // Pass 1 — strategy
  await opts.onPhase?.("strategy");
  const strategy = await runStrategyPass({ brief: opts.brief, brand: opts.brand, totals });

  // Pass 2 — copy variants
  await opts.onPhase?.("copy");
  const variants = await runCopyPass({
    brief: opts.brief,
    brand: opts.brand,
    strategy,
    numberOfVariants: opts.numberOfVariants,
    totals,
  });

  // Safety pass over copy (per-variant). Fail fast if ANY variant has error-level flags.
  const copySafety = runPerVariantSafety({ variants, brief: opts.brief });
  if (aggregateSafety(copySafety) === "fail") {
    const sample = Array.from(copySafety.values())
      .flatMap((v) => v.flags)
      .filter((f) => f.severity === "error")
      .slice(0, 3)
      .map((f) => f.rule)
      .join("; ");
    throw new ApiError(`Generated copy failed safety check: ${sample}`, 422);
  }

  // Per-variant image generation. We do this sequentially to keep cost predictable
  // and to surface partial failures cleanly.
  await opts.onPhase?.("images");
  const outputs: VariantOutput[] = [];
  let imageCostTotal = 0;

  for (const copy of variants) {
    // Pass 3 — image prompt for this archetype
    let imagePrompt: string | null = null;
    let hero: ImageGenResult | null = null;
    let perVariantFlags = copySafety.get(copy.variant)?.flags ?? [];

    try {
      imagePrompt = await runImagePromptPass({
        brief: opts.brief,
        brand: opts.brand,
        strategy,
        variant: copy,
        totals,
      });

      // Re-run safety against the produced image prompt; ENFORCE the verdict.
      const imageVerdict = runSafetyPass({
        countries: opts.brief.countries,
        copy,
        imagePrompt,
      });
      perVariantFlags = imageVerdict.flags;

      if (imageVerdict.verdict === "fail") {
        // Skip image generation for this variant — don't burn an Imagen call on it.
        // The variant still ships with copy + flags so the user sees what tripped.
        hero = null;
      } else {
        hero = await generateHeroImage({
          restaurantId: opts.brief.restaurantId,
          primaryDishId: opts.brief.primaryDishId,
          primaryDishName: opts.brief.primaryDishName,
          prompt: imagePrompt,
          // Keep the trusted menu photo as the first reference creative, but
          // force AI renders for additional variants so the grid has real
          // visual diversity instead of repeating the same source image.
          reuseMenuItemImage: copy.variant === 1,
        });
        imageCostTotal += hero.costUsd;
      }
    } catch (error) {
      // Image gen failure should not kill the whole project — keep the copy.
      perVariantFlags = [
        ...perVariantFlags,
        {
          severity: "warning",
          field: "imagePrompt",
          rule:
            error instanceof Error ? `Image generation failed: ${error.message}` : "Image generation failed",
        },
      ];
    }

    outputs.push({ copy, hero, imagePrompt, safetyFlags: perVariantFlags });
  }

  return {
    strategy,
    variants: outputs,
    totalCostUsd: totals.costUsd + imageCostTotal,
    tokensIn: totals.tokensIn,
    tokensOut: totals.tokensOut,
  };
}

export function getKbVersion(): string {
  return kbMeta.version;
}
