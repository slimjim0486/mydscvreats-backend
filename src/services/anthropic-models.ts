import Anthropic from "@anthropic-ai/sdk";
import { env } from "@/lib/env";

export const DEFAULT_SOUS_CHEF_MODEL = "claude-haiku-4-5-20251001";

const LEGACY_SOUS_CHEF_MODELS = new Set([
  "claude-3-5-haiku-20241022",
  "claude-3-5-haiku-latest",
]);

function unique(values: string[]) {
  return [...new Set(values.map((value) => value.trim()).filter(Boolean))];
}

export function getSousChefModelCandidates() {
  const configured = env.SOUS_CHEF_MODEL.trim() || DEFAULT_SOUS_CHEF_MODEL;
  const fallbackModels = LEGACY_SOUS_CHEF_MODELS.has(configured)
    ? [DEFAULT_SOUS_CHEF_MODEL, "claude-haiku-4-5", "claude-3-haiku-20240307"]
    : [DEFAULT_SOUS_CHEF_MODEL, "claude-haiku-4-5"];

  return unique([configured, ...fallbackModels]);
}

function getErrorMessage(error: unknown) {
  return error instanceof Error ? error.message : String(error);
}

export function isAnthropicModelNotFound(error: unknown) {
  const status = typeof error === "object" && error && "status" in error
    ? (error as { status?: unknown }).status
    : null;
  const message = getErrorMessage(error);

  return (
    status === 404 &&
    (message.includes("not_found_error") || /model:\s*/i.test(message))
  );
}

export async function createSousChefMessage(
  client: Anthropic,
  params: Omit<Anthropic.MessageCreateParamsNonStreaming, "model">,
  context: Record<string, unknown> = {}
) {
  const candidates = getSousChefModelCandidates();

  for (let index = 0; index < candidates.length; index += 1) {
    const model = candidates[index];

    try {
      return await client.messages.create({ ...params, model });
    } catch (error) {
      const fallbackModel = candidates[index + 1];
      if (fallbackModel && isAnthropicModelNotFound(error)) {
        console.warn("[anthropic] model unavailable; retrying fallback", {
          ...context,
          requestedModel: model,
          fallbackModel,
          message: getErrorMessage(error),
        });
        continue;
      }

      throw error;
    }
  }

  throw new Error("No Anthropic model candidate returned a response");
}
