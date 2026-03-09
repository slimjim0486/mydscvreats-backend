import { Hono } from "hono";
import { z } from "zod";
import { ApiError } from "@/lib/errors";
import { errorResponse } from "@/lib/http";
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

      await prisma.menuItem.update({
        where: { id: item.id },
        data: { imageStatus: "generating" },
      });
      await enqueueMenuItemImage(item.id);

      return c.json({
        queued: true,
        menuItemId: item.id,
      });
    } catch (error) {
      return errorResponse(c, error);
    }
  });
