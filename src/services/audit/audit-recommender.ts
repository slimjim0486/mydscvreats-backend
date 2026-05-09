import { z } from "zod";
import { getAnthropicClient } from "@/services/claude";
import type {
  SeoActionTarget,
  SeoRecommendation,
  SeoSeverity,
} from "@/services/seo/types";
import type {
  AuditCollectorOutput,
  AuditRecommendationResult,
  AuditRestaurantContext,
  AuditScorecard,
} from "./types";

const ACTION_TARGETS = [
  "edit_profile",
  "edit_menu",
  "edit_photos",
  "improve_descriptions",
  "connect_gbp",
  "open_gbp",
  "open_talabat",
  "open_deliveroo",
  "open_website",
] as const;

const recommendationSchema = z.object({
  pillar: z.enum(["gbp", "onPage", "rankGrid", "citations", "reviews"]),
  severity: z.enum(["critical", "high", "medium", "low"]),
  title: z.string().min(1).max(140),
  why: z.string().min(1).max(500),
  action: z.string().min(1).max(700),
  effort: z.enum(["low", "medium", "high"]),
  impact: z.enum(["low", "medium", "high"]),
  actionTarget: z.enum(ACTION_TARGETS).nullable().optional(),
});

const recommendationsSchema = z.array(recommendationSchema).min(1);

function parseJsonArray(text: string) {
  const normalized = text
    .trim()
    .replace(/^```json\s*/, "")
    .replace(/^```\s*/, "")
    .replace(/```$/, "")
    .trim();
  return JSON.parse(normalized);
}

function fallbackSeverity(score: number): SeoSeverity {
  if (score < 40) return "critical";
  if (score < 58) return "high";
  if (score < 74) return "medium";
  return "low";
}

function fallbackTarget(key: string): SeoActionTarget {
  if (key === "photo") return "edit_photos";
  if (key === "delivery") return "open_talabat";
  if (key === "mobile") return "open_website";
  if (key === "reputation") return "open_gbp";
  return "edit_profile";
}

function toSeoPillar(key: string): SeoRecommendation["pillar"] {
  if (key === "reputation") return "reviews";
  if (key === "delivery") return "citations";
  if (key === "mobile") return "onPage";
  return "gbp";
}

function attachAction(
  recommendation: z.infer<typeof recommendationSchema>,
  restaurant: AuditRestaurantContext
): SeoRecommendation {
  const target = recommendation.actionTarget ?? null;
  const action = resolveActionTarget(target, restaurant);
  return {
    ...recommendation,
    actionTarget: target,
    actionLabel: action?.label ?? null,
    actionUrl: action?.url ?? null,
    actionExternal: action?.external ?? false,
    dismissedAt: null,
  };
}

function resolveActionTarget(
  target: SeoActionTarget | null,
  restaurant: AuditRestaurantContext
) {
  if (!target) return null;
  switch (target) {
    case "open_gbp":
      return restaurant.gbpConnection?.gbpUrl
        ? { label: "Open Google profile", url: restaurant.gbpConnection.gbpUrl, external: true }
        : null;
    case "open_talabat":
      return restaurant.talabatUrl
        ? { label: "Open Talabat", url: restaurant.talabatUrl, external: true }
        : null;
    case "open_deliveroo":
      return restaurant.deliverooUrl
        ? { label: "Open Deliveroo", url: restaurant.deliverooUrl, external: true }
        : null;
    case "open_website":
      return restaurant.website
        ? { label: "Open website", url: restaurant.website, external: true }
        : null;
    case "edit_photos":
      return { label: "Improve photos", url: "/dashboard/menu-photos", external: false };
    case "edit_menu":
      return { label: "Improve menu", url: "/dashboard/menu", external: false };
    case "improve_descriptions":
      return { label: "Improve descriptions", url: "/dashboard/menu-insights", external: false };
    case "connect_gbp":
      return { label: "Connect Google", url: "/dashboard/google-business", external: false };
    case "edit_profile":
    default:
      return { label: "Fix profile", url: "/dashboard/appearance", external: false };
  }
}

function fallbackRecommendations(
  scorecard: AuditScorecard,
  restaurant: AuditRestaurantContext
): SeoRecommendation[] {
  return Object.values(scorecard.pillars)
    .sort((a, b) => a.score - b.score)
    .slice(0, 5)
    .map((pillar) =>
      attachAction(
        {
          pillar: toSeoPillar(pillar.key),
          severity: fallbackSeverity(pillar.score),
          title: `Improve ${pillar.label}`,
          why: pillar.summary,
          action: pillar.signals[0] ?? "Review this area and fix missing restaurant discovery signals.",
          effort: "medium",
          impact: pillar.score < 70 ? "high" : "medium",
          actionTarget: fallbackTarget(pillar.key),
        },
        restaurant
      )
    );
}

export async function recommendAuditActions(input: {
  restaurant: AuditRestaurantContext;
  scorecard: AuditScorecard;
  collectorOutput: AuditCollectorOutput;
}): Promise<AuditRecommendationResult> {
  const client = getAnthropicClient();
  if (!client) {
    return {
      recommendations: fallbackRecommendations(input.scorecard, input.restaurant),
      tokensIn: 0,
      tokensOut: 0,
    };
  }

  const response = await client.messages.create({
    model: "claude-sonnet-4-6",
    max_tokens: 2600,
    system: `You are a MENA restaurant growth strategist. Return only valid JSON.
Create concrete recommendations from Google profile, reviews, delivery platform presence, photo quality, mobile website, and peer benchmark data.
Use the same JSON schema as Bustan SEO recommendations. For photo issues use pillar "gbp"; for mobile issues use "onPage"; for delivery issues use "citations".
Do not invent platform URLs, ratings, reviews, or photos.`,
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
          signals: input.collectorOutput,
        }),
      },
    ],
  });

  const text = response.content
    .filter((entry) => entry.type === "text")
    .map((entry) => entry.text)
    .join("\n");

  try {
    const parsed = recommendationsSchema.parse(parseJsonArray(text)).slice(0, 8);
    return {
      recommendations: parsed.map((recommendation) =>
        attachAction(recommendation, input.restaurant)
      ),
      tokensIn: response.usage.input_tokens,
      tokensOut: response.usage.output_tokens,
    };
  } catch (error) {
    console.warn("Failed to parse audit recommendations; using fallback", error);
    return {
      recommendations: fallbackRecommendations(input.scorecard, input.restaurant),
      tokensIn: response.usage.input_tokens,
      tokensOut: response.usage.output_tokens,
    };
  }
}
