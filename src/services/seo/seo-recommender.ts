import { z } from "zod";
import { getAnthropicClient } from "@/services/claude";
import type {
  CollectorOutput,
  RestaurantSeoContext,
  SeoActionTarget,
  SeoRecommendation,
  SeoScorecard,
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

const MAX_RECOMMENDATIONS = 8;

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

interface ResolvedAction {
  label: string;
  url: string;
  external: boolean;
}

function resolveActionTarget(
  target: SeoActionTarget | null | undefined,
  restaurant: RestaurantSeoContext
): ResolvedAction | null {
  if (!target) return null;
  switch (target) {
    case "edit_profile":
      return { label: "Edit profile", url: "/dashboard/appearance", external: false };
    case "edit_menu":
      return { label: "Edit menu", url: "/dashboard/menu", external: false };
    case "edit_photos":
      return { label: "Manage photos", url: "/dashboard/menu-photos", external: false };
    case "improve_descriptions":
      return { label: "Improve descriptions", url: "/dashboard/menu-insights", external: false };
    case "connect_gbp":
      return { label: "Connect Google", url: "/dashboard/google-business", external: false };
    case "open_gbp":
      return restaurant.gbpConnection?.gbpUrl
        ? { label: "Open Google profile", url: restaurant.gbpConnection.gbpUrl, external: true }
        : null;
    case "open_talabat":
      return restaurant.talabatUrl
        ? { label: "Open Talabat listing", url: restaurant.talabatUrl, external: true }
        : null;
    case "open_deliveroo":
      return restaurant.deliverooUrl
        ? { label: "Open Deliveroo listing", url: restaurant.deliverooUrl, external: true }
        : null;
    case "open_website":
      return restaurant.website
        ? { label: "Open website", url: restaurant.website, external: true }
        : null;
    default:
      return null;
  }
}

function attachAction(
  recommendation: Omit<SeoRecommendation, "dismissedAt"> & {
    actionTarget?: SeoActionTarget | null;
  },
  restaurant: RestaurantSeoContext
): SeoRecommendation {
  const resolved = resolveActionTarget(recommendation.actionTarget, restaurant);
  return {
    ...recommendation,
    actionTarget: recommendation.actionTarget ?? null,
    actionLabel: resolved?.label ?? null,
    actionUrl: resolved?.url ?? null,
    actionExternal: resolved?.external ?? false,
    dismissedAt: null,
  };
}

function pillarFallbackTarget(pillar: SeoScorecard["pillars"][keyof SeoScorecard["pillars"]]["key"]): SeoActionTarget {
  switch (pillar) {
    case "gbp":
      return "connect_gbp";
    case "onPage":
      return "open_website";
    case "citations":
      return "edit_profile";
    case "reviews":
      return "open_gbp";
    case "rankGrid":
    default:
      return "edit_profile";
  }
}

function fallbackRecommendations(
  scorecard: SeoScorecard,
  restaurant: RestaurantSeoContext
): SeoRecommendation[] {
  return Object.values(scorecard.pillars)
    .sort((a, b) => a.score - b.score)
    .slice(0, 5)
    .map((pillar) =>
      attachAction(
        {
          pillar: pillar.key,
          severity: pillar.score < 45 ? "high" : pillar.score < 70 ? "medium" : "low",
          title: `Improve ${pillar.label}`,
          why: pillar.summary,
          action: pillar.signals[0] ?? "Review this pillar and update missing listing details.",
          effort: "medium",
          impact: pillar.score < 70 ? "high" : "medium",
          actionTarget: pillarFallbackTarget(pillar.key),
        },
        restaurant
      )
    );
}

function parseJsonArray(text: string) {
  const normalized = text
    .trim()
    .replace(/^```json\s*/, "")
    .replace(/^```\s*/, "")
    .replace(/```$/, "")
    .trim();
  return JSON.parse(normalized);
}

export async function recommendSeoActions(input: {
  restaurant: RestaurantSeoContext;
  scorecard: SeoScorecard;
  collectorOutput: CollectorOutput;
}): Promise<{
  recommendations: SeoRecommendation[];
  tokensIn: number;
  tokensOut: number;
}> {
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
    max_tokens: 3500,
    system: `You are a MENA restaurant local SEO strategist. Return only valid JSON.
Create prioritized, concrete actions for restaurant owners based on local discovery signals from Google Maps, delivery apps, website SEO, local rank grid, and reviews.
Return between 1 and ${MAX_RECOMMENDATIONS} recommendations.
Use this exact JSON array shape:
[
  {
    "pillar": "gbp|onPage|rankGrid|citations|reviews",
    "severity": "critical|high|medium|low",
    "title": "short action title",
    "why": "why this matters",
    "action": "specific owner action",
    "effort": "low|medium|high",
    "impact": "low|medium|high",
    "actionTarget": "edit_profile|edit_menu|edit_photos|improve_descriptions|connect_gbp|open_gbp|open_talabat|open_deliveroo|open_website|null"
  }
]
Choose the single best actionTarget that points the owner to where they should DO the fix.
- edit_profile: name, address, phone, hours, website, delivery URLs (in our dashboard)
- edit_menu: menu structure, categories, items
- edit_photos: photo count, quality, missing photos
- improve_descriptions: dish descriptions, menu copy quality
- connect_gbp: Google Business Profile not connected or unverified
- open_gbp: respond to reviews, post updates on Google
- open_talabat / open_deliveroo: fix the listing on that delivery platform
- open_website: schema markup, mobile speed, on-site SEO technical fixes
Use null only when there is no sensible destination.
Keep actions grounded in the provided data. Do not invent exact rankings, reviews, phone numbers, or platform details.`,
    messages: [
      {
        role: "user",
        content: JSON.stringify({
          restaurantName: input.restaurant.name,
          scorecard: input.scorecard,
          signals: {
            gbp: input.collectorOutput.gbp,
            onPage: input.collectorOutput.onPage,
            rankGrid: input.collectorOutput.rankGrid,
            citations: input.collectorOutput.citations,
            reviews: input.collectorOutput.reviews
              ? {
                  averageRating: input.collectorOutput.reviews.averageRating,
                  responseRate: input.collectorOutput.reviews.responseRate,
                  themes: input.collectorOutput.reviews.themes,
                  sampleSize: input.collectorOutput.reviews.reviews.length,
                }
              : null,
            failures: input.collectorOutput.failures,
          },
        }),
      },
    ],
  });

  const text = response.content
    .filter((entry) => entry.type === "text")
    .map((entry) => entry.text)
    .join("\n");
  let parsed: z.infer<typeof recommendationsSchema>;
  try {
    parsed = recommendationsSchema
      .parse(parseJsonArray(text))
      .slice(0, MAX_RECOMMENDATIONS);
  } catch (error) {
    console.warn("Failed to parse SEO recommendations; using fallback", error);
    return {
      recommendations: fallbackRecommendations(input.scorecard, input.restaurant),
      tokensIn: response.usage.input_tokens,
      tokensOut: response.usage.output_tokens,
    };
  }

  return {
    recommendations: parsed.map((recommendation) =>
      attachAction(recommendation, input.restaurant)
    ),
    tokensIn: response.usage.input_tokens,
    tokensOut: response.usage.output_tokens,
  };
}
