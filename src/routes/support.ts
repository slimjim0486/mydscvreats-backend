import { Hono, type Context } from "hono";
import { z } from "zod";
import type { Prisma, SupportTicketSeverity } from "@prisma/client";
import { getRestaurantEntitlements } from "@/lib/entitlements";
import { ApiError } from "@/lib/errors";
import { errorResponse } from "@/lib/http";
import { prisma } from "@/lib/prisma";
import { assertRateLimit } from "@/lib/public-request-guards";
import { getCurrentUser, requireAuth } from "@/middleware/auth";
import {
  calculateSupportPriority,
  effectiveSeverity,
  findFaqMatches,
  isTicketClosed,
  mirrorSupportUpdateToOwnerChat,
  serializeSupportTicket,
  supportTicketInclude,
  supportTicketListInclude,
  triageSupportTicket,
} from "@/services/support";

const supportTicketStatuses = ["open", "in_progress", "waiting_on_customer", "resolved", "closed"] as const;

const createTicketSchema = z.object({
  title: z.string().trim().min(4).max(160),
  description: z.string().trim().min(10).max(5000),
  source: z.enum(["dashboard", "sous_chef"]).default("dashboard"),
});

const addMessageSchema = z.object({
  body: z.string().trim().min(1).max(5000),
});

const faqSearchSchema = z.object({
  query: z.string().trim().min(2).max(500),
});

const closeTicketSchema = z.object({
  resolutionSummary: z.string().trim().max(2000).optional(),
});

const listTicketsQuerySchema = z.object({
  status: z.enum(supportTicketStatuses).optional(),
});

const MINUTE = 60_000;
const HOUR = 60 * MINUTE;
const DAY = 24 * HOUR;

function setNoStoreHeaders(c: Context) {
  c.header("Cache-Control", "private, no-store, max-age=0");
  c.header("Pragma", "no-cache");
}

function limitSupportUser(auth: { clerkId: string }, action: string, limit: number, windowMs: number) {
  assertRateLimit({
    key: `support:${action}:user:${auth.clerkId}`,
    limit,
    windowMs,
  });
}

function limitSupportRestaurant(restaurantId: string, action: string, limit: number, windowMs: number) {
  assertRateLimit({
    key: `support:${action}:restaurant:${restaurantId}`,
    limit,
    windowMs,
  });
}

async function loadOwnedRestaurant(restaurantId: string, clerkId: string) {
  const restaurant = await prisma.restaurant.findFirst({
    where: { id: restaurantId, owner: { clerkId } },
    include: {
      owner: true,
      subscription: true,
      operatorAccount: true,
    },
  });

  if (!restaurant) {
    throw new ApiError("Restaurant not found", 404);
  }

  return restaurant;
}

async function loadOwnedTicket(ticketId: string, restaurantId: string, clerkId: string) {
  await loadOwnedRestaurant(restaurantId, clerkId);
  const ticket = await prisma.supportTicket.findFirst({
    where: { id: ticketId, restaurantId },
    include: supportTicketInclude,
  });

  if (!ticket) {
    throw new ApiError("Support ticket not found", 404);
  }

  return ticket;
}

export const supportRoute = new Hono<{
  Variables: {
    auth: { clerkId: string; email: string | null; fullName: string | null };
  };
}>()
  .use("*", async (c, next) => {
    setNoStoreHeaders(c);
    await next();
  })
  .post("/:restaurantId/faq/search", requireAuth, async (c) => {
    try {
      const auth = c.get("auth");
      const restaurantId = c.req.param("restaurantId");
      limitSupportUser(auth, "faq-search", 60, 10 * MINUTE);
      limitSupportRestaurant(restaurantId, "faq-search", 180, 10 * MINUTE);
      await loadOwnedRestaurant(restaurantId, auth.clerkId);
      const body = faqSearchSchema.parse(await c.req.json());
      const articles = await findFaqMatches(body.query, { limit: 5 });
      return c.json({ articles });
    } catch (error) {
      return errorResponse(c, error);
    }
  })
  .get("/:restaurantId/tickets", requireAuth, async (c) => {
    try {
      const auth = c.get("auth");
      const restaurantId = c.req.param("restaurantId");
      limitSupportUser(auth, "list-tickets", 120, 10 * MINUTE);
      await loadOwnedRestaurant(restaurantId, auth.clerkId);
      const { status } = listTicketsQuerySchema.parse(c.req.query());
      const tickets = await prisma.supportTicket.findMany({
        where: {
          restaurantId,
          ...(status ? { status } : {}),
        },
        include: supportTicketListInclude,
        orderBy: [{ priorityScore: "desc" }, { updatedAt: "desc" }],
        take: 50,
      });
      return c.json({ tickets: tickets.map((ticket) => serializeSupportTicket(ticket, { ownerView: true })) });
    } catch (error) {
      return errorResponse(c, error);
    }
  })
  .post("/:restaurantId/tickets", requireAuth, async (c) => {
    try {
      const auth = c.get("auth");
      const restaurantId = c.req.param("restaurantId");
      limitSupportUser(auth, "create-ticket", 5, HOUR);
      limitSupportRestaurant(restaurantId, "create-ticket", 20, DAY);
      const data = createTicketSchema.parse(await c.req.json());
      const [restaurant, owner] = await Promise.all([
        loadOwnedRestaurant(restaurantId, auth.clerkId),
        getCurrentUser(auth),
      ]);
      const entitlements = getRestaurantEntitlements(restaurant);
      const plan = entitlements.plan;
      const triage = await triageSupportTicket({
        title: data.title,
        description: data.description,
        restaurantName: restaurant.name,
        plan,
      });
      const { score, priority } = calculateSupportPriority({
        severity: triage.severity,
        plan,
      });

      const ticket = await prisma.$transaction(async (tx) => {
        const created = await tx.supportTicket.create({
          data: {
            restaurantId,
            ownerUserId: owner.id,
            title: data.title,
            description: data.description,
            source: data.source,
            planSnapshot: plan,
            aiSeverity: triage.severity,
            priority,
            priorityScore: score,
            category: triage.category,
            aiSummary: triage.summary,
            suggestedResponse: triage.suggestedNextResponse,
            aiConfidence: triage.confidence,
            escalationFlags: triage.escalationFlags,
            triageStatus: triage.status,
            triageMetadata: triage.metadata as Prisma.InputJsonValue,
          },
        });
        await tx.supportTicketMessage.create({
          data: {
            ticketId: created.id,
            restaurantId,
            authorType: "owner",
            authorUserId: owner.id,
            body: data.description,
          },
        });
        await tx.supportTicketEvent.create({
          data: {
            ticketId: created.id,
            restaurantId,
            actorUserId: owner.id,
            eventType: "ticket_created",
            next: {
              status: created.status,
              priority,
              priorityScore: score,
              aiSeverity: triage.severity,
            },
            note: triage.summary,
          },
        });
        await mirrorSupportUpdateToOwnerChat({
          restaurantId,
          ticketId: created.id,
          content: `Created: ${created.title}. Priority ${priority}, severity ${triage.severity}. ${triage.summary ?? ""}`.trim(),
          tx,
        });
        return tx.supportTicket.findUniqueOrThrow({
          where: { id: created.id },
          include: supportTicketInclude,
        });
      });

      return c.json({ ticket: serializeSupportTicket(ticket, { ownerView: true }) }, 201);
    } catch (error) {
      return errorResponse(c, error);
    }
  })
  .get("/:restaurantId/tickets/:ticketId", requireAuth, async (c) => {
    try {
      const auth = c.get("auth");
      limitSupportUser(auth, "ticket-detail", 120, 10 * MINUTE);
      const ticket = await loadOwnedTicket(
        c.req.param("ticketId"),
        c.req.param("restaurantId"),
        auth.clerkId
      );
      return c.json({ ticket: serializeSupportTicket(ticket, { ownerView: true }) });
    } catch (error) {
      return errorResponse(c, error);
    }
  })
  .post("/:restaurantId/tickets/:ticketId/messages", requireAuth, async (c) => {
    try {
      const auth = c.get("auth");
      const restaurantId = c.req.param("restaurantId");
      const ticketId = c.req.param("ticketId");
      limitSupportUser(auth, "ticket-message", 60, 10 * MINUTE);
      limitSupportRestaurant(restaurantId, "ticket-message", 180, 10 * MINUTE);
      const data = addMessageSchema.parse(await c.req.json());
      const [ticket, owner] = await Promise.all([
        loadOwnedTicket(ticketId, restaurantId, auth.clerkId),
        getCurrentUser(auth),
      ]);

      if (isTicketClosed(ticket.status)) {
        throw new ApiError("Reopen the ticket before adding a reply.", 400);
      }

      const updated = await prisma.$transaction(async (tx) => {
        await tx.supportTicketMessage.create({
          data: {
            ticketId,
            restaurantId,
            authorType: "owner",
            authorUserId: owner.id,
            body: data.body,
          },
        });
        await tx.supportTicketEvent.create({
          data: {
            ticketId,
            restaurantId,
            actorUserId: owner.id,
            eventType: "owner_replied",
            note: data.body.slice(0, 500),
          },
        });
        await mirrorSupportUpdateToOwnerChat({
          restaurantId,
          ticketId,
          content: `Customer replied: ${data.body.slice(0, 600)}`,
          tx,
        });
        return tx.supportTicket.update({
          where: { id: ticketId },
          data: {
            status: ticket.status === "waiting_on_customer" ? "in_progress" : ticket.status,
          },
          include: supportTicketInclude,
        });
      });

      return c.json({ ticket: serializeSupportTicket(updated, { ownerView: true }) });
    } catch (error) {
      return errorResponse(c, error);
    }
  })
  .patch("/:restaurantId/tickets/:ticketId/close", requireAuth, async (c) => {
    try {
      const auth = c.get("auth");
      const restaurantId = c.req.param("restaurantId");
      const ticketId = c.req.param("ticketId");
      limitSupportUser(auth, "ticket-close", 20, HOUR);
      const data = closeTicketSchema.parse(await c.req.json().catch(() => ({})));
      const [ticket, owner] = await Promise.all([
        loadOwnedTicket(ticketId, restaurantId, auth.clerkId),
        getCurrentUser(auth),
      ]);

      const updated = await prisma.$transaction(async (tx) => {
        await tx.supportTicketEvent.create({
          data: {
            ticketId,
            restaurantId,
            actorUserId: owner.id,
            eventType: "ticket_closed_by_owner",
            previous: { status: ticket.status },
            next: { status: "closed" },
            note: data.resolutionSummary ?? null,
          },
        });
        await mirrorSupportUpdateToOwnerChat({
          restaurantId,
          ticketId,
          content: `Closed: ${ticket.title}.${data.resolutionSummary ? ` ${data.resolutionSummary}` : ""}`,
          tx,
        });
        return tx.supportTicket.update({
          where: { id: ticketId },
          data: {
            status: "closed",
            resolutionSummary: data.resolutionSummary ?? ticket.resolutionSummary,
            closedAt: new Date(),
          },
          include: supportTicketInclude,
        });
      });

      return c.json({ ticket: serializeSupportTicket(updated, { ownerView: true }) });
    } catch (error) {
      return errorResponse(c, error);
    }
  })
  .patch("/:restaurantId/tickets/:ticketId/reopen", requireAuth, async (c) => {
    try {
      const auth = c.get("auth");
      const restaurantId = c.req.param("restaurantId");
      const ticketId = c.req.param("ticketId");
      limitSupportUser(auth, "ticket-reopen", 20, HOUR);
      const [ticket, owner] = await Promise.all([
        loadOwnedTicket(ticketId, restaurantId, auth.clerkId),
        getCurrentUser(auth),
      ]);
      const severity = effectiveSeverity(ticket) as SupportTicketSeverity;
      const { score, priority } = calculateSupportPriority({
        severity,
        plan: ticket.planSnapshot,
        createdAt: ticket.createdAt,
      });

      const updated = await prisma.$transaction(async (tx) => {
        await tx.supportTicketEvent.create({
          data: {
            ticketId,
            restaurantId,
            actorUserId: owner.id,
            eventType: "ticket_reopened",
            previous: { status: ticket.status },
            next: { status: "open", priority, priorityScore: score },
          },
        });
        await mirrorSupportUpdateToOwnerChat({
          restaurantId,
          ticketId,
          content: `Reopened: ${ticket.title}.`,
          tx,
        });
        return tx.supportTicket.update({
          where: { id: ticketId },
          data: {
            status: "open",
            priority,
            priorityScore: score,
            resolvedAt: null,
            closedAt: null,
          },
          include: supportTicketInclude,
        });
      });

      return c.json({ ticket: serializeSupportTicket(updated, { ownerView: true }) });
    } catch (error) {
      return errorResponse(c, error);
    }
  });
