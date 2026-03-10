import Anthropic from "@anthropic-ai/sdk";
import { env } from "@/lib/env";

let anthropic: Anthropic | null = null;

function getClient(): Anthropic | null {
  if (!env.ANTHROPIC_API_KEY) return null;
  if (!anthropic) {
    anthropic = new Anthropic({ apiKey: env.ANTHROPIC_API_KEY });
  }
  return anthropic;
}

interface MenuItemInput {
  id: string;
  name: string;
  description: string | null;
  sectionName: string;
}

interface RestaurantContext {
  name: string;
  cuisineType: string | null;
}

export interface TagSuggestion {
  tagKey: string;
  confidence: number;
  reasoning: string;
}

export interface ItemTagSuggestions {
  menuItemId: string;
  tags: TagSuggestion[];
}

const VALID_TAG_KEYS = [
  "vegetarian",
  "vegan",
  "gluten_free",
  "dairy_free",
  "nut_free",
  "contains_nuts",
  "contains_shellfish",
  "contains_soy",
  "contains_eggs",
  "halal",
  "spicy",
  "mild",
];

export async function suggestDietaryTags(
  restaurant: RestaurantContext,
  items: MenuItemInput[]
): Promise<{
  suggestions: ItemTagSuggestions[];
  tokensIn: number;
  tokensOut: number;
}> {
  const client = getClient();
  if (!client) {
    throw new Error("AI service not configured");
  }

  if (!items.length) {
    return { suggestions: [], tokensIn: 0, tokensOut: 0 };
  }

  const menuListing = items
    .map(
      (item) =>
        `- ID: ${item.id} | Section: ${item.sectionName} | Name: ${item.name} | Description: ${item.description ?? "(none)"}`
    )
    .join("\n");

  const response = await client.messages.create({
    model: "claude-sonnet-4-6",
    max_tokens: 4096,
    system: `You are a food allergen and dietary classification expert analyzing a Dubai restaurant menu.

Available tags: ${VALID_TAG_KEYS.join(", ")}

Rules:
- Be CONSERVATIVE: only tag what is confidently inferable from the dish name and description
- For allergens (contains_nuts, contains_shellfish, etc.), flag when the ingredient is LIKELY present based on dish name/description
- For dietary tags (vegetarian, vegan, etc.), only tag if the dish clearly qualifies
- Most Dubai restaurants serve halal food — tag "halal" if the restaurant cuisine suggests it (Arabic, Indian, Pakistani, Turkish, etc.)
- Confidence: 0.9+ = very confident, 0.7-0.89 = likely, 0.5-0.69 = possible
- Only include tags with confidence >= 0.5
- Return ONLY valid JSON in this format:
{ "suggestions": [{ "menuItemId": "id", "tags": [{ "tagKey": "tag", "confidence": 0.9, "reasoning": "brief reason" }] }] }`,
    messages: [
      {
        role: "user",
        content: `Restaurant: ${restaurant.name}
Cuisine: ${restaurant.cuisineType ?? "International"}

Menu items:
${menuListing}

Analyze each item and suggest dietary/allergen tags.`,
      },
    ],
  });

  const text = response.content
    .filter((b) => b.type === "text")
    .map((b) => b.text)
    .join("")
    .trim()
    .replace(/^```json\s*/, "")
    .replace(/^```\s*/, "")
    .replace(/```$/, "")
    .trim();

  const parsed = JSON.parse(text) as { suggestions: ItemTagSuggestions[] };

  // Filter to only valid tag keys
  const validated = (parsed.suggestions ?? []).map((item) => ({
    ...item,
    tags: item.tags.filter((t) => VALID_TAG_KEYS.includes(t.tagKey)),
  }));

  return {
    suggestions: validated,
    tokensIn: response.usage.input_tokens,
    tokensOut: response.usage.output_tokens,
  };
}
