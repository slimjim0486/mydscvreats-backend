import { Hono } from "hono";
import { z } from "zod";
import { ApiError } from "@/lib/errors";
import { errorResponse } from "@/lib/http";
import { prisma } from "@/lib/prisma";
import {
  WHATSAPP_TEMPLATE_LIBRARY,
  buildTemplateParameters,
  decryptAccessToken,
  encryptAccessToken,
  exchangeEmbeddedSignupCode,
  fetchWhatsAppTemplates,
  getEmbeddedSignupConfig,
  getTokenLastFour,
  mapTemplateStatus,
  normalizeWhatsAppPhone,
  renderTemplatePreview,
  sendWhatsAppTemplate,
} from "@/lib/whatsapp-business";
import { requireAuth } from "@/middleware/auth";

const campaignSchema = z.object({
  type: z.enum(["inactive_30", "weekend_special", "new_promotion"]),
  name: z.string().trim().min(2).max(120).optional(),
  templateName: z.string().trim().min(2).max(80).optional(),
  body: z.string().trim().min(10).max(900).optional(),
  promotionId: z.string().cuid().optional(),
});

const consentSchema = z.object({
  marketingOptIn: z.boolean(),
});

const integrationSchema = z.object({
  code: z.string().min(8).optional(),
  accessToken: z.string().min(20).optional(),
  wabaId: z.string().min(2).optional(),
  businessAccountId: z.string().min(2).optional(),
  phoneNumberId: z.string().min(2),
  displayPhoneNumber: z.string().min(6).max(32),
});

async function getOwnedRestaurant(restaurantId: string, clerkId: string) {
  const restaurant = await prisma.restaurant.findFirst({
    where: {
      id: restaurantId,
      owner: {
        clerkId,
      },
    },
    select: {
      id: true,
      name: true,
      slug: true,
      whatsappNumber: true,
    },
  });

  if (!restaurant) {
    throw new ApiError("Restaurant not found", 404);
  }

  return restaurant;
}

function toNumber(value: { toString(): string } | number | null | undefined) {
  if (value === null || value === undefined) {
    return 0;
  }

  return Number(value.toString());
}

function buildWhatsappUrl(phoneNumber: string, body: string) {
  const digitsOnly = phoneNumber.replace(/\D/g, "");
  const url = new URL(`https://wa.me/${digitsOnly}`);
  url.searchParams.set("text", body);
  return url.toString();
}

function getDefaultCampaignBody(input: {
  type: "inactive_30" | "weekend_special" | "new_promotion";
  restaurantName: string;
  promotionTitle?: string | null;
}) {
  if (input.type === "inactive_30") {
    return `Hi {{name}}, we miss you at ${input.restaurantName}. Your favorites are ready whenever you are. Reply here to order on WhatsApp.`;
  }

  if (input.type === "new_promotion") {
    const offer = input.promotionTitle ? `: ${input.promotionTitle}` : "";
    return `Hi {{name}}, ${input.restaurantName} just added a new offer${offer}. Reply here and we will help you order.`;
  }

  return `Hi {{name}}, planning weekend food? ${input.restaurantName} is taking WhatsApp orders now. Reply here to place yours.`;
}

function personalizeBody(body: string, customerName: string) {
  return body.replace(/\{\{\s*name\s*\}\}/gi, customerName);
}

function buildTemplateLibrary(records: Array<{
  name: string;
  language: string;
  status: string;
  metaTemplateId: string | null;
  rejectionReason: string | null;
  lastSyncedAt: Date | null;
}>) {
  return WHATSAPP_TEMPLATE_LIBRARY.map((template) => {
    const record = records.find(
      (entry) => entry.name === template.name && entry.language === template.language
    );

    return {
      ...template,
      status: record?.status ?? "draft",
      metaTemplateId: record?.metaTemplateId ?? null,
      rejectionReason: record?.rejectionReason ?? null,
      lastSyncedAt: record?.lastSyncedAt ?? null,
    };
  });
}

export const crmRoute = new Hono<{
  Variables: {
    auth: {
      clerkId: string;
      email: string | null;
    };
  };
}>()
  .get("/:restaurantId", requireAuth, async (c) => {
    try {
      const restaurantId = c.req.param("restaurantId");
      const auth = c.get("auth");
      await getOwnedRestaurant(restaurantId, auth.clerkId);

      const inactiveCutoff = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
      const [
        customerCount,
        optedInCount,
        repeatCustomerCount,
        inactive30Count,
        orderCount,
        revenue,
        recentOrders,
        customers,
        campaigns,
        promotions,
        integration,
        templateRecords,
        conversations,
      ] = await Promise.all([
        prisma.customer.count({ where: { restaurantId } }),
        prisma.customer.count({ where: { restaurantId, marketingOptIn: true } }),
        prisma.customer.count({ where: { restaurantId, orderCount: { gt: 1 } } }),
        prisma.customer.count({
          where: {
            restaurantId,
            marketingOptIn: true,
            lastOrderAt: {
              lt: inactiveCutoff,
            },
          },
        }),
        prisma.orderIntent.count({ where: { restaurantId } }),
        prisma.orderIntent.aggregate({
          where: { restaurantId },
          _sum: {
            totalPrice: true,
          },
        }),
        prisma.orderIntent.findMany({
          where: { restaurantId },
          orderBy: { createdAt: "desc" },
          take: 10,
          include: {
            customer: true,
            items: {
              orderBy: { createdAt: "asc" },
            },
          },
        }),
        prisma.customer.findMany({
          where: { restaurantId },
          orderBy: [{ lastOrderAt: "desc" }, { createdAt: "desc" }],
          take: 50,
        }),
        prisma.campaign.findMany({
          where: { restaurantId },
          orderBy: { createdAt: "desc" },
          take: 10,
          include: {
            promotion: {
              select: {
                id: true,
                title: true,
              },
            },
            messages: {
              select: {
                id: true,
                customerId: true,
                status: true,
                whatsappUrl: true,
                createdAt: true,
              },
              orderBy: {
                createdAt: "desc",
              },
              take: 5,
            },
          },
        }),
        prisma.promotion.findMany({
          where: {
            restaurantId,
            isActive: true,
          },
          orderBy: [{ isFeatured: "desc" }, { displayOrder: "asc" }],
          take: 20,
          select: {
            id: true,
            title: true,
            subtitle: true,
            promoPrice: true,
            startsAt: true,
            endsAt: true,
          },
        }),
        prisma.whatsAppIntegration.findUnique({
          where: {
            restaurantId,
          },
          select: {
            id: true,
            status: true,
            wabaId: true,
            businessAccountId: true,
            phoneNumberId: true,
            displayPhoneNumber: true,
            tokenLastFour: true,
            connectedAt: true,
            lastWebhookAt: true,
            lastTemplateSyncAt: true,
            lastError: true,
            updatedAt: true,
          },
        }),
        prisma.whatsAppTemplate.findMany({
          where: {
            restaurantId,
          },
          select: {
            name: true,
            language: true,
            status: true,
            metaTemplateId: true,
            rejectionReason: true,
            lastSyncedAt: true,
          },
        }),
        prisma.whatsAppConversation.findMany({
          where: {
            restaurantId,
          },
          orderBy: {
            lastMessageAt: "desc",
          },
          take: 10,
          include: {
            messages: {
              orderBy: {
                createdAt: "desc",
              },
              take: 1,
            },
          },
        }),
      ]);

      return c.json({
        stats: {
          customerCount,
          optedInCount,
          repeatCustomerCount,
          inactive30Count,
          orderCount,
          estimatedRevenue: toNumber(revenue._sum.totalPrice),
        },
        recentOrders: recentOrders.map((order) => ({
          id: order.id,
          customerId: order.customerId,
          customerName: order.customerName,
          phoneNumber: order.phoneNumber,
          fulfillmentMethod: order.fulfillmentMethod,
          address: order.address,
          notes: order.notes,
          totalPrice: toNumber(order.totalPrice),
          currency: order.currency,
          itemCount: order.itemCount,
          createdAt: order.createdAt,
          items: order.items.map((item) => ({
            id: item.id,
            menuItemId: item.menuItemId,
            itemName: item.itemName,
            quantity: item.quantity,
            unitPrice: toNumber(item.unitPrice),
          })),
        })),
        customers: customers.map((customer) => ({
          id: customer.id,
          displayName: customer.displayName,
          phoneNumber: customer.phoneNumber,
          marketingOptIn: customer.marketingOptIn,
          lastOrderAt: customer.lastOrderAt,
          orderCount: customer.orderCount,
          totalSpend: toNumber(customer.totalSpend),
          currency: customer.currency,
          createdAt: customer.createdAt,
        })),
        campaigns: campaigns.map((campaign) => ({
          id: campaign.id,
          type: campaign.type,
          status: campaign.status,
          name: campaign.name,
          templateName: campaign.templateName,
          body: campaign.body,
          targetSegment: campaign.targetSegment,
          targetCount: campaign.targetCount,
          loggedCount: campaign.loggedCount,
          createdAt: campaign.createdAt,
          loggedAt: campaign.loggedAt,
          promotion: campaign.promotion,
          messages: campaign.messages,
        })),
        promotions: promotions.map((promotion) => ({
          ...promotion,
          promoPrice: toNumber(promotion.promoPrice),
        })),
        whatsapp: {
          embeddedSignup: getEmbeddedSignupConfig(),
          integration,
          templates: buildTemplateLibrary(templateRecords),
          conversations: conversations.map((conversation) => ({
            id: conversation.id,
            customerId: conversation.customerId,
            customerPhone: conversation.customerPhone,
            customerName: conversation.customerName,
            lastMessageAt: conversation.lastMessageAt,
            unreadCount: conversation.unreadCount,
            latestMessage: conversation.messages[0]
              ? {
                  id: conversation.messages[0].id,
                  direction: conversation.messages[0].direction,
                  type: conversation.messages[0].type,
                  status: conversation.messages[0].status,
                  body: conversation.messages[0].body,
                  createdAt: conversation.messages[0].createdAt,
                }
              : null,
          })),
        },
      });
    } catch (error) {
      return errorResponse(c, error);
    }
  })
  .post("/:restaurantId/whatsapp-integration", requireAuth, async (c) => {
    try {
      const restaurantId = c.req.param("restaurantId");
      const auth = c.get("auth");
      await getOwnedRestaurant(restaurantId, auth.clerkId);
      const data = integrationSchema.parse(await c.req.json());
      const accessToken = data.accessToken ?? (data.code ? await exchangeEmbeddedSignupCode(data.code) : null);

      if (!accessToken) {
        throw new ApiError("WhatsApp access token or embedded signup code is required.", 400);
      }

      const integration = await prisma.whatsAppIntegration.upsert({
        where: {
          restaurantId,
        },
        create: {
          restaurantId,
          status: "connected",
          wabaId: data.wabaId ?? null,
          businessAccountId: data.businessAccountId ?? null,
          phoneNumberId: data.phoneNumberId,
          displayPhoneNumber: normalizeWhatsAppPhone(data.displayPhoneNumber),
          accessTokenCipher: encryptAccessToken(accessToken),
          tokenLastFour: getTokenLastFour(accessToken),
          connectedAt: new Date(),
          lastError: null,
        },
        update: {
          status: "connected",
          wabaId: data.wabaId ?? undefined,
          businessAccountId: data.businessAccountId ?? undefined,
          phoneNumberId: data.phoneNumberId,
          displayPhoneNumber: normalizeWhatsAppPhone(data.displayPhoneNumber),
          accessTokenCipher: encryptAccessToken(accessToken),
          tokenLastFour: getTokenLastFour(accessToken),
          connectedAt: new Date(),
          lastError: null,
        },
        select: {
          id: true,
          status: true,
          wabaId: true,
          businessAccountId: true,
          phoneNumberId: true,
          displayPhoneNumber: true,
          tokenLastFour: true,
          connectedAt: true,
          lastWebhookAt: true,
          lastTemplateSyncAt: true,
          lastError: true,
          updatedAt: true,
        },
      });

      await prisma.whatsAppTemplate.createMany({
        data: WHATSAPP_TEMPLATE_LIBRARY.map((template) => ({
          restaurantId,
          integrationId: integration.id,
          name: template.name,
          label: template.label,
          category: template.category,
          language: template.language,
          status: "draft",
          body: template.body,
          variables: template.variables,
        })),
        skipDuplicates: true,
      });

      return c.json({ integration }, 201);
    } catch (error) {
      return errorResponse(c, error);
    }
  })
  .delete("/:restaurantId/whatsapp-integration", requireAuth, async (c) => {
    try {
      const restaurantId = c.req.param("restaurantId");
      const auth = c.get("auth");
      await getOwnedRestaurant(restaurantId, auth.clerkId);

      const integration = await prisma.whatsAppIntegration.update({
        where: {
          restaurantId,
        },
        data: {
          status: "disconnected",
          lastError: null,
        },
        select: {
          id: true,
          status: true,
        },
      });

      return c.json({ integration });
    } catch (error) {
      return errorResponse(c, error);
    }
  })
  .post("/:restaurantId/whatsapp-integration/sync-templates", requireAuth, async (c) => {
    try {
      const restaurantId = c.req.param("restaurantId");
      const auth = c.get("auth");
      await getOwnedRestaurant(restaurantId, auth.clerkId);

      const integration = await prisma.whatsAppIntegration.findUnique({
        where: {
          restaurantId,
        },
      });

      if (!integration?.wabaId) {
        throw new ApiError("Connect a WhatsApp Business account before syncing templates.", 400);
      }

      const accessToken = decryptAccessToken(integration.accessTokenCipher);
      const response = await fetchWhatsAppTemplates({
        accessToken,
        wabaId: integration.wabaId,
      });
      const templates = response.data ?? [];
      const syncedAt = new Date();

      for (const template of templates) {
        const libraryTemplate = WHATSAPP_TEMPLATE_LIBRARY.find((entry) => entry.name === template.name);
        const body =
          template.components?.find((component) => component.type?.toUpperCase() === "BODY")?.text ??
          libraryTemplate?.body ??
          "";

        await prisma.whatsAppTemplate.upsert({
          where: {
            restaurantId_name_language: {
              restaurantId,
              name: template.name,
              language: template.language ?? "en",
            },
          },
          create: {
            restaurantId,
            integrationId: integration.id,
            name: template.name,
            label: libraryTemplate?.label ?? template.name.replace(/_/g, " "),
            category: template.category ?? libraryTemplate?.category ?? "MARKETING",
            language: template.language ?? "en",
            status: mapTemplateStatus(template.status),
            body,
            variables: libraryTemplate?.variables ?? [],
            metaTemplateId: template.id ?? null,
            rejectionReason: template.rejected_reason ?? null,
            lastSyncedAt: syncedAt,
          },
          update: {
            integrationId: integration.id,
            category: template.category ?? libraryTemplate?.category ?? "MARKETING",
            status: mapTemplateStatus(template.status),
            body,
            metaTemplateId: template.id ?? null,
            rejectionReason: template.rejected_reason ?? null,
            lastSyncedAt: syncedAt,
          },
        });
      }

      await prisma.whatsAppIntegration.update({
        where: {
          id: integration.id,
        },
        data: {
          lastTemplateSyncAt: syncedAt,
          lastError: null,
        },
      });

      return c.json({ synced: templates.length, syncedAt });
    } catch (error) {
      return errorResponse(c, error);
    }
  })
  .post("/:restaurantId/campaigns", requireAuth, async (c) => {
    try {
      const restaurantId = c.req.param("restaurantId");
      const auth = c.get("auth");
      const restaurant = await getOwnedRestaurant(restaurantId, auth.clerkId);
      const data = campaignSchema.parse(await c.req.json());

      const promotion = data.promotionId
        ? await prisma.promotion.findFirst({
            where: {
              id: data.promotionId,
              restaurantId,
            },
            select: {
              id: true,
              title: true,
            },
          })
        : null;

      if (data.promotionId && !promotion) {
        throw new ApiError("Promotion not found", 404);
      }

      const templateName = data.templateName ?? data.type;
      const [integration, templateRecord] = await Promise.all([
        prisma.whatsAppIntegration.findFirst({
          where: {
            restaurantId,
            status: "connected",
          },
        }),
        prisma.whatsAppTemplate.findUnique({
          where: {
            restaurantId_name_language: {
              restaurantId,
              name: templateName,
              language: "en",
            },
          },
        }),
      ]);
      const canSendViaApi = Boolean(integration && templateRecord?.status === "approved");
      const inactiveCutoff = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
      const customerWhere =
        data.type === "inactive_30"
          ? {
              restaurantId,
              marketingOptIn: true,
              lastOrderAt: {
                lt: inactiveCutoff,
              },
            }
          : {
              restaurantId,
              marketingOptIn: true,
            };

      const customers = await prisma.customer.findMany({
        where: customerWhere,
        orderBy: [{ lastOrderAt: "asc" }, { createdAt: "asc" }],
        take: 100,
      });
      const body =
        data.body ??
        getDefaultCampaignBody({
          type: data.type,
          restaurantName: restaurant.name,
          promotionTitle: promotion?.title,
        });
      const campaignName =
        data.name ??
        (data.type === "inactive_30"
          ? "30-day reactivation"
          : data.type === "new_promotion"
            ? "New promotion broadcast"
            : "Weekend special broadcast");

      const campaign = await prisma.campaign.create({
        data: {
          restaurantId,
          promotionId: promotion?.id ?? null,
          type: data.type,
          status: canSendViaApi ? "sending" : "logged",
          name: campaignName,
          templateName,
          body,
          targetSegment: data.type,
          targetCount: customers.length,
          loggedCount: 0,
        },
      });

      let accessToken: string | null = null;
      if (canSendViaApi && integration) {
        accessToken = decryptAccessToken(integration.accessTokenCipher);
      }

      let loggedCount = 0;
      let failedCount = 0;

      for (const customer of customers) {
        const parameters = buildTemplateParameters({
          templateName,
          customerName: customer.displayName,
          restaurantName: restaurant.name,
          promotionTitle: promotion?.title,
        });
        const personalizedBody = data.body
          ? personalizeBody(data.body, customer.displayName)
          : renderTemplatePreview(templateName, parameters);

        if (!canSendViaApi || !integration || !accessToken) {
          await prisma.messageLog.create({
            data: {
              restaurantId,
              customerId: customer.id,
              campaignId: campaign.id,
              status: "logged",
              body: personalizedBody,
              templateName,
              whatsappUrl: buildWhatsappUrl(customer.phoneNumber, personalizedBody),
            },
          });
          loggedCount += 1;
          continue;
        }

        try {
          const providerMessageId = await sendWhatsAppTemplate({
            accessToken,
            phoneNumberId: integration.phoneNumberId,
            to: customer.phoneNumber,
            templateName,
            language: "en",
            parameters,
          });
          const sentAt = new Date();

          await prisma.$transaction(async (tx) => {
            const conversation = await tx.whatsAppConversation.upsert({
              where: {
                restaurantId_customerPhone: {
                  restaurantId,
                  customerPhone: customer.normalizedPhone,
                },
              },
              create: {
                restaurantId,
                integrationId: integration.id,
                customerId: customer.id,
                customerPhone: customer.normalizedPhone,
                customerName: customer.displayName,
                lastMessageAt: sentAt,
              },
              update: {
                integrationId: integration.id,
                customerId: customer.id,
                customerName: customer.displayName,
                lastMessageAt: sentAt,
              },
              select: {
                id: true,
              },
            });

            const messageLog = await tx.messageLog.create({
              data: {
                restaurantId,
                customerId: customer.id,
                campaignId: campaign.id,
                status: "sent",
                body: personalizedBody,
                templateName,
                providerMessageId,
                sentAt,
              },
              select: {
                id: true,
              },
            });

            await tx.whatsAppMessage.create({
              data: {
                restaurantId,
                integrationId: integration.id,
                conversationId: conversation.id,
                customerId: customer.id,
                messageLogId: messageLog.id,
                providerMessageId,
                direction: "outbound",
                type: "template",
                status: "sent",
                fromPhone: integration.displayPhoneNumber,
                toPhone: customer.normalizedPhone,
                body: personalizedBody,
                sentAt,
              },
            });
          });

          loggedCount += 1;
        } catch (error) {
          failedCount += 1;
          await prisma.messageLog.create({
            data: {
              restaurantId,
              customerId: customer.id,
              campaignId: campaign.id,
              status: "failed",
              body: personalizedBody,
              templateName,
              whatsappUrl: buildWhatsappUrl(customer.phoneNumber, personalizedBody),
              errorMessage: error instanceof Error ? error.message : "WhatsApp send failed",
              failedAt: new Date(),
            },
          });
        }
      }

      const updatedCampaign = await prisma.campaign.update({
        where: {
          id: campaign.id,
        },
        data: {
          status: canSendViaApi && failedCount === customers.length && customers.length > 0 ? "failed" : canSendViaApi ? "sent" : "logged",
          loggedCount,
          loggedAt: new Date(),
        },
      });

      return c.json({
        campaign: updatedCampaign,
        targeted: customers.length,
        sent: canSendViaApi ? loggedCount : 0,
        failed: failedCount,
        mode: canSendViaApi ? "meta_cloud_api" : "whatsapp_link",
      }, 201);
    } catch (error) {
      return errorResponse(c, error);
    }
  })
  .patch("/:restaurantId/customers/:customerId/consent", requireAuth, async (c) => {
    try {
      const restaurantId = c.req.param("restaurantId");
      const customerId = c.req.param("customerId");
      const auth = c.get("auth");
      await getOwnedRestaurant(restaurantId, auth.clerkId);
      const data = consentSchema.parse(await c.req.json());

      const updated = await prisma.$transaction(async (tx) => {
        const existingCustomer = await tx.customer.findFirst({
          where: {
            id: customerId,
            restaurantId,
          },
          select: {
            id: true,
          },
        });

        if (!existingCustomer) {
          throw new ApiError("Customer not found", 404);
        }

        const customer = await tx.customer.update({
          where: {
            id: customerId,
          },
          data: {
            marketingOptIn: data.marketingOptIn,
            marketingOptInAt: data.marketingOptIn ? new Date() : undefined,
            marketingOptOutAt: data.marketingOptIn ? null : new Date(),
          },
        });

        await tx.customerConsent.create({
          data: {
            restaurantId,
            customerId,
            status: data.marketingOptIn ? "opt_in" : "opt_out",
            source: "dashboard",
          },
        });

        return customer;
      });

      return c.json({
        id: updated.id,
        marketingOptIn: updated.marketingOptIn,
      });
    } catch (error) {
      return errorResponse(c, error);
    }
  });
