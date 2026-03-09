import { env } from "@/lib/env";
import { ApiError } from "@/lib/errors";

interface GoogleImageOutput {
  type?: string;
  mime_type?: string;
  data?: string;
}

interface GoogleImageResponse {
  outputs?: GoogleImageOutput[];
  error?: {
    message?: string;
  };
}

function getGoogleApiKey() {
  return env.GEMINI_API_KEY ?? env.GOOGLE_API_KEY ?? env.NANOBANANA_API_KEY;
}

function buildPrompt(input: { name: string; description?: string | null }) {
  return [
    "Create an appetizing, photorealistic restaurant menu image for a single dish.",
    `Dish name: ${input.name}`,
    input.description ? `Dish description: ${input.description}` : null,
    "Style: premium editorial food photography, natural soft light, realistic plating, clean composition.",
    "Constraints: no text, no watermark, no collage, no split-screen, no hands unless essential to serving.",
  ]
    .filter(Boolean)
    .join("\n");
}

function getExtensionFromMimeType(contentType: string) {
  switch (contentType) {
    case "image/jpeg":
      return "jpg";
    case "image/webp":
      return "webp";
    case "image/png":
      return "png";
    default:
      return "png";
  }
}

async function requestImageFromModel(model: string, prompt: string, apiKey: string) {
  const response = await fetch(env.GOOGLE_IMAGE_API_URL, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "x-goog-api-key": apiKey,
    },
    body: JSON.stringify({
      model,
      input: prompt,
      response_modalities: ["IMAGE"],
    }),
  });

  const payload = (await response.json().catch(() => null)) as GoogleImageResponse | null;

  if (!response.ok) {
    const message =
      payload?.error?.message ??
      `Google image generation failed with status ${response.status}`;

    throw new ApiError(message, response.status);
  }

  const imageOutput = payload?.outputs?.find(
    (entry) => entry.type?.toLowerCase() === "image" && entry.data
  );

  if (!imageOutput?.data) {
    throw new ApiError(`Google image generation returned no image for model ${model}`, 502);
  }

  const contentType = imageOutput.mime_type ?? "image/png";

  return {
    buffer: Buffer.from(imageOutput.data, "base64"),
    contentType,
    extension: getExtensionFromMimeType(contentType),
    model,
  };
}

export async function generateDishImage(input: {
  name: string;
  description?: string | null;
}) {
  const apiKey = getGoogleApiKey();
  if (!apiKey) {
    throw new ApiError("Google image generation is not configured", 503);
  }

  const models = Array.from(
    new Set([env.GOOGLE_IMAGE_MODEL, env.GOOGLE_IMAGE_FALLBACK_MODEL].filter(Boolean))
  );

  const prompt = buildPrompt(input);
  let lastError: unknown = null;

  for (const model of models) {
    try {
      return await requestImageFromModel(model, prompt, apiKey);
    } catch (error) {
      lastError = error;
      console.warn(`Google image generation failed for model ${model}`, error);
    }
  }

  if (lastError instanceof ApiError) {
    throw lastError;
  }

  throw new ApiError("Google image generation failed", 502);
}
