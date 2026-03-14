import { Hono } from "hono";
import { z } from "zod";
import { ApiError } from "@/lib/errors";
import { errorResponse } from "@/lib/http";
import { prisma } from "@/lib/prisma";
import { requireAuth } from "@/middleware/auth";

const connectSchema = z.object({
  gbpUrl: z.string().url().optional(),
});

export const gbpRoute = new Hono<{
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

      const restaurant = await prisma.restaurant.findFirst({
        where: { id: restaurantId, owner: { clerkId: auth.clerkId } },
        select: { id: true },
      });

      if (!restaurant) {
        throw new ApiError("Restaurant not found", 404);
      }

      const connection = await prisma.gbpConnection.findUnique({
        where: { restaurantId },
      });

      return c.json(connection);
    } catch (error) {
      return errorResponse(c, error);
    }
  })
  .post("/:restaurantId/connect", requireAuth, async (c) => {
    try {
      const auth = c.get("auth");
      const restaurantId = c.req.param("restaurantId");

      const restaurant = await prisma.restaurant.findFirst({
        where: { id: restaurantId, owner: { clerkId: auth.clerkId } },
        select: { id: true },
      });

      if (!restaurant) {
        throw new ApiError("Restaurant not found", 404);
      }

      const body = connectSchema.parse(await c.req.json());

      const connection = await prisma.gbpConnection.upsert({
        where: { restaurantId },
        create: {
          restaurantId,
          status: "self_reported",
          gbpUrl: body.gbpUrl ?? null,
          connectedAt: new Date(),
        },
        update: {
          status: "self_reported",
          gbpUrl: body.gbpUrl ?? undefined,
          connectedAt: new Date(),
        },
      });

      return c.json(connection, 201);
    } catch (error) {
      return errorResponse(c, error);
    }
  })
  .delete("/:restaurantId", requireAuth, async (c) => {
    try {
      const auth = c.get("auth");
      const restaurantId = c.req.param("restaurantId");

      const restaurant = await prisma.restaurant.findFirst({
        where: { id: restaurantId, owner: { clerkId: auth.clerkId } },
        select: { id: true },
      });

      if (!restaurant) {
        throw new ApiError("Restaurant not found", 404);
      }

      await prisma.gbpConnection.deleteMany({
        where: { restaurantId },
      });

      return c.json({ ok: true });
    } catch (error) {
      return errorResponse(c, error);
    }
  });
