import { Hono } from "hono";
import { z } from "zod";
import {
  getCustomDomainCnameTarget,
  isAppHostname,
  isValidCustomHostname,
  normalizeHostname,
  verifyCustomDomainHostname,
} from "@/lib/domains";
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

const customDomainSchema = z.object({
  hostname: z.string().min(3),
});

const publicRestaurantInclude = (includeUnavailableItems: boolean) => ({
  subscription: true,
  customDomain: true,
  menuSections: {
    orderBy: { displayOrder: "asc" as const },
    include: {
      items: {
        ...(includeUnavailableItems ? {} : { where: { isAvailable: true } }),
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
      customDomain: true,
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

async function getOwnedRestaurantWithEntitlements(restaurantId: string, clerkId: string) {
  const restaurant = await getOwnedRestaurant(restaurantId, clerkId);
  return withRestaurantEntitlements(applyEffectiveBillingState(restaurant));
}

async function syncRestaurantCustomDomain(restaurantId: string, hostname: string) {
  const normalizedHostname = normalizeHostname(hostname);
  const verificationTarget = getCustomDomainCnameTarget();

  const record = await prisma.restaurantDomain.upsert({
    where: { restaurantId },
    create: {
      restaurantId,
      hostname: normalizedHostname,
      verificationTarget,
      status: "verifying",
      lastCheckedAt: new Date(),
    },
    update: {
      hostname: normalizedHostname,
      verificationTarget,
      status: "verifying",
      lastCheckedAt: new Date(),
      verifiedAt: null,
    },
  });

  const verification = await verifyCustomDomainHostname(normalizedHostname);

  return prisma.restaurantDomain.update({
    where: { id: record.id },
    data: {
      verificationTarget: verification.target,
      status: verification.status,
      lastCheckedAt: new Date(),
      verifiedAt: verification.status === "active" ? new Date() : null,
    },
  });
}

function assertCustomDomainAccess(restaurant: {
  entitlements: {
    customDomainEnabled: boolean;
  };
}) {
  if (!restaurant.entitlements.customDomainEnabled) {
    throw new ApiError("Custom domains are available on the Pro plan.", 403);
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
        customDomain: true,
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
          customDomain: true,
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
          customDomain: true,
        },
      });

      return c.json(withRestaurantEntitlements(restaurant), 201);
    } catch (error) {
      return errorResponse(c, error);
    }
  })
  .get("/resolve/by-host", async (c) => {
    try {
      const hostname = normalizeHostname(c.req.query("hostname") ?? "");

      if (!hostname || isAppHostname(hostname)) {
        throw new ApiError("Restaurant not found", 404);
      }

      const restaurant = await prisma.restaurant.findFirst({
        where: {
          customDomain: {
            is: {
              hostname,
              status: "active",
            },
          },
        },
        include: publicRestaurantInclude(false),
      });

      if (!restaurant) {
        throw new ApiError("Restaurant not found", 404);
      }

      const hydratedRestaurant = withRestaurantEntitlements(applyEffectiveBillingState(restaurant));

      if (!hydratedRestaurant.isPublished || !hydratedRestaurant.entitlements.customDomainEnabled) {
        throw new ApiError("Restaurant not found", 404);
      }

      return c.json(hydratedRestaurant);
    } catch (error) {
      return errorResponse(c, error);
    }
  })
  .post("/:id/custom-domain", requireAuth, async (c) => {
    try {
      const auth = c.get("auth");
      const restaurantId = c.req.param("id");
      const restaurant = await getOwnedRestaurantWithEntitlements(restaurantId, auth.clerkId);
      assertCustomDomainAccess(restaurant);

      const data = customDomainSchema.parse(await c.req.json());
      const hostname = normalizeHostname(data.hostname);

      if (!isValidCustomHostname(hostname)) {
        throw new ApiError(
          "Use a subdomain like menu.yourrestaurant.com that points to the mydscvr app host.",
          400
        );
      }

      const existing = await prisma.restaurantDomain.findUnique({
        where: { hostname },
      });

      if (existing && existing.restaurantId !== restaurant.id) {
        throw new ApiError("That hostname is already connected to another restaurant.", 409);
      }

      const customDomain = await syncRestaurantCustomDomain(restaurant.id, hostname);
      return c.json(customDomain, 201);
    } catch (error) {
      return errorResponse(c, error);
    }
  })
  .post("/:id/custom-domain/verify", requireAuth, async (c) => {
    try {
      const auth = c.get("auth");
      const restaurantId = c.req.param("id");
      const restaurant = await getOwnedRestaurantWithEntitlements(restaurantId, auth.clerkId);
      assertCustomDomainAccess(restaurant);

      if (!restaurant.customDomain?.hostname) {
        throw new ApiError("No custom domain is connected yet.", 404);
      }

      const customDomain = await syncRestaurantCustomDomain(
        restaurant.id,
        restaurant.customDomain.hostname
      );

      return c.json(customDomain);
    } catch (error) {
      return errorResponse(c, error);
    }
  })
  .delete("/:id/custom-domain", requireAuth, async (c) => {
    try {
      const auth = c.get("auth");
      const restaurantId = c.req.param("id");
      const restaurant = await getOwnedRestaurant(restaurantId, auth.clerkId);

      if (!restaurant.customDomain) {
        return c.body(null, 204);
      }

      await prisma.restaurantDomain.delete({
        where: { restaurantId: restaurant.id },
      });

      return c.body(null, 204);
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
        include: publicRestaurantInclude(Boolean(auth)),
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
      });

      return c.json(withRestaurantEntitlements(restaurant));
    } catch (error) {
      return errorResponse(c, error);
    }
  });
