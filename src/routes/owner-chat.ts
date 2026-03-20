import Anthropic from "@anthropic-ai/sdk";
import { Hono } from "hono";
import { z } from "zod";
import { getRestaurantEntitlements } from "@/lib/entitlements";
import { getAiUsageSummary, logAiUsage } from "@/lib/ai-usage";
import { env } from "@/lib/env";
import { ApiError } from "@/lib/errors";
import { errorResponse } from "@/lib/http";
import { buildOwnerSystemPrompt } from "@/lib/owner-chat-prompts";
import { prisma } from "@/lib/prisma";
import { assertRateLimit } from "@/lib/public-request-guards";
import { requireAuth } from "@/middleware/auth";
import { OWNER_TOOLS, executeTool } from "@/services/owner-chat-tools";

// ── Schema ─────────────────────────────────────────────────────

const ownerChatSchema = z.object({
  message: z.string().trim().min(1).max(2000),
  history: z
    .array(
      z.object({
        role: z.enum(["user", "assistant"]),
        content: z.string().trim().min(1).max(4000),
      })
    )
    .max(30)
    .default([]),
});

// ── Anthropic client ───────────────────────────────────────────

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

// ── SSE helpers ────────────────────────────────────────────────

function sseEvent(event: string, data: unknown): string {
  return `event: ${event}\ndata: ${JSON.stringify(data)}\n\n`;
}

// ── Input guardrails ──────────────────────────────────────────

const INJECTION_PATTERNS = [
  /ignore\s+(all\s+)?(previous|prior|above|your)\s+(instructions|rules|prompts?)/i,
  /forget\s+(all\s+)?(previous|prior|above|your)\s+(instructions|rules|prompts?)/i,
  /disregard\s+(all\s+)?(previous|prior|above|your)\s+(instructions|rules|prompts?)/i,
  /new\s+(system\s+)?(instructions?|rules?|prompt)/i,
  /system\s*:\s*/i,
  /\[INST\]/i,
  /<<\s*SYS\s*>>/i,
  /output\s+(everything|all|the\s+text)\s+(above|before)/i,
  /repeat\s+(your|the)\s+(system\s+)?(prompt|instructions)/i,
  /what\s+(are|were)\s+your\s+(instructions|rules|system\s+prompt)/i,
  /reveal\s+(your|the)\s+(system\s+)?(prompt|instructions)/i,
  /jailbreak/i,
  /DAN\s+mode/i,
  /developer\s+mode\s+(enabled|on|activate)/i,
];

const INJECTION_REFUSAL =
  "I'm Sous Chef, your restaurant assistant! How can I help you manage your restaurant today?";

function checkInjection(message: string): string | null {
  for (const pattern of INJECTION_PATTERNS) {
    if (pattern.test(message)) {
      return INJECTION_REFUSAL;
    }
  }
  return null;
}

// ── Route ──────────────────────────────────────────────────────

const MAX_TOOL_ITERATIONS = 8;

export const ownerChatRoute = new Hono<{
  Variables: {
    auth: { clerkId: string; email: string | null };
  };
}>().post("/:restaurantId", requireAuth, async (c) => {
  try {
    const auth = c.get("auth");
    const restaurantId = c.req.param("restaurantId");

    // Rate limits
    assertRateLimit({
      key: `owner-chat:restaurant:${restaurantId}`,
      limit: 60,
      windowMs: 10 * 60_000,
    });
    assertRateLimit({
      key: `owner-chat:user:${auth.clerkId}`,
      limit: 120,
      windowMs: 10 * 60_000,
    });

    const data = ownerChatSchema.parse(await c.req.json());

    // Input guardrail
    const refusal = checkInjection(data.message);
    if (refusal) {
      c.header("Content-Type", "text/event-stream");
      c.header("Cache-Control", "no-cache");
      c.header("Connection", "keep-alive");

      const body = sseEvent("text", { delta: refusal }) + sseEvent("done", {});
      return c.body(body);
    }

    // Load restaurant with ownership check
    const restaurant = await prisma.restaurant.findFirst({
      where: {
        id: restaurantId,
        owner: { clerkId: auth.clerkId },
      },
      include: {
        subscription: true,
        operatorAccount: {
          include: { _count: { select: { brands: true } } },
        },
        _count: {
          select: {
            menuSections: true,
          },
        },
      },
    });

    if (!restaurant) {
      throw new ApiError("Restaurant not found", 404);
    }

    const entitlements = getRestaurantEntitlements(restaurant);

    // Entitlement gate: require Pro or Portfolio
    if (!entitlements.menuAssistantEnabled) {
      throw new ApiError(
        "Sous Chef is available on Pro and Portfolio plans. Upgrade to unlock your AI assistant.",
        403
      );
    }

    // Get menu item count for context
    const totalItems = await prisma.menuItem.count({ where: { restaurantId } });

    // Get AI usage for context
    const [descUsage, tagUsage, analysisUsage, imageUsage] = await Promise.all([
      getAiUsageSummary(restaurantId, "description_enhance"),
      getAiUsageSummary(restaurantId, "tag_analysis"),
      getAiUsageSummary(restaurantId, "menu_analysis"),
      getAiUsageSummary(restaurantId, "image_enhancement"),
    ]);

    const systemPrompt = buildOwnerSystemPrompt(
      {
        id: restaurant.id,
        name: restaurant.name,
        slug: restaurant.slug,
        cuisineType: restaurant.cuisineType,
        location: restaurant.location,
        isPublished: restaurant.isPublished,
        description: restaurant.description,
        plan: entitlements.plan,
        totalSections: restaurant._count.menuSections,
        totalItems,
      },
      entitlements,
      {
        descriptions: { used: descUsage.used, limit: entitlements.aiDescriptionLimit },
        tags: { used: tagUsage.used, limit: entitlements.aiTagAnalysisLimit },
        analysis: { used: analysisUsage.used, limit: entitlements.analysisLimit },
        images: { used: imageUsage.used, limit: entitlements.imageEnhancementLimit },
      }
    );

    // Build messages with injection delimiter
    const wrapOwnerMessage = (text: string) => `<owner_message>${text}</owner_message>`;

    const messages: Anthropic.MessageParam[] = [
      ...data.history.map((msg) => ({
        role: msg.role as "user" | "assistant",
        content: msg.role === "user" ? wrapOwnerMessage(msg.content) : msg.content,
      })),
      { role: "user" as const, content: wrapOwnerMessage(data.message) },
    ];

    const client = getClient();
    let totalInputTokens = 0;
    let totalOutputTokens = 0;

    // Stream via ReadableStream
    const stream = new ReadableStream({
      async start(controller) {
        const encoder = new TextEncoder();

        function emit(event: string, data: unknown) {
          controller.enqueue(encoder.encode(sseEvent(event, data)));
        }

        try {
          let iterations = 0;

          while (iterations <= MAX_TOOL_ITERATIONS) {
            const response = await client.messages.create({
              model: "claude-sonnet-4-20250514",
              max_tokens: 1024,
              system: systemPrompt,
              tools: OWNER_TOOLS,
              messages,
            });

            totalInputTokens += response.usage.input_tokens;
            totalOutputTokens += response.usage.output_tokens;

            // Stream text blocks
            for (const block of response.content) {
              if (block.type === "text" && block.text.trim()) {
                emit("text", { delta: block.text });
              }
            }

            // If done (no tool calls), break
            if (response.stop_reason === "end_turn" || response.stop_reason === "max_tokens") {
              break;
            }

            // Extract tool use blocks
            const toolUseBlocks = response.content.filter(
              (block): block is Anthropic.ToolUseBlock => block.type === "tool_use"
            );

            if (toolUseBlocks.length === 0) {
              break;
            }

            // Add assistant response to messages
            messages.push({ role: "assistant", content: response.content });

            // Execute tools and build results
            const toolResults: Anthropic.ToolResultBlockParam[] = [];

            for (const block of toolUseBlocks) {
              emit("tool_start", { tool: block.name, id: block.id });

              const result = await executeTool(
                block.name,
                restaurantId,
                auth.clerkId,
                entitlements,
                block.input as Record<string, unknown>
              );

              // If there's a preview, emit it
              if (result.preview) {
                emit("preview", result.preview);
              }

              toolResults.push({
                type: "tool_result" as const,
                tool_use_id: block.id,
                content: result.content,
              });

              emit("tool_done", { tool: block.name, id: block.id });
            }

            // Add tool results as user message
            messages.push({ role: "user", content: toolResults });

            iterations++;
          }

          emit("done", {});
        } catch (error) {
          const message =
            error instanceof Error ? error.message : "An error occurred";
          emit("error", { message });
        } finally {
          // Log usage
          if (totalInputTokens > 0 || totalOutputTokens > 0) {
            logAiUsage(restaurantId, "owner_chat", totalInputTokens, totalOutputTokens).catch(
              (err) => console.error("Failed to log owner chat usage:", err)
            );
          }

          controller.close();
        }
      },
    });

    return new Response(stream, {
      headers: {
        "Content-Type": "text/event-stream",
        "Cache-Control": "no-cache",
        Connection: "keep-alive",
      },
    });
  } catch (error) {
    // For non-streaming errors (auth, validation, etc.)
    return errorResponse(c, error);
  }
});
