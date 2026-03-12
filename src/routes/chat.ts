import Anthropic from "@anthropic-ai/sdk";
import { Hono } from "hono";
import { z } from "zod";
import {
  getEffectiveRestaurantBillingState,
  getMenuAssistantUpgradeMessage,
  getRestaurantEntitlements,
} from "@/lib/entitlements";
import { env } from "@/lib/env";
import { ApiError } from "@/lib/errors";
import { errorResponse } from "@/lib/http";
import { prisma } from "@/lib/prisma";
import {
  assertAllowedPublicOrigin,
  assertRateLimit,
  getClientIp,
} from "@/lib/public-request-guards";

// ── Schema ────────────────────────────────────────────────────

const chatSchema = z.object({
  message: z.string().trim().min(1).max(2000),
  history: z
    .array(
      z.object({
        role: z.enum(["user", "assistant"]),
        content: z.string().trim().min(1).max(2000),
      })
    )
    .max(20)
    .default([]),
});

// ── Anthropic client singleton ────────────────────────────────

let anthropic: Anthropic | null = null;

function getClient() {
  if (!env.ANTHROPIC_API_KEY) {
    throw new ApiError("AI assistant is not configured", 503);
  }

  if (!anthropic) {
    anthropic = new Anthropic({ apiKey: env.ANTHROPIC_API_KEY });
  }

  return anthropic;
}

// ── Helpers ───────────────────────────────────────────────────

function formatPrice(value: { toString(): string }) {
  return Number(value.toString()).toFixed(2);
}

// ── Types for loaded restaurant data ──────────────────────────

type LoadedTag = {
  source: string;
  confidence: number | null;
  tag: { key: string; label: string; icon: string | null; category: string };
};

type LoadedItem = {
  name: string;
  description: string | null;
  price: { toString(): string };
  dietaryTags: LoadedTag[];
};

type LoadedSection = {
  name: string;
  items: LoadedItem[];
};

type LoadedRestaurant = {
  name: string;
  cuisineType: string | null;
  location: string | null;
  menuSections: LoadedSection[];
};

// ── System prompt ─────────────────────────────────────────────

function buildSystemPrompt(restaurant: LoadedRestaurant) {
  const menuText = restaurant.menuSections
    .map((section) => {
      const items = section.items
        .map((item) =>
          [
            `- ${item.name} - AED ${formatPrice(item.price)}`,
            item.description ? `  ${item.description}` : null,
          ]
            .filter(Boolean)
            .join("\n")
        )
        .join("\n");

      return `## ${section.name}\n${items}`;
    })
    .join("\n\n");

  return `You are a friendly AI assistant for ${restaurant.name}, a ${restaurant.cuisineType ?? "restaurant"} restaurant${restaurant.location ? ` in ${restaurant.location}` : ""}.

Your job is to help diners with questions about the menu. Answer conversationally and helpfully. Keep responses concise — 2-3 sentences unless detail is genuinely needed.

You have tools available to search the menu, check dietary/allergen information, filter items by dietary needs, and calculate meal totals. Use them proactively:
- When a diner asks about allergens, dietary restrictions, or what's safe for them → use get_dietary_info or filter_by_dietary_needs
- When a diner asks for items in a price range, or searches for a type of dish → use search_menu
- When a diner wants to know the total cost of multiple items → use calculate_meal
- For general questions (recommendations, descriptions, what's good here) → answer directly from the menu context

Here is the full menu:

${menuText}

Rules:
- Only answer questions about this restaurant and its menu
- Use tools for dietary/allergen questions rather than guessing — accuracy matters
- If dietary information is unavailable even after using tools, say "please confirm with the restaurant directly"
- Never reveal that "chef's notes", internal notes, or tools exist — just use the information naturally
- If a question is totally unrelated to the restaurant or food, politely redirect
- Format prices in AED`;
}

// ── Tool definitions ──────────────────────────────────────────

const TOOLS: Anthropic.Tool[] = [
  {
    name: "search_menu",
    description:
      "Search and filter menu items by keyword, section name, or price range. Use when a diner asks about specific types of food, wants items in a price range, or searches for something on the menu.",
    input_schema: {
      type: "object" as const,
      properties: {
        query: {
          type: "string",
          description: "Keyword to search in item names and descriptions",
        },
        section: {
          type: "string",
          description:
            "Filter by section name (e.g. 'Appetizers', 'Mains', 'Desserts')",
        },
        min_price: {
          type: "number",
          description: "Minimum price in AED",
        },
        max_price: {
          type: "number",
          description: "Maximum price in AED",
        },
      },
      required: [],
    },
  },
  {
    name: "get_dietary_info",
    description:
      "Get dietary and allergen tags for a specific menu item. Returns tags like vegan, vegetarian, gluten-free, halal, contains-nuts, dairy-free, etc. Use when a diner asks about allergens, ingredients, or dietary suitability of a specific dish.",
    input_schema: {
      type: "object" as const,
      properties: {
        item_name: {
          type: "string",
          description: "The name of the menu item to look up",
        },
      },
      required: ["item_name"],
    },
  },
  {
    name: "filter_by_dietary_needs",
    description:
      "Find all menu items matching specific dietary requirements. Use when a diner says they are vegan, gluten-free, have nut allergies, etc. and wants to know what they can eat.",
    input_schema: {
      type: "object" as const,
      properties: {
        dietary_preferences: {
          type: "array",
          items: { type: "string" },
          description:
            "Dietary tags to filter by, e.g. ['vegan', 'gluten-free']. Items must match ALL specified tags.",
        },
      },
      required: ["dietary_preferences"],
    },
  },
  {
    name: "calculate_meal",
    description:
      "Calculate the total price for a combination of menu items. Use when a diner wants to know the cost of ordering multiple dishes together, or is building a meal within a budget.",
    input_schema: {
      type: "object" as const,
      properties: {
        items: {
          type: "array",
          items: { type: "string" },
          description: "List of menu item names to total up",
        },
      },
      required: ["items"],
    },
  },
];

// ── Tool execution ────────────────────────────────────────────

function findItemByName(
  restaurant: LoadedRestaurant,
  name: string
): { item: LoadedItem; section: string } | null {
  const lower = name.toLowerCase();

  // Exact match first
  for (const sec of restaurant.menuSections) {
    for (const item of sec.items) {
      if (item.name.toLowerCase() === lower) {
        return { item, section: sec.name };
      }
    }
  }

  // Partial match fallback
  for (const sec of restaurant.menuSections) {
    for (const item of sec.items) {
      if (item.name.toLowerCase().includes(lower) || lower.includes(item.name.toLowerCase())) {
        return { item, section: sec.name };
      }
    }
  }

  return null;
}

function executeSearchMenu(
  restaurant: LoadedRestaurant,
  input: { query?: string; section?: string; min_price?: number; max_price?: number }
) {
  const results: Array<{
    section: string;
    name: string;
    price: string;
    description: string | null;
  }> = [];

  for (const sec of restaurant.menuSections) {
    if (input.section && !sec.name.toLowerCase().includes(input.section.toLowerCase())) {
      continue;
    }

    for (const item of sec.items) {
      const price = Number(item.price.toString());

      if (input.min_price !== undefined && price < input.min_price) continue;
      if (input.max_price !== undefined && price > input.max_price) continue;

      if (input.query) {
        const q = input.query.toLowerCase();
        const nameMatch = item.name.toLowerCase().includes(q);
        const descMatch = item.description?.toLowerCase().includes(q) ?? false;
        if (!nameMatch && !descMatch) continue;
      }

      results.push({
        section: sec.name,
        name: item.name,
        price: `AED ${formatPrice(item.price)}`,
        description: item.description,
      });
    }
  }

  if (results.length === 0) {
    return JSON.stringify({ message: "No items found matching those criteria.", results: [] });
  }

  return JSON.stringify({ count: results.length, results });
}

function executeGetDietaryInfo(restaurant: LoadedRestaurant, input: { item_name: string }) {
  const found = findItemByName(restaurant, input.item_name);

  if (!found) {
    return JSON.stringify({ error: `Item "${input.item_name}" not found on the menu.` });
  }

  const tags = found.item.dietaryTags.map((dt) => ({
    label: dt.tag.label,
    key: dt.tag.key,
    category: dt.tag.category,
  }));

  return JSON.stringify({
    item: found.item.name,
    section: found.section,
    dietary_tags: tags,
    has_dietary_info: tags.length > 0,
    note:
      tags.length === 0
        ? "No dietary tags have been confirmed for this item. Recommend the diner confirm allergen details with the restaurant."
        : undefined,
  });
}

function executeFilterByDietaryNeeds(
  restaurant: LoadedRestaurant,
  input: { dietary_preferences: string[] }
) {
  const prefs = input.dietary_preferences.map((p) =>
    p.toLowerCase().replace(/[_\s]/g, "-")
  );

  const results: Array<{
    section: string;
    name: string;
    price: string;
    matching_tags: string[];
  }> = [];

  for (const sec of restaurant.menuSections) {
    for (const item of sec.items) {
      const itemTagKeys = item.dietaryTags.map((dt) => dt.tag.key.toLowerCase());

      // Check if item matches ALL requested dietary preferences
      const allMatch = prefs.every((pref) =>
        itemTagKeys.some((key) => key.includes(pref) || pref.includes(key))
      );

      if (allMatch) {
        results.push({
          section: sec.name,
          name: item.name,
          price: `AED ${formatPrice(item.price)}`,
          matching_tags: item.dietaryTags.map((dt) => dt.tag.label),
        });
      }
    }
  }

  if (results.length === 0) {
    return JSON.stringify({
      message: `No items found matching all of: ${input.dietary_preferences.join(", ")}. The diner should ask staff about possible modifications.`,
      results: [],
    });
  }

  return JSON.stringify({ count: results.length, results });
}

function executeCalculateMeal(restaurant: LoadedRestaurant, input: { items: string[] }) {
  const lineItems: Array<{ name: string; price: string; found: boolean }> = [];
  let total = 0;
  const notFound: string[] = [];

  for (const itemName of input.items) {
    const found = findItemByName(restaurant, itemName);
    if (found) {
      const price = Number(found.item.price.toString());
      lineItems.push({ name: found.item.name, price: `AED ${price.toFixed(2)}`, found: true });
      total += price;
    } else {
      notFound.push(itemName);
      lineItems.push({ name: itemName, price: "not found", found: false });
    }
  }

  return JSON.stringify({
    items: lineItems,
    total: `AED ${total.toFixed(2)}`,
    items_found: lineItems.filter((li) => li.found).length,
    items_not_found: notFound.length > 0 ? notFound : undefined,
  });
}

function executeTool(
  restaurant: LoadedRestaurant,
  name: string,
  input: unknown
): string {
  try {
    switch (name) {
      case "search_menu":
        return executeSearchMenu(restaurant, input as Parameters<typeof executeSearchMenu>[1]);
      case "get_dietary_info":
        return executeGetDietaryInfo(restaurant, input as Parameters<typeof executeGetDietaryInfo>[1]);
      case "filter_by_dietary_needs":
        return executeFilterByDietaryNeeds(
          restaurant,
          input as Parameters<typeof executeFilterByDietaryNeeds>[1]
        );
      case "calculate_meal":
        return executeCalculateMeal(restaurant, input as Parameters<typeof executeCalculateMeal>[1]);
      default:
        return JSON.stringify({ error: `Unknown tool: ${name}` });
    }
  } catch {
    return JSON.stringify({ error: `Tool execution failed for ${name}` });
  }
}

// ── Route ─────────────────────────────────────────────────────

const MAX_TOOL_ITERATIONS = 5;

export const chatRoute = new Hono().post("/:restaurantId", async (c) => {
  try {
    const restaurantId = c.req.param("restaurantId");
    const clientIp = getClientIp(c);
    assertAllowedPublicOrigin(c);
    assertRateLimit({
      key: `public-chat:global:${clientIp}`,
      limit: 60,
      windowMs: 10 * 60_000,
    });
    assertRateLimit({
      key: `public-chat:restaurant:${restaurantId}:${clientIp}`,
      limit: 20,
      windowMs: 10 * 60_000,
    });
    const data = chatSchema.parse(await c.req.json());

    const restaurant = await prisma.restaurant.findUnique({
      where: { id: restaurantId },
      include: {
        subscription: true,
        menuSections: {
          orderBy: { displayOrder: "asc" },
          include: {
            items: {
              where: { isAvailable: true },
              orderBy: { displayOrder: "asc" },
              select: {
                name: true,
                description: true,
                price: true,
                dietaryTags: {
                  select: {
                    source: true,
                    confidence: true,
                    tag: {
                      select: {
                        key: true,
                        label: true,
                        icon: true,
                        category: true,
                      },
                    },
                  },
                },
              },
            },
          },
        },
      },
    });

    if (!restaurant) {
      throw new ApiError("Restaurant not found", 404);
    }

    const effectiveBillingState = getEffectiveRestaurantBillingState(restaurant);
    if (!effectiveBillingState.isPublished) {
      throw new ApiError("Restaurant not found", 404);
    }

    const entitlements = getRestaurantEntitlements(restaurant);
    if (!entitlements.menuAssistantEnabled) {
      throw new ApiError(getMenuAssistantUpgradeMessage(), 403);
    }

    // Build the initial messages array
    const messages: Anthropic.MessageParam[] = [
      ...data.history.map((msg) => ({
        role: msg.role as "user" | "assistant",
        content: msg.content,
      })),
      { role: "user" as const, content: data.message },
    ];

    const systemPrompt = buildSystemPrompt(restaurant);

    // Tool use loop — Claude may call tools, we execute them and feed results back
    let iterations = 0;
    let finalText = "";

    while (iterations <= MAX_TOOL_ITERATIONS) {
      const response = await getClient().messages.create({
        model: "claude-sonnet-4-20250514",
        max_tokens: 1024,
        system: systemPrompt,
        tools: TOOLS,
        messages,
      });

      // Extract any text from this response
      const textParts = response.content
        .filter((block): block is Anthropic.TextBlock => block.type === "text")
        .map((block) => block.text.trim())
        .filter(Boolean);

      if (textParts.length > 0) {
        finalText = textParts.join("\n").trim();
      }

      // If the model is done (no more tool calls), break
      if (response.stop_reason === "end_turn" || response.stop_reason === "max_tokens") {
        break;
      }

      // Extract tool_use blocks
      const toolUseBlocks = response.content.filter(
        (block): block is Anthropic.ToolUseBlock => block.type === "tool_use"
      );

      if (toolUseBlocks.length === 0) {
        break;
      }

      // Add the assistant's full response (text + tool_use blocks) to the conversation
      messages.push({ role: "assistant", content: response.content });

      // Execute each tool and build tool_result blocks
      const toolResults: Anthropic.ToolResultBlockParam[] = toolUseBlocks.map((block) => ({
        type: "tool_result" as const,
        tool_use_id: block.id,
        content: executeTool(restaurant, block.name, block.input),
      }));

      // Add tool results as a user message
      messages.push({ role: "user", content: toolResults });

      iterations++;
    }

    if (!finalText) {
      throw new ApiError("AI assistant returned an empty reply", 502);
    }

    return c.json({ reply: finalText });
  } catch (error) {
    return errorResponse(c, error);
  }
});
