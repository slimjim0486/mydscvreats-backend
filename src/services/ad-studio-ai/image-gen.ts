// Hero image generation for Ad Studio creatives.
//
// Strategy (per KB §AI-vs-Human): real food photo first, AI fallback only.
// 1. If brief has a primary dish AND that dish has a real owner_upload image, REUSE that.
// 2. If brief has a primary dish AND has any high-confidence existing image, REUSE that.
// 3. Otherwise, fall back to AI generation via the existing google-image service.

import { ApiError } from "@/lib/errors";
import { prisma } from "@/lib/prisma";
import { generateDishImage } from "@/services/google-image";
import { uploadBuffer } from "@/services/r2";
import type { ImageGenResult } from "./types";

interface ImageGenInput {
  restaurantId: string;
  primaryDishId?: string;
  primaryDishName?: string;
  prompt: string;
}

const AD_STUDIO_IMAGE_FOLDER = "ad-studio";
const AI_IMAGE_COST_USD = 0.04; // Approx Imagen 3 cost; refine when invoice arrives.

export async function generateHeroImage(input: ImageGenInput): Promise<ImageGenResult> {
  // Step 1: Try to reuse a real owner-uploaded photo for the featured dish.
  if (input.primaryDishId) {
    const reused = await tryReuseMenuItemImage(input.primaryDishId, input.restaurantId);
    if (reused) return reused;
  }

  // Step 2: Fall back to AI generation.
  if (!input.primaryDishName) {
    throw new ApiError(
      "Cannot generate AI hero image without a featured dish name. Pick a dish from the menu, or upload a photo to the dish first.",
      400
    );
  }

  return generateAiImage({
    restaurantId: input.restaurantId,
    dishName: input.primaryDishName,
    prompt: input.prompt,
  });
}

async function tryReuseMenuItemImage(
  menuItemId: string,
  restaurantId: string
): Promise<ImageGenResult | null> {
  // Tenant isolation: confirm the dish belongs to this restaurant.
  const item = await prisma.menuItem.findFirst({
    where: { id: menuItemId, restaurantId },
    select: { id: true, imageUrl: true },
  });

  if (!item) return null;

  // Prefer the primary image if it's owner-uploaded (highest trust per KB).
  const primary = await prisma.menuItemImage.findFirst({
    where: {
      menuItemId,
      isPrimary: true,
      imageStatus: "ready",
      imageUrl: { not: null },
    },
    orderBy: [{ originType: "asc" }, { createdAt: "desc" }],
    select: { id: true, imageUrl: true, originType: true },
  });

  if (primary?.imageUrl) {
    return {
      source: "menu_item",
      url: primary.imageUrl,
      costUsd: 0,
      menuItemImageId: primary.id,
    };
  }

  // Fall back to legacy imageUrl on the item itself.
  if (item.imageUrl) {
    return {
      source: "menu_item",
      url: item.imageUrl,
      costUsd: 0,
    };
  }

  return null;
}

async function generateAiImage(args: {
  restaurantId: string;
  dishName: string;
  prompt: string;
}): Promise<ImageGenResult> {
  // Reuse the existing google-image service. It returns { buffer, contentType, ... }.
  const generated = await generateDishImage({
    name: args.dishName,
    promptModifier: args.prompt,
    allowFallback: true,
  });

  const uploaded = await uploadBuffer({
    buffer: generated.buffer,
    contentType: generated.contentType,
    folder: AD_STUDIO_IMAGE_FOLDER,
  });

  return {
    source: "ai_generated",
    url: uploaded.url,
    costUsd: AI_IMAGE_COST_USD,
    prompt: args.prompt,
  };
}
