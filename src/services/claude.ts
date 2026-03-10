import Anthropic from "@anthropic-ai/sdk";
import { env } from "@/lib/env";
import { ApiError } from "@/lib/errors";
import type { MenuExtractionDraft } from "./types";

const SYSTEM_PROMPT = `You are a menu extraction assistant. Parse the provided menu image or PDF and return a JSON object in this exact format:
{
  "sections": [
    {
      "name": "Section Name",
      "items": [
        {
          "name": "Item Name",
          "description": "Item description if present",
          "price": 0.00
        }
      ]
    }
  ]
}
Return ONLY valid JSON. No preamble, no explanation.`;

let anthropic: Anthropic | null = null;

function getClient() {
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

  const parsed = JSON.parse(normalized) as MenuExtractionDraft;

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
  const client = getClient();
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
    max_tokens: 4096,
    system: SYSTEM_PROMPT,
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

  const text = response.content
    .filter((entry) => entry.type === "text")
    .map((entry) => entry.text)
    .join("\n");

  return safeJsonParse(text);
}
