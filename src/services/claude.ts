import Anthropic from "@anthropic-ai/sdk";
import { z } from "zod";
import { env } from "@/lib/env";
import { ApiError } from "@/lib/errors";
import type { MenuExtractionDraft } from "./types";

const MENU_EXTRACTION_TOOL_NAME = "record_menu_extraction";
const MENU_EXTRACTION_MAX_TOKENS = 16384;

const SYSTEM_PROMPT = [
  "You are a menu extraction assistant for restaurants.",
  "Extract all visible menu sections, item names, descriptions, and prices from the provided text, image, or PDF.",
  "Use 0 for prices that are missing or unreadable.",
  "Preserve the restaurant's original section and dish wording where practical.",
  "Call the record_menu_extraction tool with the complete extracted menu.",
].join(" ");

const priceSchema = z.preprocess((value) => {
  if (typeof value === "string") {
    const numeric = Number(value.replace(/[^\d.-]/g, ""));
    return Number.isFinite(numeric) ? numeric : 0;
  }

  return value;
}, z.number().finite().nonnegative().default(0));

const menuExtractionSchema = z.object({
  sections: z.array(
    z.object({
      name: z.string().trim().min(1),
      items: z.array(
        z.object({
          name: z.string().trim().min(1),
          description: z.string().trim().nullable().default(null),
          price: priceSchema,
        })
      ),
    })
  ),
});

const MENU_EXTRACTION_TOOL: Anthropic.Tool = {
  name: MENU_EXTRACTION_TOOL_NAME,
  description: "Record the complete structured restaurant menu extracted from the source document.",
  input_schema: {
    type: "object",
    additionalProperties: false,
    properties: {
      sections: {
        type: "array",
        description: "All menu sections in reading order.",
        items: {
          type: "object",
          additionalProperties: false,
          properties: {
            name: {
              type: "string",
              description: "Section name, such as Starters, Mains, Desserts, or Beverages.",
            },
            items: {
              type: "array",
              description: "Menu items in this section.",
              items: {
                type: "object",
                additionalProperties: false,
                properties: {
                  name: {
                    type: "string",
                    description: "Menu item name exactly as shown where practical.",
                  },
                  description: {
                    type: ["string", "null"],
                    description: "Item description if present, otherwise null.",
                  },
                  price: {
                    type: "number",
                    description: "Numeric price only. Use 0 when missing or unreadable.",
                  },
                },
                required: ["name", "description", "price"],
              },
            },
          },
          required: ["name", "items"],
        },
      },
    },
    required: ["sections"],
  },
};

let anthropic: Anthropic | null = null;

export function getAnthropicClient() {
  if (!env.ANTHROPIC_API_KEY) {
    return null;
  }

  if (!anthropic) {
    anthropic = new Anthropic({ apiKey: env.ANTHROPIC_API_KEY });
  }

  return anthropic;
}

function safeJsonParse(input: string): MenuExtractionDraft {
  const normalized = input
    .trim()
    .replace(/^```json/, "")
    .replace(/^```/, "")
    .replace(/```$/, "")
    .trim();

  let parsed: unknown;
  try {
    parsed = JSON.parse(normalized);
  } catch {
    throw new ApiError("Menu extraction returned incomplete JSON. Please try again.", 502);
  }

  try {
    return validateMenuExtraction(parsed);
  } catch {
    throw new ApiError("Menu extraction response did not match the expected structure.", 502);
  }
}

function validateMenuExtraction(input: unknown): MenuExtractionDraft {
  const parsed = menuExtractionSchema.parse(input);

  if (!Array.isArray(parsed.sections)) {
    throw new ApiError("Claude extraction response was not valid JSON", 502);
  }

  return parsed;
}

function fallbackExtraction(sourceText: string): MenuExtractionDraft {
  const lines = sourceText
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter(Boolean);

  if (!lines.length) {
    return { sections: [] };
  }

  return {
    sections: [
      {
        name: "Imported Menu",
        items: lines.map((line, index) => ({
          name: line.replace(/\s+-\s+AED\s+\d+.*/, ""),
          description: null,
          price: index + 1,
        })),
      },
    ],
  };
}

export async function extractMenuFromSource(input: {
  sourceText?: string;
  fileName?: string;
  contentType?: string;
  base64?: string;
}) {
  const client = getAnthropicClient();
  const fallbackSource = [
    input.fileName ? `File: ${input.fileName}` : null,
    input.sourceText,
  ]
    .filter(Boolean)
    .join("\n\n");

  if (!client) {
    return fallbackExtraction(fallbackSource);
  }

  const response = await client.messages.create({
    model: "claude-sonnet-4-6",
    max_tokens: MENU_EXTRACTION_MAX_TOKENS,
    system: SYSTEM_PROMPT,
    tools: [MENU_EXTRACTION_TOOL],
    tool_choice: {
      type: "tool",
      name: MENU_EXTRACTION_TOOL_NAME,
    },
    messages: [
      {
        role: "user",
        content: [
          ...(input.base64 && input.contentType
            ? [
                input.contentType === "application/pdf"
                  ? {
                      type: "document" as const,
                      source: {
                        type: "base64" as const,
                        media_type: "application/pdf" as const,
                        data: input.base64,
                      },
                    }
                  : {
                      type: "image" as const,
                      source: {
                        type: "base64" as const,
                        media_type: input.contentType as
                          | "image/jpeg"
                          | "image/png"
                          | "image/gif"
                          | "image/webp",
                        data: input.base64,
                      },
                    },
              ]
            : []),
          {
            type: "text" as const,
            text:
              fallbackSource ||
              "Extract the menu from the attached menu asset and return valid JSON only.",
          },
        ] as any,
      },
    ],
  });

  if (response.stop_reason === "max_tokens") {
    throw new ApiError(
      "Menu extraction was too large and was cut off. Please try a shorter menu or fewer pages.",
      502
    );
  }

  const toolUse = response.content.find(
    (entry): entry is Anthropic.ToolUseBlock =>
      entry.type === "tool_use" && entry.name === MENU_EXTRACTION_TOOL_NAME
  );

  if (toolUse) {
    try {
      return validateMenuExtraction(toolUse.input);
    } catch {
      throw new ApiError("Menu extraction response did not match the expected structure.", 502);
    }
  }

  const text = response.content
    .filter((entry) => entry.type === "text")
    .map((entry) => entry.text)
    .join("\n");

  if (!text.trim()) {
    throw new ApiError("Menu extraction returned no structured result.", 502);
  }

  return safeJsonParse(text);
}
