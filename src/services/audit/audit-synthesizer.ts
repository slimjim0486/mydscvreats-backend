import { z } from "zod";
import { getAnthropicClient } from "@/services/claude";
import type {
  AuditCollectorOutput,
  AuditRestaurantContext,
  AuditScorecard,
  AuditSynthesis,
} from "./types";

const synthesisSchema = z.object({
  executiveSummary: z.string().min(1).max(900),
  photoCritique: z.string().min(1).max(700),
  peerNarrative: z.string().min(1).max(700),
});

function fallbackSynthesis(
  restaurant: AuditRestaurantContext,
  scorecard: AuditScorecard,
  output: AuditCollectorOutput
): AuditSynthesis {
  const weakest = Object.values(scorecard.pillars).sort((a, b) => a.score - b.score)[0];
  return {
    executiveSummary: `${restaurant.name} scored ${scorecard.overallScore}/100. The clearest improvement area is ${weakest.label.toLowerCase()}: ${weakest.summary}`,
    photoCritique:
      output.photoVision?.summary ??
      "Photo quality could not be fully reviewed from the available Google Maps images.",
    peerNarrative:
      output.peerBenchmark?.medianReviewCount !== null
        ? `Nearby peers have a median of ${output.peerBenchmark?.medianReviewCount} Google reviews in this cuisine/location sample.`
        : "Peer benchmark data was limited for this cuisine/location sample.",
    tokensIn: 0,
    tokensOut: 0,
  };
}

function parseJson(text: string) {
  const normalized = text
    .trim()
    .replace(/^```json\s*/, "")
    .replace(/^```\s*/, "")
    .replace(/```$/, "")
    .trim();
  return JSON.parse(normalized);
}

export async function synthesizeAudit(input: {
  restaurant: AuditRestaurantContext;
  scorecard: AuditScorecard;
  collectorOutput: AuditCollectorOutput;
}): Promise<AuditSynthesis> {
  const client = getAnthropicClient();
  if (!client) {
    return fallbackSynthesis(input.restaurant, input.scorecard, input.collectorOutput);
  }

  const response = await client.messages.create({
    model: "claude-sonnet-4-6",
    max_tokens: 2000,
    system: `You are a MENA restaurant growth strategist. Return only valid JSON.
Write a specific public-facing audit narrative for a restaurant owner.
Mention real signals from the data. Avoid generic advice. Be useful for Arabic and English restaurant markets in UAE/MENA.`,
    messages: [
      {
        role: "user",
        content: JSON.stringify({
          restaurant: {
            name: input.restaurant.name,
            location: input.restaurant.location,
            cuisine: input.restaurant.cuisineType,
          },
          scorecard: input.scorecard,
          signals: {
            google: input.collectorOutput.gbp,
            reviews: input.collectorOutput.reviews
              ? {
                  averageRating: input.collectorOutput.reviews.averageRating,
                  responseRate: input.collectorOutput.reviews.responseRate,
                  themes: input.collectorOutput.reviews.themes,
                  sampleSize: input.collectorOutput.reviews.reviews.length,
                }
              : null,
            delivery: input.collectorOutput.citations,
            mobile: input.collectorOutput.pageSpeed,
            photos: input.collectorOutput.photoVision,
            peers: input.collectorOutput.peerBenchmark,
            failures: input.collectorOutput.failures,
          },
          expectedShape: {
            executiveSummary: "2-4 sentences naming at least one concrete issue",
            photoCritique: "1-3 sentences about visual quality",
            peerNarrative: "1-3 sentences comparing to peer data",
          },
        }),
      },
    ],
  });

  const text = response.content
    .filter((entry) => entry.type === "text")
    .map((entry) => entry.text)
    .join("\n");

  try {
    const parsed = synthesisSchema.parse(parseJson(text));
    return {
      ...parsed,
      tokensIn: response.usage.input_tokens,
      tokensOut: response.usage.output_tokens,
    };
  } catch (error) {
    console.warn("Failed to parse audit synthesis; using fallback", error);
    const fallback = fallbackSynthesis(input.restaurant, input.scorecard, input.collectorOutput);
    return {
      ...fallback,
      tokensIn: response.usage.input_tokens,
      tokensOut: response.usage.output_tokens,
    };
  }
}
