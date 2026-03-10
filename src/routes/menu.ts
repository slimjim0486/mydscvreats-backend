import { Hono } from "hono";
import { z } from "zod";
import { ApiError } from "@/lib/errors";
import { errorResponse } from "@/lib/http";
import { prisma } from "@/lib/prisma";
import { requireAuth, resolveAuthHeader } from "@/middleware/auth";

const sectionSchema = z.object({
  restaurantId: z.string().cuid(),
  name: z.string().min(1),
  displayOrder: z.number().int().nonnegative().optional(),
});

const itemSchema = z.object({
  restaurantId: z.string().cuid(),
  sectionId: z.string().cuid(),
  name: z.string().min(1),
  description: z.string().nullable().optional(),
  price: z.coerce.number().nonnegative(),
  currency: z.string().default("AED"),
  imageUrl: z.string().url().nullable().optional(),
  imageStatus: z.string().optional(),
  isAvailable: z.boolean().optional(),
  displayOrder: z.number().int().nonnegative().optional(),
});

const importSchema = z.object({
  restaurantId: z.string().cuid(),
  sections: z.array(
    z.object({
      name: z.string().min(1),
      items: z.array(
        z.object({
          name: z.string().min(1),
          description: z.string().nullable().optional(),
          price: z.coerce.number().nonnegative(),
        })
      ),
    })
  ),
});

const reorderSchema = z.object({
  restaurantId: z.string().cuid(),
  sections: z.array(
    z.object({
      id: z.string().cuid(),
      displayOrder: z.number().int().nonnegative(),
      items: z.array(
        z.object({
          id: z.string().cuid(),
          displayOrder: z.number().int().nonnegative(),
          sectionId: z.string().cuid(),
        })
      ),
    })
  ),
});

async function assertOwnership(restaurantId: string, clerkId: string) {
  const restaurant = await prisma.restaurant.findFirst({
    where: {
      id: restaurantId,
      owner: {
        clerkId,
      },
    },
  });

  if (!restaurant) {
    throw new ApiError("Restaurant not found", 404);
  }
}

export const menuRoute = new Hono<{
  Variables: {
    auth: {
      clerkId: string;
      email: string | null;
    };
  };
}>()
  .get("/:restaurantId", async (c) => {
    try {
      const restaurantId = c.req.param("restaurantId");
      const authHeader = c.req.header("authorization");
      const auth = authHeader ? await resolveAuthHeader(authHeader).catch(() => null) : null;
      const restaurant = await prisma.restaurant.findUnique({
        where: { id: restaurantId },
        include: {
          menuSections: {
            orderBy: { displayOrder: "asc" },
            include: {
              items: {
                orderBy: { displayOrder: "asc" },
              },
            },
          },
        },
      });

      if (!restaurant) {
        throw new ApiError("Restaurant not found", 404);
      }

      if (!restaurant.isPublished) {
        const ownsRestaurant = auth
          ? await prisma.restaurant.count({
              where: {
                id: restaurant.id,
                owner: {
                  clerkId: auth.clerkId,
                },
              },
            })
          : 0;

        if (!ownsRestaurant) {
          throw new ApiError("Restaurant not found", 404);
        }
      }

      return c.json(restaurant.menuSections);
    } catch (error) {
      return errorResponse(c, error);
    }
  })
  .get("/:restaurantId/image-statuses", requireAuth, async (c) => {
    try {
      const auth = c.get("auth");
      const restaurantId = c.req.param("restaurantId");
      await assertOwnership(restaurantId, auth.clerkId);

      const items = await prisma.menuItem.findMany({
        where: { restaurantId },
        select: { id: true, imageStatus: true, imageUrl: true },
      });

      return c.json(items);
    } catch (error) {
      return errorResponse(c, error);
    }
  })
  .post("/sections", requireAuth, async (c) => {
    try {
      const auth = c.get("auth");
      const data = sectionSchema.parse(await c.req.json());
      await assertOwnership(data.restaurantId, auth.clerkId);

      const section = await prisma.menuSection.create({
        data: {
          restaurantId: data.restaurantId,
          name: data.name,
          displayOrder: data.displayOrder ?? 0,
        },
      });

      return c.json(section, 201);
    } catch (error) {
      return errorResponse(c, error);
    }
  })
  .put("/sections/:id", requireAuth, async (c) => {
    try {
      const auth = c.get("auth");
      const section = await prisma.menuSection.findUnique({
        where: { id: c.req.param("id") },
        include: { restaurant: { include: { owner: true } } },
      });

      if (!section || section.restaurant.owner.clerkId !== auth.clerkId) {
        throw new ApiError("Section not found", 404);
      }

      const data = sectionSchema.partial().parse(await c.req.json());
      const updated = await prisma.menuSection.update({
        where: { id: section.id },
        data,
      });

      return c.json(updated);
    } catch (error) {
      return errorResponse(c, error);
    }
  })
  .delete("/sections/:id", requireAuth, async (c) => {
    try {
      const auth = c.get("auth");
      const section = await prisma.menuSection.findUnique({
        where: { id: c.req.param("id") },
        include: { restaurant: { include: { owner: true } } },
      });

      if (!section || section.restaurant.owner.clerkId !== auth.clerkId) {
        throw new ApiError("Section not found", 404);
      }

      await prisma.menuSection.delete({ where: { id: section.id } });
      return c.body(null, 204);
    } catch (error) {
      return errorResponse(c, error);
    }
  })
  .post("/items", requireAuth, async (c) => {
    try {
      const auth = c.get("auth");
      const data = itemSchema.parse(await c.req.json());
      await assertOwnership(data.restaurantId, auth.clerkId);

      const item = await prisma.menuItem.create({
        data: {
          ...data,
          price: data.price,
          description: data.description ?? null,
          imageUrl: data.imageUrl ?? null,
          imageStatus: data.imageStatus ?? "none",
          isAvailable: data.isAvailable ?? true,
          displayOrder: data.displayOrder ?? 0,
        },
      });

      return c.json(item, 201);
    } catch (error) {
      return errorResponse(c, error);
    }
  })
  .put("/items/:id", requireAuth, async (c) => {
    try {
      const auth = c.get("auth");
      const item = await prisma.menuItem.findUnique({
        where: { id: c.req.param("id") },
        include: { restaurant: { include: { owner: true } } },
      });

      if (!item || item.restaurant.owner.clerkId !== auth.clerkId) {
        throw new ApiError("Menu item not found", 404);
      }

      const data = itemSchema.partial().parse(await c.req.json());
      const updated = await prisma.menuItem.update({
        where: { id: item.id },
        data: {
          ...data,
          price: data.price,
        },
      });

      return c.json(updated);
    } catch (error) {
      return errorResponse(c, error);
    }
  })
  .delete("/items/:id", requireAuth, async (c) => {
    try {
      const auth = c.get("auth");
      const item = await prisma.menuItem.findUnique({
        where: { id: c.req.param("id") },
        include: { restaurant: { include: { owner: true } } },
      });

      if (!item || item.restaurant.owner.clerkId !== auth.clerkId) {
        throw new ApiError("Menu item not found", 404);
      }

      await prisma.menuItem.delete({ where: { id: item.id } });
      return c.body(null, 204);
    } catch (error) {
      return errorResponse(c, error);
    }
  })
  .post("/import", requireAuth, async (c) => {
    try {
      const auth = c.get("auth");
      const data = importSchema.parse(await c.req.json());
      await assertOwnership(data.restaurantId, auth.clerkId);

      await prisma.$transaction(async (tx) => {
        await tx.menuItem.deleteMany({
          where: { restaurantId: data.restaurantId },
        });
        await tx.menuSection.deleteMany({
          where: { restaurantId: data.restaurantId },
        });

        for (const [sectionIndex, section] of data.sections.entries()) {
          const createdSection = await tx.menuSection.create({
            data: {
              restaurantId: data.restaurantId,
              name: section.name,
              displayOrder: sectionIndex,
            },
          });

          for (const [itemIndex, item] of section.items.entries()) {
            await tx.menuItem.create({
              data: {
                restaurantId: data.restaurantId,
                sectionId: createdSection.id,
                name: item.name,
                description: item.description ?? null,
                price: item.price,
                displayOrder: itemIndex,
              },
            });
          }
        }
      });

      const sections = await prisma.menuSection.findMany({
        where: { restaurantId: data.restaurantId },
        orderBy: { displayOrder: "asc" },
        include: {
          items: {
            orderBy: { displayOrder: "asc" },
          },
        },
      });

      return c.json(sections, 201);
    } catch (error) {
      return errorResponse(c, error);
    }
  })
  .put("/reorder", requireAuth, async (c) => {
    try {
      const auth = c.get("auth");
      const data = reorderSchema.parse(await c.req.json());
      await assertOwnership(data.restaurantId, auth.clerkId);

      await prisma.$transaction(async (tx) => {
        for (const section of data.sections) {
          await tx.menuSection.update({
            where: { id: section.id },
            data: { displayOrder: section.displayOrder },
          });

          for (const item of section.items) {
            await tx.menuItem.update({
              where: { id: item.id },
              data: {
                displayOrder: item.displayOrder,
                sectionId: item.sectionId,
              },
            });
          }
        }
      });

      return c.json({ ok: true });
    } catch (error) {
      return errorResponse(c, error);
    }
  });
