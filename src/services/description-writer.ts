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
  price: number | string;
  sectionName: string;
}

interface RestaurantContext {
  name: string;
  cuisineType: string | null;
  location: string | null;
}

type Tone = "casual" | "upscale" | "playful" | "formal";

export async function enhanceSingleDescription(
  item: MenuItemInput,
  restaurant: RestaurantContext,
  tone?: Tone
): Promise<{ description: string; tokensIn: number; tokensOut: number }> {
  const client = getClient();
  if (!client) {
    throw new Error("AI service not configured");
  }

  const toneDirective = tone
    ? `Write in a ${tone} tone.`
    : "Write in a warm, inviting tone appropriate for the cuisine.";

  const response = await client.messages.create({
    model: "claude-sonnet-4-6",
    max_tokens: 300,
    system: `You are a menu copywriter for Dubai restaurants. Write a single compelling menu description.

Rules:
- Keep under 180 characters
- Use sensory language (taste, texture, aroma)
- Never invent ingredients not implied by the dish name
- Be culturally appropriate for Dubai's dining scene
- ${toneDirective}
- Return ONLY the description text, nothing else`,
    messages: [
      {
        role: "user",
        content: `Restaurant: ${restaurant.name}
Cuisine: ${restaurant.cuisineType ?? "International"}
Location: ${restaurant.location ?? "Dubai"}
Section: ${item.sectionName}
Dish: ${item.name}
Price: AED ${item.price}
${item.description ? `Current description: ${item.description}` : "No description yet."}

Write an enhanced menu description for this dish.`,
      },
    ],
  });

  const text = response.content
    .filter((b) => b.type === "text")
    .map((b) => b.text)
    .join("")
    .trim();

  return {
    description: text,
    tokensIn: response.usage.input_tokens,
    tokensOut: response.usage.output_tokens,
  };
}

export async function enhanceBulkDescriptions(
  items: MenuItemInput[],
  restaurant: RestaurantContext,
  mode: "missing" | "weak" | "all",
  tone?: Tone
): Promise<{
  suggestions: Record<string, string>;
  tokensIn: number;
  tokensOut: number;
}> {
  const client = getClient();
  if (!client) {
    throw new Error("AI service not configured");
  }

  const filtered = items.filter((item) => {
    if (mode === "all") return true;
    if (mode === "missing") return !item.description;
    // "weak" = missing or under 30 chars
    return !item.description || item.description.length < 30;
  });

  if (!filtered.length) {
    return { suggestions: {}, tokensIn: 0, tokensOut: 0 };
  }

  const toneDirective = tone
    ? `Write in a ${tone} tone.`
    : "Write in a warm, inviting tone appropriate for the cuisine.";

  const menuListing = filtered
    .map(
      (item) =>
        `- ID: ${item.id} | Section: ${item.sectionName} | Name: ${item.name} | Price: AED ${item.price} | Description: ${item.description ?? "(none)"}`
    )
    .join("\n");

  const response = await client.messages.create({
    model: "claude-sonnet-4-6",
    max_tokens: 4096,
    system: `You are a menu copywriter for Dubai restaurants. Write compelling descriptions for multiple menu items, maintaining a consistent voice.

Rules:
- Keep each description under 180 characters
- Use sensory language (taste, texture, aroma)
- Never invent ingredients not implied by the dish name
- Be culturally appropriate for Dubai's dining scene
- ${toneDirective}
- Maintain consistent voice across all items
- Return ONLY valid JSON: { "suggestions": { "itemId": "description", ... } }`,
    messages: [
      {
        role: "user",
        content: `Restaurant: ${restaurant.name}
Cuisine: ${restaurant.cuisineType ?? "International"}
Location: ${restaurant.location ?? "Dubai"}

Menu items to enhance:
${menuListing}

Write enhanced descriptions for each item. Return JSON mapping item ID to description.`,
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

  const parsed = JSON.parse(text) as { suggestions: Record<string, string> };

  return {
    suggestions: parsed.suggestions ?? {},
    tokensIn: response.usage.input_tokens,
    tokensOut: response.usage.output_tokens,
  };
}
