import { describe, it } from "node:test";
import assert from "node:assert/strict";
import {
  calculateBusinessDayAge,
  calculateSupportPriority,
  serializeSupportTicket,
} from "@/services/support";

describe("support priority scoring", () => {
  it("combines severity and plan boost", () => {
    assert.deepEqual(
      calculateSupportPriority({ severity: "sev1", plan: "portfolio" }),
      { score: 130, priority: "urgent" }
    );
    assert.deepEqual(
      calculateSupportPriority({ severity: "sev2", plan: "pro" }),
      { score: 90, priority: "high" }
    );
    assert.deepEqual(
      calculateSupportPriority({ severity: "sev4", plan: null }),
      { score: 10, priority: "low" }
    );
  });

  it("adds capped business-day age boost", () => {
    const createdAt = new Date("2026-05-01T10:00:00Z");
    const now = new Date("2026-05-14T10:00:00Z");
    assert.equal(calculateBusinessDayAge(createdAt, now), 9);
    assert.deepEqual(
      calculateSupportPriority({ severity: "sev3", plan: "starter", createdAt, now }),
      { score: 70, priority: "normal" }
    );
  });
});

describe("support ticket serialization", () => {
  it("whitelists owner-view ticket data", () => {
    const now = new Date("2026-05-14T10:00:00Z");
    const serialized = serializeSupportTicket(
      {
        id: "ticket_1",
        restaurantId: "restaurant_1",
        ownerUserId: "user_owner",
        assignedAdminUserId: "user_admin",
        title: "Menu publishing failed",
        description: "The menu publish button fails.",
        status: "open",
        source: "dashboard",
        planSnapshot: "pro",
        aiSeverity: "sev2",
        adminOverrideSeverity: null,
        priority: "high",
        priorityScore: 90,
        category: "dashboard",
        aiSummary: "Publishing is blocked.",
        suggestedResponse: "Internal draft response",
        aiConfidence: 0.9,
        escalationFlags: ["outage"],
        triageStatus: "succeeded",
        triageMetadata: null,
        resolutionSummary: null,
        firstResponseAt: null,
        resolvedAt: null,
        closedAt: null,
        createdAt: now,
        updatedAt: now,
        restaurant: {
          id: "restaurant_1",
          name: "Demo Cafe",
          slug: "demo-cafe",
          subscriptionStatus: "active",
          subscription: { stripeCustomerId: "cus_secret" },
          operatorAccount: { stripeSubscriptionId: "sub_secret" },
        },
        owner: {
          id: "user_owner",
          email: "owner@example.com",
          fullName: "Owner",
          clerkId: "clerk_secret",
        },
        assignedAdmin: { id: "user_admin", email: "admin@example.com", fullName: "Admin" },
        messages: [
          {
            id: "message_owner",
            ticketId: "ticket_1",
            restaurantId: "restaurant_1",
            authorType: "owner",
            authorUserId: "user_owner",
            body: "The menu publish button fails.",
            isInternal: false,
            createdAt: now,
            authorUser: { id: "user_owner", email: "owner@example.com", fullName: "Owner", role: "owner" },
            attachments: [],
          },
          {
            id: "message_internal",
            ticketId: "ticket_1",
            restaurantId: "restaurant_1",
            authorType: "admin",
            authorUserId: "user_admin",
            body: "Internal note",
            isInternal: true,
            createdAt: now,
            authorUser: { id: "user_admin", email: "admin@example.com", fullName: "Admin", role: "admin" },
            attachments: [],
          },
        ],
        events: [
          {
            id: "event_visible",
            ticketId: "ticket_1",
            restaurantId: "restaurant_1",
            actorUserId: "user_admin",
            eventType: "admin_replied",
            previous: { status: "open" },
            next: { status: "waiting_on_customer" },
            note: "Visible update",
            visibleToOwner: true,
            createdAt: now,
            actorUser: { id: "user_admin", email: "admin@example.com", fullName: "Admin", role: "admin" },
          },
          {
            id: "event_internal",
            ticketId: "ticket_1",
            restaurantId: "restaurant_1",
            actorUserId: "user_admin",
            eventType: "ticket_assigned",
            previous: null,
            next: { assignedAdminUserId: "user_admin" },
            note: null,
            visibleToOwner: false,
            createdAt: now,
            actorUser: { id: "user_admin", email: "admin@example.com", fullName: "Admin", role: "admin" },
          },
        ],
        attachments: [],
      } as any,
      { ownerView: true }
    );

    assert.deepEqual(serialized.restaurant, {
      id: "restaurant_1",
      name: "Demo Cafe",
      slug: "demo-cafe",
    });
    assert.equal(serialized.owner, null);
    assert.equal(serialized.assignedAdmin, null);
    assert.equal(serialized.suggestedResponse, null);
    assert.equal(serialized.aiConfidence, null);
    assert.deepEqual(serialized.escalationFlags, []);
    assert.equal(serialized.messages.length, 1);
    assert.equal(serialized.messages[0]?.authorUserId, null);
    assert.equal(serialized.messages[0]?.authorUser, null);
    assert.equal(serialized.events.length, 1);
    assert.equal(serialized.events[0]?.actorUserId, null);
    assert.equal(serialized.events[0]?.actorUser, null);
    assert.equal(serialized.events[0]?.previous, null);
    assert.equal("subscription" in serialized.restaurant, false);
    assert.equal("operatorAccount" in serialized.restaurant, false);
  });
});
