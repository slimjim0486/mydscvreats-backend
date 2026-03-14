import { Hono } from "hono";
import { z } from "zod";
import { MenuSourceImageReviewStatus } from "@prisma/client";
import { getNextImageSlot, syncMenuItemImageSummary } from "@/lib/menu-item-images";
import { prisma } from "@/lib/prisma";
import { ApiError } from "@/lib/errors";
import { errorResponse } from "@/lib/http";
import { requireAuth } from "@/middleware/auth";
import { uploadBuffer } from "@/services/r2";

const createCandidateSchema = z.object({
  restaurantId: z.string().cuid(),
  filename: z.string().min(1),
  contentType: z.string().startsWith("image/"),
  base64: z.string().min(1),
  sourcePageNumber: z.number().int().positive(),
  confidence: z.number().min(0).max(1),
  note: z.string().max(280).optional(),
  suggestedMenuItemId: z.string().cuid().optional().nullable(),
});

const updateCandidateSchema = z.object({
  assignedMenuItemId: z.string().cuid().nullable(),
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

    const createdImage = await tx.menuItemImage.create({
      data: {
        menuItemId: item.id,
        slot: nextSlot,
        imageUrl: candidate.imageUrl,
        imageStatus: "uploaded",
        isPrimary: item.images.length === 0,
        originType: "menu_source_upload",
        derivationType: "original",
        parentImageId: null,
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
      await assertRestaurantOwnership(restaurantId, auth.clerkId);

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

      const candidate = await prisma.menuSourceImageCandidate.create({
        data: {
          restaurantId: restaurant.id,
          imageUrl: upload.url,
          sourcePageNumber: data.sourcePageNumber,
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
          assignedMenuItemId: data.assignedMenuItemId,
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
