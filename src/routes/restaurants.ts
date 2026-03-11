import { Hono } from "hono";
import { z } from "zod";
import {
  getEffectiveRestaurantBillingState,
  withRestaurantEntitlements,
} from "@/lib/entitlements";
import { ApiError } from "@/lib/errors";
import { errorResponse } from "@/lib/http";
import { prisma } from "@/lib/prisma";
import { slugify } from "@/lib/slug";
import { getCurrentUser, requireAuth, resolveAuthHeader } from "@/middleware/auth";

const createRestaurantSchema = z.object({
  name: z.string().min(2),
  description: z.string().nullable().optional(),
  cuisineType: z.string().nullable().optional(),
  themeKey: z.enum(["saffron", "midnight", "rose"]).nullable().optional(),
  location: z.string().nullable().optional(),
  address: z.string().nullable().optional(),
  phone: z.string().nullable().optional(),
  website: z.string().nullable().optional(),
  logoUrl: z.string().url().nullable().optional(),
  coverImageUrl: z.string().url().nullable().optional(),
  isPublished: z.boolean().optional(),
});

const updateRestaurantSchema = createRestaurantSchema.partial().extend({
  slug: z.string().optional(),
  subscriptionStatus: z.enum(["trial", "active", "paused", "cancelled"]).optional(),
});

async function getOwnedRestaurant(restaurantId: string, clerkId: string) {
  const restaurant = await prisma.restaurant.findFirst({
    where: {
      id: restaurantId,
      owner: {
        clerkId,
      },
    },
    include: {
      subscription: true,
      shortLink: true,
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

  return restaurant;
}

async function generateUniqueSlug(name: string) {
  const baseSlug = slugify(name);
  let slug = baseSlug;
  let count = 1;

  while (await prisma.restaurant.findUnique({ where: { slug } })) {
    count += 1;
    slug = `${baseSlug}-${count}`;
  }

  return slug;
}

function applyEffectiveBillingState<T extends {
  isPublished: boolean;
  subscriptionStatus: "trial" | "active" | "paused" | "cancelled";
  subscription?: {
    status: "trial" | "active" | "paused" | "cancelled";
  } | null;
}>(restaurant: T) {
  return {
    ...restaurant,
    ...getEffectiveRestaurantBillingState(restaurant),
  };
}

export const restaurantsRoute = new Hono<{
  Variables: {
    auth: {
      clerkId: string;
      email: string | null;
    };
  };
}>()
  .get("/", async (c) => {
    const cuisineType = c.req.query("cuisine");

    const restaurants = await prisma.restaurant.findMany({
      where: {
        OR: [
          { isPublished: true },
          {
            subscription: {
              is: {
                status: {
                  in: ["trial", "active"],
                },
              },
            },
          },
        ],
        ...(cuisineType ? { cuisineType } : {}),
      },
      include: {
        menuItems: true,
        subscription: true,
        shortLink: true,
      },
      orderBy: {
        updatedAt: "desc",
      },
    });

    return c.json(
      restaurants.map((restaurant) =>
        withRestaurantEntitlements(applyEffectiveBillingState(restaurant))
      )
    );
  })
  .get("/me", requireAuth, async (c) => {
    try {
      const auth = c.get("auth");
      const user = await getCurrentUser(auth);
      const restaurant = await prisma.restaurant.findFirst({
        where: { ownerId: user.id },
        include: {
          subscription: true,
          shortLink: true,
          menuSections: {
            orderBy: { displayOrder: "asc" },
            include: {
              items: {
                orderBy: { displayOrder: "asc" },
                include: {
                  images: {
                    orderBy: { slot: "asc" },
                  },
                  dietaryTags: {
                    include: { tag: true },
                  },
                },
              },
            },
          },
        },
      });

      const hydratedRestaurant = restaurant
        ? withRestaurantEntitlements(applyEffectiveBillingState(restaurant))
        : null;

      return c.json({
        user,
        restaurant: hydratedRestaurant,
      });
    } catch (error) {
      return errorResponse(c, error);
    }
  })
  .post("/", requireAuth, async (c) => {
    try {
      const auth = c.get("auth");
      const user = await getCurrentUser(auth);
      const data = createRestaurantSchema.parse(await c.req.json());
      const slug = await generateUniqueSlug(data.name);

      const restaurant = await prisma.restaurant.create({
        data: {
          slug,
          ownerId: user.id,
          name: data.name,
          description: data.description ?? null,
          cuisineType: data.cuisineType ?? null,
          themeKey: data.themeKey ?? null,
          location: data.location ?? null,
          address: data.address ?? null,
          phone: data.phone ?? null,
          website: data.website ?? null,
          logoUrl: data.logoUrl ?? null,
          coverImageUrl: data.coverImageUrl ?? null,
          isPublished: data.isPublished ?? false,
          trialEndsAt: null,
          subscriptionStatus: "trial",
        },
        include: {
          subscription: true,
          shortLink: true,
        },
      });

      return c.json(withRestaurantEntitlements(restaurant), 201);
    } catch (error) {
      return errorResponse(c, error);
    }
  })
  .get("/:slug", async (c) => {
    try {
      const slug = c.req.param("slug");
      const authHeader = c.req.header("authorization");
      const auth = authHeader ? await resolveAuthHeader(authHeader).catch(() => null) : null;

      const restaurant = await prisma.restaurant.findUnique({
        where: { slug },
        include: {
          subscription: true,
          shortLink: true,
          menuSections: {
            orderBy: { displayOrder: "asc" },
            include: {
              items: {
                where: auth ? undefined : { isAvailable: true },
                orderBy: { displayOrder: "asc" },
                include: {
                  images: {
                    orderBy: { slot: "asc" },
                  },
                  dietaryTags: {
                    include: { tag: true },
                  },
                },
              },
            },
          },
        },
      });

      if (!restaurant) {
        throw new ApiError("Restaurant not found", 404);
      }

      const hydratedRestaurant = applyEffectiveBillingState(restaurant);

      if (!hydratedRestaurant.isPublished) {
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
          throw new ApiError("Restaurant is not published", 404);
        }
      }

      return c.json(withRestaurantEntitlements(hydratedRestaurant));
    } catch (error) {
      return errorResponse(c, error);
    }
  })
  .put("/:id", requireAuth, async (c) => {
    try {
      const auth = c.get("auth");
      const restaurantId = c.req.param("id");
      const current = await getOwnedRestaurant(restaurantId, auth.clerkId);
      const data = updateRestaurantSchema.parse(await c.req.json());

      const restaurant = await prisma.restaurant.update({
        where: { id: current.id },
        data: {
          ...data,
          slug:
            data.slug && data.slug !== current.slug
              ? await generateUniqueSlug(data.slug)
              : current.slug,
        },
        include: {
          subscription: true,
          shortLink: true,
        },
      });

      return c.json(withRestaurantEntitlements(restaurant));
    } catch (error) {
      return errorResponse(c, error);
    }
  });
