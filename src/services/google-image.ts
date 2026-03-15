import { env } from "@/lib/env";
import { ApiError } from "@/lib/errors";

interface GoogleImageResponse {
  candidates?: {
    content?: {
      parts?: {
        text?: string;
        inlineData?: {
          mimeType?: string;
          data?: string;
        };
      }[];
    };
  }[];
  error?: {
    message?: string;
    details?: unknown;
  };
}

type InlineImagePart = {
  inlineData: {
    mimeType: string;
    data: string;
  };
};

function parseRetryDelayMs(value: string) {
  const trimmed = value.trim();

  if (!trimmed) {
    return null;
  }

  const seconds = Number(trimmed);
  if (Number.isFinite(seconds)) {
    return Math.max(0, Math.round(seconds * 1000));
  }

  const durationMatch = /^(\d+(?:\.\d+)?)s$/i.exec(trimmed);
  if (durationMatch) {
    return Math.max(0, Math.round(Number(durationMatch[1]) * 1000));
  }

  const dateMs = Date.parse(trimmed);
  if (!Number.isNaN(dateMs)) {
    return Math.max(0, dateMs - Date.now());
  }

  return null;
}

function getRetryAfterMs(response: Response, payload: GoogleImageResponse | null) {
  const headerValue = response.headers.get("retry-after");
  if (headerValue) {
    const parsed = parseRetryDelayMs(headerValue);
    if (parsed !== null) {
      return parsed;
    }
  }

  const details = Array.isArray(payload?.error?.details) ? payload.error.details : [];
  for (const detail of details) {
    if (!detail || typeof detail !== "object") {
      continue;
    }

    const retryDelay =
      "retryDelay" in detail && typeof detail.retryDelay === "string" ? detail.retryDelay : null;

    if (!retryDelay) {
      continue;
    }

    const parsed = parseRetryDelayMs(retryDelay);
    if (parsed !== null) {
      return parsed;
    }
  }

  return null;
}

function getGoogleApiKey() {
  return env.GEMINI_API_KEY ?? env.GOOGLE_API_KEY ?? env.NANOBANANA_API_KEY;
}

function normalize(value?: string | null) {
  return value?.trim().toLowerCase() ?? "";
}

function inferAngle(input: {
  name: string;
  description?: string | null;
  sectionName?: string | null;
}) {
  const haystack = [input.name, input.description, input.sectionName]
    .filter(Boolean)
    .join(" ")
    .toLowerCase();

  if (
    /(pizza|flatbread|salad|bowl|mezze|platter|sushi|maki|nigiri|biryani|rice bowl|poke)/.test(
      haystack
    )
  ) {
    return "overhead or high 30-45 degree angle that shows the full plating clearly";
  }

  if (
    /(burger|sandwich|toast|pancake|cake|slice|lasagna|stack|shawarma|wrap|club)/.test(
      haystack
    )
  ) {
    return "45 degree three-quarter angle, slightly low if needed to show layers and height";
  }

  if (/(coffee|tea|latte|juice|smoothie|cocktail|mocktail|drink)/.test(haystack)) {
    return "side or 45 degree angle that emphasizes the glass shape and drink texture";
  }

  if (/(soup|ramen|noodles|curry|stew|pasta)/.test(haystack)) {
    return "45 degree angle that shows depth, sauce texture, and steam if appropriate";
  }

  return "45 degree three-quarter angle, the standard commercial food angle";
}

function inferLighting(input: {
  name: string;
  description?: string | null;
  sectionName?: string | null;
}) {
  const haystack = [input.name, input.description, input.sectionName]
    .filter(Boolean)
    .join(" ")
    .toLowerCase();

  if (/(glaze|glazed|shiny|syrup|iced|soup|curry|ramen|broth|sauce|noodles|dessert)/.test(haystack)) {
    return "soft side-back lighting with gentle fill to reveal gloss, depth, and texture";
  }

  if (/(grill|grilled|roast|roasted|fried|crispy|char|charred|bbq|barbecue)/.test(haystack)) {
    return "soft side lighting that brings out crisp edges, char, and surface texture";
  }

  return "soft diffused side lighting with controlled shadows and clean highlight rolloff";
}

function buildPrompt(input: {
  name: string;
  description?: string | null;
  cuisineType?: string | null;
  sectionName?: string | null;
  restaurantName?: string | null;
  promptModifier?: string | null;
}) {
  const cuisine = normalize(input.cuisineType);
  const angle = inferAngle(input);
  const lighting = inferLighting(input);
  const cuisineDirection = cuisine
    ? `Use plating, vessel choice, garnish restraint, and surface styling that feel authentic to ${input.cuisineType} cuisine without falling into stereotypes or clutter.`
    : "Use neutral, tasteful restaurant plating and a minimal surface that supports the dish without distraction.";

  return [
    "Create one photorealistic, premium restaurant menu image.",
    "",
    "<subject>",
    `Dish: ${input.name}`,
    input.description ? `Description: ${input.description}` : "Description: not provided",
    input.sectionName ? `Menu section: ${input.sectionName}` : null,
    input.cuisineType ? `Cuisine: ${input.cuisineType}` : null,
    input.restaurantName ? `Restaurant: ${input.restaurantName}` : null,
    "</subject>",
    "",
    "<goal>",
    "The result must look like a real professionally shot food photograph for a premium restaurant menu.",
    "The dish should look delicious, realistic, and immediately understandable at a glance on mobile.",
    "</goal>",
    "",
    "<photography>",
    'Use a "photo of" interpretation, not illustration or CGI.',
    "Food still life photography, macro / short telephoto look, 60-105mm equivalent, high detail, precise focus, controlled lighting.",
    `Camera angle: ${angle}.`,
    `Lighting: ${lighting}.`,
    "Compose for a square menu card with safe margins, one hero serving, clean framing, and shallow but believable depth of field.",
    "Show texture, moisture, crispness, char, crumb, or gloss when appropriate to the dish, but no visible steam or vapor.",
    "</photography>",
    "",
    "<styling>",
    cuisineDirection,
    "Keep props minimal and editorial. The dish must remain the hero.",
    "Use appetizing but natural color, realistic portioning, and believable plating.",
    "If the dish name is ambiguous, choose the most common restaurant presentation that fits the cuisine and menu section.",
    "</styling>",
    "",
    "<accuracy>",
    "Stay faithful to the likely real ingredients and presentation implied by the dish name and description.",
    "Do not invent unrelated side dishes, drinks, duplicate plates, or decorative elements that would confuse the menu item.",
    "Only include utensils, napkins, boards, or serving ware if they support realism without stealing attention.",
    "Garnish should be minimal, edible, and relevant to the dish.",
    "</accuracy>",
    "",
    "<avoid>",
    "No text, labels, logos, watermarks, collages, split screens, or menu layouts.",
    "No surrealism, no cartoon look, no plastic-looking food, no exaggerated saturation, no messy table scene.",
    "No extra hands or people unless absolutely essential to the authentic serving style.",
    "No duplicated ingredients or impossible anatomy in utensils or serving ware.",
    "No visible steam, smoke, haze, or vapor rising from the food.",
    "</avoid>",
    input.promptModifier
      ? [
          "",
          "<variation>",
          `Additional direction for this variation: ${input.promptModifier}`,
          "Keep the dish identity the same while changing the presentation or photographic treatment based on that direction.",
          "</variation>",
        ].join("\n")
      : null,
  ]
    .filter(Boolean)
    .join("\n");
}

function getExtensionFromMimeType(contentType: string) {
  switch (contentType.split(";")[0]?.trim()) {
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

function getEditModels(allowFallback?: boolean) {
  const models = [env.GOOGLE_IMAGE_MODEL];
  if (
    (allowFallback ?? env.GOOGLE_IMAGE_ALLOW_FALLBACK) &&
    env.GOOGLE_IMAGE_FALLBACK_MODEL &&
    env.GOOGLE_IMAGE_FALLBACK_MODEL !== env.GOOGLE_IMAGE_MODEL
  ) {
    models.push(env.GOOGLE_IMAGE_FALLBACK_MODEL);
  }

  return models;
}

function buildEnhancementPrompt(input: {
  preset: "clean_studio" | "warm_natural" | "lighter_background";
}) {
  const presetInstruction =
    input.preset === "warm_natural"
      ? [
          "Use warm natural food-photography styling.",
          "Keep a believable tabletop feel with soft warm highlights and gentle contrast.",
        ]
      : input.preset === "lighter_background"
        ? [
            "Use a brighter, lighter background treatment.",
            "Favor a clean airy surface with soft neutral highlights and reduced clutter.",
          ]
        : [
            "Use a premium clean studio food-photography treatment.",
            "Favor a polished, editorial, menu-ready presentation with a controlled neutral background.",
          ];

  return [
    "This is an image edit task, not a new image generation task.",
    "Use the uploaded dish photo as the source of truth and preserve the exact dish identity.",
    "Keep the same food, same portion, same plating, same garnish, and same overall camera perspective unless a tiny framing correction is needed.",
    "",
    "<required_fixes>",
    "Remove all visible menu text, captions, labels, borders, page layout artifacts, and document background from the image.",
    "Recenter the plated dish so it reads clearly as a hero menu image in a square frame.",
    "Tighten composition around the food while keeping the full hero serving visible.",
    "Repair blur, softness, compression artifacts, and noise as much as possible while keeping the result natural and photorealistic.",
    "Correct white balance, exposure, shadows, and color so the food looks accurate and appetizing.",
    "If needed, replace or extend the surrounding background with a clean realistic food-photo surface that does not distract from the dish.",
    "If caption text overlaps the lower edge or side of the crop, fully remove it and reconstruct the missing non-food background naturally.",
    "</required_fixes>",
    "",
    "<style>",
    ...presetInstruction,
    "Make the result look professionally shot, crisp, premium, and menu-ready.",
    "Preserve believable food texture and ingredient structure.",
    "</style>",
    "",
    "<hard_constraints>",
    "Do not change the dish into a different recipe or presentation.",
    "Do not add extra side dishes, duplicate items, props, hands, cutlery, logos, or decorative elements.",
    "Do not invent text, watermarks, labels, or menu layout elements.",
    "Do not dramatically change the angle or plating vessel.",
    "Do not over-stylize, over-saturate, or make the food look synthetic or plastic.",
    "</hard_constraints>",
  ].join("\n");
}

function shouldTryFallbackModel(error: unknown) {
  if (!(error instanceof ApiError)) {
    return true;
  }

  return ![429, 500, 502, 503, 504].includes(error.status);
}

async function requestImageFromModel(model: string, prompt: string, apiKey: string) {
  const url = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent`;

  const response = await fetch(url, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "x-goog-api-key": apiKey,
    },
    body: JSON.stringify({
      contents: [{ parts: [{ text: prompt }] }],
      generationConfig: {
        responseModalities: ["IMAGE"],
      },
    }),
  });

  const payload = (await response.json().catch(() => null)) as GoogleImageResponse | null;

  if (!response.ok) {
    const message =
      payload?.error?.message ??
      `Google image generation failed with status ${response.status}`;

    throw new ApiError(message, response.status, {
      model,
      retryAfterMs: getRetryAfterMs(response, payload),
      error: payload?.error ?? null,
    });
  }

  const parts = payload?.candidates?.[0]?.content?.parts ?? [];
  const imagePart = parts.find((p) => p.inlineData?.data);

  if (!imagePart?.inlineData?.data) {
    throw new ApiError(`Google image generation returned no image for model ${model}`, 502);
  }

  const contentType = imagePart.inlineData.mimeType ?? "image/png";

  return {
    buffer: Buffer.from(imagePart.inlineData.data, "base64"),
    contentType,
    extension: getExtensionFromMimeType(contentType),
    model,
  };
}

async function requestEditedImageFromModel(
  model: string,
  prompt: string,
  sourceImage: InlineImagePart,
  apiKey: string
) {
  const url = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent`;

  const response = await fetch(url, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "x-goog-api-key": apiKey,
    },
    body: JSON.stringify({
      contents: [
        {
          role: "user",
          parts: [
            { text: prompt },
            sourceImage,
          ],
        },
      ],
      generationConfig: {
        responseModalities: ["TEXT", "IMAGE"],
      },
    }),
  });

  const payload = (await response.json().catch(() => null)) as GoogleImageResponse | null;

  if (!response.ok) {
    const message =
      payload?.error?.message ??
      `Google image editing failed with status ${response.status}`;

    throw new ApiError(message, response.status, {
      model,
      retryAfterMs: getRetryAfterMs(response, payload),
      error: payload?.error ?? null,
    });
  }

  const parts = payload?.candidates?.[0]?.content?.parts ?? [];
  const imagePart = parts.find((p) => p.inlineData?.data);

  if (!imagePart?.inlineData?.data) {
    throw new ApiError(`Google image editing returned no image for model ${model}`, 502);
  }

  const contentType = imagePart.inlineData.mimeType ?? "image/png";

  return {
    buffer: Buffer.from(imagePart.inlineData.data, "base64"),
    contentType,
    extension: getExtensionFromMimeType(contentType),
    model,
  };
}

export async function generateDishImage(input: {
  name: string;
  description?: string | null;
  cuisineType?: string | null;
  sectionName?: string | null;
  restaurantName?: string | null;
  promptModifier?: string | null;
  allowFallback?: boolean;
}) {
  const apiKey = getGoogleApiKey();
  if (!apiKey) {
    throw new ApiError("Google image generation is not configured", 503);
  }

  const models = getEditModels(input.allowFallback);

  const prompt = buildPrompt(input);
  let lastError: unknown = null;

  for (const [index, model] of models.entries()) {
    try {
      return await requestImageFromModel(model, prompt, apiKey);
    } catch (error) {
      lastError = error;
      console.warn(`Google image generation failed for model ${model}`, error);

      const hasAnotherModel = index < models.length - 1;
      if (!hasAnotherModel || !shouldTryFallbackModel(error)) {
        break;
      }
    }
  }

  if (lastError instanceof ApiError) {
    throw lastError;
  }

  throw new ApiError("Google image generation failed", 502);
}

export async function enhanceUploadedDishImage(input: {
  imageUrl: string;
  preset?: "clean_studio" | "warm_natural" | "lighter_background";
  allowFallback?: boolean;
}) {
  const apiKey = getGoogleApiKey();
  if (!apiKey) {
    throw new ApiError("Google image generation is not configured", 503);
  }

  const response = await fetch(input.imageUrl);
  if (!response.ok) {
    throw new ApiError(`Failed to download source image (${response.status})`, 502);
  }

  const imageBuffer = Buffer.from(await response.arrayBuffer());
  const contentType = response.headers.get("content-type")?.split(";")[0]?.trim() || "image/jpeg";
  const prompt = buildEnhancementPrompt({
    preset: input.preset ?? "clean_studio",
  });

  const models = getEditModels(input.allowFallback);
  let lastError: unknown = null;

  for (const [index, model] of models.entries()) {
    try {
      return await requestEditedImageFromModel(
        model,
        prompt,
        {
          inlineData: {
            mimeType: contentType,
            data: imageBuffer.toString("base64"),
          },
        },
        apiKey
      );
    } catch (error) {
      lastError = error;
      console.warn(`Google image editing failed for model ${model}`, error);

      const hasAnotherModel = index < models.length - 1;
      if (!hasAnotherModel || !shouldTryFallbackModel(error)) {
        break;
      }
    }
  }

  if (lastError instanceof ApiError) {
    throw lastError;
  }

  throw new ApiError("Google image enhancement failed", 502);
}
