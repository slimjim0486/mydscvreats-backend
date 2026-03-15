import { Hono } from "hono";
import { z } from "zod";
import { getRestaurantEntitlements } from "@/lib/entitlements";
import { ApiError } from "@/lib/errors";
import { errorResponse } from "@/lib/http";
import { prisma } from "@/lib/prisma";
import { requireAuth } from "@/middleware/auth";
import {
  generateMenuPdf,
  type PdfTemplate,
  type PdfRestaurantData,
} from "@/services/pdf-export";

const templateParam = z.enum(["table-card", "full-menu"]).default("full-menu");

export const pdfExportRoute = new Hono()
  .get("/:restaurantId", requireAuth, async (c) => {
    try {
      const auth = c.get("auth");
      const { restaurantId } = c.req.param();
      const templateRaw = c.req.query("template") ?? "full-menu";
      const template = templateParam.parse(templateRaw) as PdfTemplate;

      const restaurant = await prisma.restaurant.findUnique({
        where: { id: restaurantId },
        include: {
          owner: { select: { clerkId: true } },
          subscription: { select: { plan: true, status: true } },
          menuSections: {
            orderBy: { displayOrder: "asc" },
            include: {
              items: {
                where: { isAvailable: true },
                orderBy: { displayOrder: "asc" },
                include: {
                  dietaryTags: {
                    include: {
                      tag: { select: { label: true } },
                    },
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

      if (restaurant.owner.clerkId !== auth.clerkId) {
        throw new ApiError("Not authorized", 403);
      }

      const entitlements = getRestaurantEntitlements(restaurant);

      // Map to PDF-friendly structure
      const pdfData: PdfRestaurantData = {
        name: restaurant.name,
        slug: restaurant.slug,
        cuisineType: restaurant.cuisineType,
        location: restaurant.location,
        themeKey: restaurant.themeKey,
        logoUrl: restaurant.logoUrl,
        whatsappNumber: restaurant.whatsappNumber,
        sections: restaurant.menuSections.map((section) => ({
          name: section.name,
          items: section.items.map((item) => ({
            name: item.name,
            description: item.description,
            price: item.price ? Number(item.price) : null,
            currency: item.currency ?? "AED",
            isAvailable: item.isAvailable,
            dietaryTags: item.dietaryTags.map((dt) => ({
              label: dt.tag.label,
            })),
          })),
        })),
      };

      const pdfBuffer = await generateMenuPdf({
        restaurant: pdfData,
        template,
        hideBranding: entitlements.hideBranding,
      });

      const filename = `${restaurant.slug}-menu-${template}.pdf`;

      return new Response(new Uint8Array(pdfBuffer), {
        headers: {
          "Content-Type": "application/pdf",
          "Content-Disposition": `attachment; filename="${filename}"`,
          "Content-Length": String(pdfBuffer.length),
        },
      });
    } catch (error) {
      return errorResponse(c, error);
    }
  });
