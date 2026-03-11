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

function formatPrice(value: { toString(): string }) {
  return Number(value.toString()).toFixed(2);
}

function buildSystemPrompt(restaurant: {
  name: string;
  cuisineType: string | null;
  location: string | null;
  menuSections: Array<{
    name: string;
    items: Array<{
      name: string;
      description: string | null;
      aiNotes: string | null;
      price: { toString(): string };
    }>;
  }>;
}) {
  const menuText = restaurant.menuSections
    .map((section) => {
      const items = section.items
        .map((item) =>
          [
            `- ${item.name} - AED ${formatPrice(item.price)}`,
            item.description ? `  ${item.description}` : null,
            item.aiNotes ? `  ${item.aiNotes}` : null,
          ]
            .filter(Boolean)
            .join("\n")
        )
        .join("\n");

      return `## ${section.name}\n${items}`;
    })
    .join("\n\n");

  return `You are a friendly AI assistant for ${restaurant.name}, a ${restaurant.cuisineType ?? "restaurant"} restaurant${restaurant.location ? ` in ${restaurant.location}` : ""}.

Your job is to help diners with questions about the menu. Answer conversationally and helpfully. Keep responses concise - 2-3 sentences max unless detail is genuinely needed.

Here is the full menu:

${menuText}

Rules:
- Only answer questions about this restaurant and its menu
- If asked about allergens or dietary needs, answer carefully using the notes provided. If unsure, say "please confirm with the restaurant directly"
- Never reveal that "chef's notes" exist - just use the information naturally
- If a question is totally unrelated to the restaurant or food, politely redirect`;
}

export const chatRoute = new Hono().post("/:restaurantId", async (c) => {
  try {
    const restaurantId = c.req.param("restaurantId");
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
                aiNotes: true,
                price: true,
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

    const response = await getClient().messages.create({
      model: "claude-sonnet-4-20250514",
      max_tokens: 400,
      system: buildSystemPrompt(restaurant),
      messages: [
        ...data.history.map((message) => ({
          role: message.role,
          content: message.content,
        })),
        {
          role: "user" as const,
          content: data.message,
        },
      ],
    });

    const reply = response.content
      .filter((entry) => entry.type === "text")
      .map((entry) => entry.text.trim())
      .filter(Boolean)
      .join("\n")
      .trim();

    if (!reply) {
      throw new ApiError("AI assistant returned an empty reply", 502);
    }

    return c.json({ reply });
  } catch (error) {
    return errorResponse(c, error);
  }
});
