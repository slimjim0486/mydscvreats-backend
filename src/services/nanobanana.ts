import { env } from "@/lib/env";
import { ApiError } from "@/lib/errors";

interface NanobananaResponse {
  imageUrl?: string;
  imageBase64?: string;
}

export async function generateDishImage(input: {
  name: string;
  description?: string | null;
}) {
  if (!env.NANOBANANA_API_URL || !env.NANOBANANA_API_KEY) {
    throw new ApiError("Nanobanana is not configured", 503);
  }

  const prompt = [
    "Create an appetizing, realistic food photo for a restaurant menu.",
    `Dish name: ${input.name}`,
    input.description ? `Dish description: ${input.description}` : null,
    "Style: editorial restaurant photography, soft natural light, premium plating, no text.",
  ]
    .filter(Boolean)
    .join("\n");

  const response = await fetch(env.NANOBANANA_API_URL, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${env.NANOBANANA_API_KEY}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      prompt,
      size: "1024x1024",
      quality: "pro",
    }),
  });

  if (!response.ok) {
    throw new ApiError("Nanobanana image generation failed", 502, await response.text());
  }

  const data = (await response.json()) as NanobananaResponse;

  if (!data.imageUrl && !data.imageBase64) {
    throw new ApiError("Nanobanana response did not include an image", 502);
  }

  if (data.imageBase64) {
    return {
      buffer: Buffer.from(data.imageBase64, "base64"),
      contentType: "image/png",
    };
  }

  const imageResponse = await fetch(data.imageUrl as string);
  if (!imageResponse.ok) {
    throw new ApiError("Failed to download generated image", 502);
  }

  return {
    buffer: Buffer.from(await imageResponse.arrayBuffer()),
    contentType: imageResponse.headers.get("content-type") ?? "image/png",
  };
}
