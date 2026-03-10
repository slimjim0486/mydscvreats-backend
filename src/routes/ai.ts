import { Hono } from "hono";
import { z } from "zod";
import { getRestaurantEntitlements } from "@/lib/entitlements";
import { ApiError } from "@/lib/errors";
import { errorResponse } from "@/lib/http";
import {
  ensurePrimaryImageRecord,
  getNextImageSlot,
  syncMenuItemImageSummary,
} from "@/lib/menu-item-images";
import { prisma } from "@/lib/prisma";
import { requireAuth } from "@/middleware/auth";
import { enqueueMenuItemImage } from "@/queue/image-generation";
import { extractMenuFromSource } from "@/services/claude";

const extractSchema = z.object({
  restaurantId: z.string().cuid(),
  sourceText: z.string().optional(),
  fileName: z.string().optional(),
  contentType: z.string().optional(),
  base64: z.string().optional(),
});

const imageSchema = z.object({
  menuItemId: z.string().cuid(),
  promptModifier: z.string().trim().max(240).optional(),
});

export const aiRoute = new Hono<{
  Variables: {
    auth: {
      clerkId: string;
      email: string | null;
    };
  };
}>()
  .post("/extract", requireAuth, async (c) => {
    try {
      const auth = c.get("auth");
      const data = extractSchema.parse(await c.req.json());
      const ownsRestaurant = await prisma.restaurant.count({
        where: {
          id: data.restaurantId,
          owner: {
            clerkId: auth.clerkId,
          },
        },
      });

      if (!ownsRestaurant) {
        throw new ApiError("Restaurant not found", 404);
      }

      const draft = await extractMenuFromSource(data);
      return c.json(draft);
    } catch (error) {
      return errorResponse(c, error);
    }
  })
  .post("/generate-image", requireAuth, async (c) => {
    try {
      const auth = c.get("auth");
      const data = imageSchema.parse(await c.req.json());
      const item = await prisma.menuItem.findUnique({
        where: { id: data.menuItemId },
        include: {
          restaurant: {
            include: {
              owner: true,
            },
          },
        },
      });

      if (!item || item.restaurant.owner.clerkId !== auth.clerkId) {
        throw new ApiError("Menu item not found", 404);
      }

      const entitlements = getRestaurantEntitlements(item.restaurant);
      const promptModifier = data.promptModifier?.trim() || null;
      const image = await prisma.$transaction(async (tx) => {
        const prepared = await ensurePrimaryImageRecord(tx, item.id);
        const images = prepared?.images ?? [];
        const nextSlot = getNextImageSlot(images);

        if (nextSlot === null) {
          throw new ApiError("You can generate up to 3 images per menu item", 400);
        }

        return tx.menuItemImage.create({
          data: {
            menuItemId: item.id,
            slot: nextSlot,
            promptModifier,
            imageStatus: "none",
            isPrimary: images.length === 0,
          },
        });
      });

      try {
        await enqueueMenuItemImage({
          menuItemId: item.id,
          imageId: image.id,
          priority: entitlements.imageGenerationPriority,
        });
      } catch (error) {
        await prisma.$transaction(async (tx) => {
          await tx.menuItemImage.delete({
            where: { id: image.id },
          });
          await syncMenuItemImageSummary(tx, item.id);
        });
        throw error;
      }

      await prisma.$transaction(async (tx) => {
        await tx.menuItemImage.update({
          where: { id: image.id },
          data: { imageStatus: "generating" },
        });
        await syncMenuItemImageSummary(tx, item.id);
      });

      return c.json({
        queued: true,
        menuItemId: item.id,
        imageId: image.id,
        priority: entitlements.imageGenerationPriority,
      });
    } catch (error) {
      return errorResponse(c, error);
    }
  });
