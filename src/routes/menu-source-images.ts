import { Hono } from "hono";
import { z } from "zod";
import { MenuSourceImageReviewStatus } from "@prisma/client";
import { getRestaurantEntitlements } from "@/lib/entitlements";
import {
  getNextHiddenImageSlot,
  getNextImageSlot,
  syncMenuItemImageSummary,
} from "@/lib/menu-item-images";
import { prisma } from "@/lib/prisma";
import { ApiError } from "@/lib/errors";
import { errorResponse } from "@/lib/http";
import { requireAuth } from "@/middleware/auth";
import { uploadBuffer } from "@/services/r2";
import { createTruthPreservingEditFromUrl } from "@/services/truth-preserving-image";

const createCandidateSchema = z.object({
  restaurantId: z.string().cuid(),
  filename: z.string().min(1),
  contentType: z.string().startsWith("image/"),
  base64: z.string().min(1),
  sourcePageFilename: z.string().min(1),
  sourcePageContentType: z.string().startsWith("image/"),
  sourcePageBase64: z.string().min(1),
  sourcePageNumber: z.number().int().positive(),
  cropX: z.number().min(0).max(1),
  cropY: z.number().min(0).max(1),
  cropWidth: z.number().min(0.05).max(1),
  cropHeight: z.number().min(0.05).max(1),
  textOverlapScore: z.number().min(0).max(1).optional(),
  confidence: z.number().min(0).max(1),
  note: z.string().max(280).optional(),
  suggestedMenuItemId: z.string().cuid().optional().nullable(),
});

const cropUpdateSchema = z.object({
  filename: z.string().min(1),
  contentType: z.string().startsWith("image/"),
  base64: z.string().min(1),
  cropX: z.number().min(0).max(1),
  cropY: z.number().min(0).max(1),
  cropWidth: z.number().min(0.05).max(1),
  cropHeight: z.number().min(0.05).max(1),
  textOverlapScore: z.number().min(0).max(1).optional(),
});

const updateCandidateSchema = z.object({
  assignedMenuItemId: z.string().cuid().nullable().optional(),
  crop: cropUpdateSchema.optional(),
});

const bulkConfirmSchema = z.object({
  candidateIds: z.array(z.string().cuid()).min(1).max(50),
});

async function assertRestaurantOwnership(restaurantId: string, clerkId: string) {
  const restaurant = await prisma.restaurant.findFirst({
    where: {
      id: restaurantId,
      owner: { clerkId },
    },
    include: {
      subscription: true,
      operatorAccount: {
        include: {
          _count: {
            select: {
              brands: true,
            },
          },
        },
      },
    },
  });

  if (!restaurant) {
    throw new ApiError("Restaurant not found", 404);
  }

  return restaurant;
}

async function getOwnedCandidate(candidateId: string, clerkId: string) {
  const candidate = await prisma.menuSourceImageCandidate.findUnique({
    where: { id: candidateId },
    include: {
      restaurant: {
        include: {
          owner: true,
        },
      },
      suggestedMenuItem: {
        select: { id: true, name: true },
      },
      assignedMenuItem: {
        select: { id: true, name: true },
      },
    },
  });

  if (!candidate || candidate.restaurant.owner.clerkId !== clerkId) {
    throw new ApiError("Imported menu photo candidate not found", 404);
  }

  return candidate;
}

async function confirmCandidateById(candidateId: string, clerkId: string) {
  const candidate = await getOwnedCandidate(candidateId, clerkId);
  const targetMenuItemId = candidate.assignedMenuItemId ?? candidate.suggestedMenuItemId;

  if (!targetMenuItemId) {
    throw new ApiError("Choose a dish before confirming this imported photo", 400);
  }

  const enhanced = await createTruthPreservingEditFromUrl(candidate.imageUrl);
  const enhancedUpload = await uploadBuffer({
    buffer: enhanced.buffer,
    contentType: enhanced.contentType,
    folder: `restaurants/${candidate.restaurantId}/menu-items/enhanced`,
    key: `restaurants/${candidate.restaurantId}/menu-items/enhanced/${Date.now()}-${candidate.id}.${enhanced.extension}`,
  });

  return prisma.$transaction(async (tx) => {
    const item = await tx.menuItem.findUnique({
      where: { id: targetMenuItemId },
      include: {
        images: {
          orderBy: { slot: "asc" },
        },
      },
    });

    if (!item || item.restaurantId !== candidate.restaurantId) {
      throw new ApiError("Menu item not found", 404);
    }

    const nextSlot = getNextImageSlot(item.images);
    if (nextSlot === null) {
      throw new ApiError("This dish already has 3 images. Remove one before confirming another.", 400);
    }

    const helperSlot = getNextHiddenImageSlot(item.images);
    const originalImage = await tx.menuItemImage.create({
      data: {
        menuItemId: item.id,
        slot: helperSlot,
        imageUrl: candidate.imageUrl,
        imageStatus: "uploaded",
        isPrimary: false,
        originType: "menu_source_upload",
        derivationType: "original",
        parentImageId: null,
      },
      select: {
        id: true,
      },
    });

    const visibleCount = item.images.filter((image) => image.slot >= 0).length;
    const createdImage = await tx.menuItemImage.create({
      data: {
        menuItemId: item.id,
        slot: nextSlot,
        imageUrl: enhancedUpload.url,
        imageStatus: "generated",
        isPrimary: visibleCount === 0,
        originType: "menu_source_upload",
        derivationType: "truth_preserving_edit",
        parentImageId: originalImage.id,
      },
      select: {
        id: true,
      },
    });

    await syncMenuItemImageSummary(tx, item.id);

    return tx.menuSourceImageCandidate.update({
      where: { id: candidate.id },
      data: {
        reviewStatus: "confirmed",
        assignedMenuItemId: item.id,
        linkedImageId: createdImage.id,
      },
      include: {
        suggestedMenuItem: {
          select: { id: true, name: true },
        },
        assignedMenuItem: {
          select: { id: true, name: true },
        },
      },
    });
  });
}

export const menuSourceImagesRoute = new Hono<{
  Variables: {
    auth: {
      clerkId: string;
      email: string | null;
    };
  };
}>()
  .get("/:restaurantId", requireAuth, async (c) => {
    try {
      const auth = c.get("auth");
      const restaurantId = c.req.param("restaurantId");
      const restaurant = await assertRestaurantOwnership(restaurantId, auth.clerkId);
      const entitlements = getRestaurantEntitlements(restaurant);

      if (!entitlements.sourcePhotoReviewEnabled) {
        throw new ApiError("Imported menu photo review is not enabled for this plan", 403);
      }

      const statusParam = c.req.query("status");
      const status = statusParam
        ? z.nativeEnum(MenuSourceImageReviewStatus).parse(statusParam)
        : undefined;
      const candidates = await prisma.menuSourceImageCandidate.findMany({
        where: {
          restaurantId,
          ...(status ? { reviewStatus: status } : {}),
        },
        include: {
          suggestedMenuItem: {
            select: { id: true, name: true },
          },
          assignedMenuItem: {
            select: { id: true, name: true },
          },
        },
        orderBy: [{ reviewStatus: "asc" }, { confidence: "desc" }, { createdAt: "desc" }],
      });

      return c.json(candidates);
    } catch (error) {
      return errorResponse(c, error);
    }
  })
  .post("/", requireAuth, async (c) => {
    try {
      const auth = c.get("auth");
      const data = createCandidateSchema.parse(await c.req.json());
      const restaurant = await assertRestaurantOwnership(data.restaurantId, auth.clerkId);
      const entitlements = getRestaurantEntitlements(restaurant);

      if (!entitlements.sourcePhotoImportEnabled || !entitlements.sourcePhotoReviewEnabled) {
        throw new ApiError("Imported menu photo review is not enabled for this plan", 403);
      }

      if (data.suggestedMenuItemId) {
        const item = await prisma.menuItem.findFirst({
          where: {
            id: data.suggestedMenuItemId,
            restaurantId: restaurant.id,
          },
        });

        if (!item) {
          throw new ApiError("Suggested dish is not part of this restaurant menu", 400);
        }
      }

      const upload = await uploadBuffer({
        buffer: Buffer.from(data.base64, "base64"),
        contentType: data.contentType,
        folder: `restaurants/${restaurant.id}/menu-source-candidates`,
        key: `restaurants/${restaurant.id}/menu-source-candidates/${Date.now()}-${data.filename.replace(/[^a-zA-Z0-9._-]/g, "-")}`,
      });
      const sourcePageUpload = await uploadBuffer({
        buffer: Buffer.from(data.sourcePageBase64, "base64"),
        contentType: data.sourcePageContentType,
        folder: `restaurants/${restaurant.id}/menu-source-pages`,
        key: `restaurants/${restaurant.id}/menu-source-pages/${Date.now()}-${data.sourcePageFilename.replace(/[^a-zA-Z0-9._-]/g, "-")}`,
      });

      const candidate = await prisma.menuSourceImageCandidate.create({
        data: {
          restaurantId: restaurant.id,
          imageUrl: upload.url,
          sourcePageImageUrl: sourcePageUpload.url,
          sourcePageNumber: data.sourcePageNumber,
          cropX: data.cropX,
          cropY: data.cropY,
          cropWidth: data.cropWidth,
          cropHeight: data.cropHeight,
          textOverlapScore: data.textOverlapScore ?? null,
          confidence: data.confidence,
          note: data.note ?? null,
          suggestedMenuItemId: data.suggestedMenuItemId ?? null,
          assignedMenuItemId: data.suggestedMenuItemId ?? null,
        },
        include: {
          suggestedMenuItem: {
            select: { id: true, name: true },
          },
          assignedMenuItem: {
            select: { id: true, name: true },
          },
        },
      });

      return c.json(candidate, 201);
    } catch (error) {
      return errorResponse(c, error);
    }
  })
  .put("/:candidateId", requireAuth, async (c) => {
    try {
      const auth = c.get("auth");
      const candidate = await getOwnedCandidate(c.req.param("candidateId"), auth.clerkId);
      const data = updateCandidateSchema.parse(await c.req.json());

      if (data.assignedMenuItemId) {
        const item = await prisma.menuItem.findFirst({
          where: {
            id: data.assignedMenuItemId,
            restaurantId: candidate.restaurantId,
          },
        });

        if (!item) {
          throw new ApiError("Selected dish is not part of this restaurant menu", 400);
        }
      }

      const updated = await prisma.menuSourceImageCandidate.update({
        where: { id: candidate.id },
        data: {
          ...(data.assignedMenuItemId !== undefined
            ? { assignedMenuItemId: data.assignedMenuItemId }
            : {}),
          ...(data.crop
            ? {
                imageUrl: (
                  await uploadBuffer({
                    buffer: Buffer.from(data.crop.base64, "base64"),
                    contentType: data.crop.contentType,
                    folder: `restaurants/${candidate.restaurantId}/menu-source-candidates`,
                    key: `restaurants/${candidate.restaurantId}/menu-source-candidates/${Date.now()}-${data.crop.filename.replace(/[^a-zA-Z0-9._-]/g, "-")}`,
                  })
                ).url,
                cropX: data.crop.cropX,
                cropY: data.crop.cropY,
                cropWidth: data.crop.cropWidth,
                cropHeight: data.crop.cropHeight,
                textOverlapScore: data.crop.textOverlapScore ?? null,
              }
            : {}),
        },
        include: {
          suggestedMenuItem: {
            select: { id: true, name: true },
          },
          assignedMenuItem: {
            select: { id: true, name: true },
          },
        },
      });

      return c.json(updated);
    } catch (error) {
      return errorResponse(c, error);
    }
  })
  .post("/bulk-confirm", requireAuth, async (c) => {
    try {
      const auth = c.get("auth");
      const data = bulkConfirmSchema.parse(await c.req.json());
      const confirmed = [];

      for (const candidateId of data.candidateIds) {
        confirmed.push(await confirmCandidateById(candidateId, auth.clerkId));
      }

      return c.json({ ok: true, confirmed });
    } catch (error) {
      return errorResponse(c, error);
    }
  })
  .post("/:candidateId/confirm", requireAuth, async (c) => {
    try {
      const auth = c.get("auth");
      const result = await confirmCandidateById(c.req.param("candidateId"), auth.clerkId);

      return c.json(result);
    } catch (error) {
      return errorResponse(c, error);
    }
  })
  .post("/:candidateId/dismiss", requireAuth, async (c) => {
    try {
      const auth = c.get("auth");
      const candidate = await getOwnedCandidate(c.req.param("candidateId"), auth.clerkId);

      const updated = await prisma.menuSourceImageCandidate.update({
        where: { id: candidate.id },
        data: {
          reviewStatus: "dismissed",
        },
        include: {
          suggestedMenuItem: {
            select: { id: true, name: true },
          },
          assignedMenuItem: {
            select: { id: true, name: true },
          },
        },
      });

      return c.json(updated);
    } catch (error) {
      return errorResponse(c, error);
    }
  });
