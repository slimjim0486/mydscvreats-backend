import { Hono } from "hono";
import { z } from "zod";
import {
  getEffectiveRestaurantBillingState,
  withRestaurantEntitlements,
} from "@/lib/entitlements";
import { ApiError } from "@/lib/errors";
import { errorResponse } from "@/lib/http";
import { buildLivePromotionWhere, buildPromotionInclude } from "@/lib/promotions";
import { prisma } from "@/lib/prisma";
import { slugify } from "@/lib/slug";
import { getCurrentUser, requireAuth, resolveAuthHeader } from "@/middleware/auth";

const restaurantThemeKeys = ["saffron", "midnight", "rose", "noir", "aegean", "neon"] as const;
const premiumThemeKeys = new Set(["noir", "aegean", "neon"]);

const createRestaurantSchema = z.object({
  name: z.string().min(2),
  description: z.string().nullable().optional(),
  cuisineType: z.string().nullable().optional(),
  themeKey: z.enum(restaurantThemeKeys).nullable().optional(),
  location: z.string().nullable().optional(),
  address: z.string().nullable().optional(),
  phone: z.string().nullable().optional(),
  website: z.string().nullable().optional(),
  whatsappNumber: z.string().max(32).nullable().optional(),
  whatsappPrefill: z.string().max(280).nullable().optional(),
  logoUrl: z.string().url().nullable().optional(),
  coverImageUrl: z.string().url().nullable().optional(),
  isPublished: z.boolean().optional(),
});

const updateRestaurantSchema = createRestaurantSchema.partial().extend({
  subscriptionStatus: z.enum(["trial", "active", "paused", "cancelled"]).optional(),
});

const restaurantDetailsInclude = {
  subscription: true,
  shortLink: true,
  menuSections: {
    orderBy: { displayOrder: "asc" as const },
    include: {
      items: {
        orderBy: { displayOrder: "asc" as const },
      },
    },
  },
  ...buildPromotionInclude(),
};

const restaurantPublicInclude = {
  subscription: true,
  shortLink: true,
  menuSections: {
    orderBy: { displayOrder: "asc" as const },
    include: {
      items: {
        orderBy: { displayOrder: "asc" as const },
        include: {
          images: {
            orderBy: { slot: "asc" as const },
          },
          dietaryTags: {
            include: { tag: true },
          },
        },
      },
    },
  },
  ...buildPromotionInclude({ availableOnly: true }),
};

async function getOwnedRestaurant(restaurantId: string, clerkId: string) {
  const restaurant = await prisma.restaurant.findFirst({
    where: {
      id: restaurantId,
      owner: {
        clerkId,
      },
    },
    include: restaurantDetailsInclude,
  });

  if (!restaurant) {
    throw new ApiError("Restaurant not found", 404);
  }

  return restaurant;
}

async function generateUniqueSlug(name: string, excludeRestaurantId?: string) {
  const baseSlug = slugify(name);
  let slug = baseSlug;
  let count = 1;

  while (true) {
    const [restaurantMatch, aliasMatch] = await Promise.all([
      prisma.restaurant.findUnique({
        where: { slug },
        select: { id: true },
      }),
      prisma.restaurantSlugAlias.findUnique({
        where: { slug },
        select: { restaurantId: true },
      }),
    ]);

    const slugTakenByRestaurant =
      restaurantMatch && restaurantMatch.id !== excludeRestaurantId;
    const slugTakenByAlias =
      aliasMatch && aliasMatch.restaurantId !== excludeRestaurantId;

    if (!slugTakenByRestaurant && !slugTakenByAlias) {
      return slug;
    }

    count += 1;
    slug = `${baseSlug}-${count}`;
  }
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

function normalizeOptionalText(value: string | null | undefined) {
  const trimmed = value?.trim();
  return trimmed ? trimmed : null;
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
          ...buildPromotionInclude(),
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
          whatsappNumber: normalizeOptionalText(data.whatsappNumber),
          whatsappPrefill: normalizeOptionalText(data.whatsappPrefill),
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
      const menuItemsWhere = auth ? undefined : { isAvailable: true };
      const livePromotionWhere = auth ? undefined : buildLivePromotionWhere(new Date());

      const restaurantInclude = {
        ...restaurantPublicInclude,
        promotions: {
          ...restaurantPublicInclude.promotions,
          ...(livePromotionWhere ? { where: livePromotionWhere } : {}),
        },
        menuSections: {
          ...restaurantPublicInclude.menuSections,
          include: {
            items: {
              ...restaurantPublicInclude.menuSections.include.items,
              where: menuItemsWhere,
            },
          },
        },
      };

      const primaryRestaurant = await prisma.restaurant.findUnique({
        where: { slug },
        include: restaurantInclude,
      });
      const alias = primaryRestaurant
        ? null
        : await prisma.restaurantSlugAlias.findUnique({
            where: { slug },
            include: {
              restaurant: {
                include: restaurantInclude,
              },
            },
          });
      const restaurant = primaryRestaurant ?? alias?.restaurant ?? null;

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
      const isPro = current.subscription?.plan === "pro" && current.subscription?.status !== "cancelled";

      if (data.themeKey && premiumThemeKeys.has(data.themeKey) && !isPro) {
        throw new ApiError("Premium themes require a Pro plan", 403);
      }

      const nextName = data.name?.trim() || current.name;
      const nextSlug = await generateUniqueSlug(nextName, current.id);

      const restaurant = await prisma.$transaction(async (tx) => {
        if (nextSlug !== current.slug) {
          await tx.restaurantSlugAlias.deleteMany({
            where: {
              restaurantId: current.id,
              slug: nextSlug,
            },
          });

          await tx.restaurantSlugAlias.upsert({
            where: { slug: current.slug },
            update: {},
            create: {
              restaurantId: current.id,
              slug: current.slug,
            },
          });
        }

        return tx.restaurant.update({
          where: { id: current.id },
          data: {
            ...data,
            whatsappNumber:
              data.whatsappNumber === undefined
                ? undefined
                : normalizeOptionalText(data.whatsappNumber),
            whatsappPrefill:
              data.whatsappPrefill === undefined
                ? undefined
                : normalizeOptionalText(data.whatsappPrefill),
            slug: nextSlug,
          },
          include: {
            subscription: true,
            shortLink: true,
          },
        });
      });

      return c.json(withRestaurantEntitlements(restaurant));
    } catch (error) {
      return errorResponse(c, error);
    }
  });
