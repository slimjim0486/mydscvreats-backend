-- WhatsApp Ordering v1 — turn OrderIntent into a real state machine.
-- Adds payment columns (Telr + COD), order tracking fields, audit event log,
-- and feature-flag column on Restaurant. The legacy enum values
-- (sent_to_whatsapp, opened_whatsapp) are retired; existing rows migrate to
-- `completed` so they don't pollute the new pending/active dashboards or
-- trigger the expiry cron.

-- pgcrypto is required for gen_random_bytes() in the legacy backfill below.
-- Postgres 13+ ships pgcrypto but doesn't enable it by default; this is a
-- no-op if the extension is already present.
CREATE EXTENSION IF NOT EXISTS pgcrypto;

-- ============================================================================
-- 1. New enums: payment provider + status + audit-log actor
-- ============================================================================

CREATE TYPE "PaymentProvider" AS ENUM ('telr', 'stripe', 'cod');
CREATE TYPE "PaymentStatus" AS ENUM ('unpaid', 'pending', 'paid', 'failed', 'refunded');
CREATE TYPE "OrderIntentEventActor" AS ENUM ('customer', 'restaurant', 'system', 'webhook');

-- ============================================================================
-- 2. Replace OrderIntentStatus enum. Postgres can't DROP values from an enum
--    in place, so rename → create new → swap → drop. Existing rows were just
--    click-to-WhatsApp records; treat them all as `completed` so they don't
--    appear in the new pending/active dashboards or get touched by the
--    expiry cron.
-- ============================================================================

ALTER TYPE "OrderIntentStatus" RENAME TO "OrderIntentStatus_old";

CREATE TYPE "OrderIntentStatus" AS ENUM (
  'draft',
  'pending',
  'accepted',
  'preparing',
  'ready',
  'completed',
  'rejected',
  'cancelled',
  'expired'
);

ALTER TABLE "order_intents"
  ALTER COLUMN "status" DROP DEFAULT;

ALTER TABLE "order_intents"
  ALTER COLUMN "status" TYPE "OrderIntentStatus"
  USING ('completed'::"OrderIntentStatus");

ALTER TABLE "order_intents"
  ALTER COLUMN "status" SET DEFAULT 'pending';

DROP TYPE "OrderIntentStatus_old";

-- ============================================================================
-- 3. Add `dine_in` to OrderFulfillmentMethod (existing: delivery, pickup)
-- ============================================================================

ALTER TYPE "OrderFulfillmentMethod" ADD VALUE IF NOT EXISTS 'dine_in';

-- ============================================================================
-- 4. New columns on order_intents — tracking + payment + WA message refs +
--    normalized_phone (H3: persisted E.164 for all WhatsApp sends so we never
--    re-normalize at use time and risk a different result).
-- ============================================================================

ALTER TABLE "order_intents"
  ADD COLUMN "order_number" TEXT,
  ADD COLUMN "normalized_phone" TEXT,
  ADD COLUMN "accepted_at" TIMESTAMP(3),
  ADD COLUMN "ready_at" TIMESTAMP(3),
  ADD COLUMN "completed_at" TIMESTAMP(3),
  ADD COLUMN "rejected_at" TIMESTAMP(3),
  ADD COLUMN "rejection_reason" TEXT,
  ADD COLUMN "estimated_prep_minutes" INTEGER,
  ADD COLUMN "expires_at" TIMESTAMP(3),
  ADD COLUMN "payment_provider" "PaymentProvider",
  ADD COLUMN "payment_status" "PaymentStatus" NOT NULL DEFAULT 'unpaid',
  ADD COLUMN "payment_session_id" TEXT,
  ADD COLUMN "payment_url" TEXT,
  ADD COLUMN "paid_at" TIMESTAMP(3),
  ADD COLUMN "payment_amount_minor" BIGINT,
  ADD COLUMN "restaurant_whatsapp_message_id" TEXT,
  ADD COLUMN "customer_whatsapp_message_id" TEXT,
  ADD COLUMN "url_token" TEXT;

-- H6: Backfill order_number with cryptographically-random bytes. The earlier
-- `SUBSTRING(id, 1, 8)` approach collided for cuids created in the same
-- millisecond (cuid prefix is monotonic time), which would break the unique
-- index creation below on busy production data. `gen_random_bytes(4)`
-- (pgcrypto, always available in Postgres 13+) gives ~32 bits of entropy
-- per row — collisions are functionally impossible across the legacy set.
UPDATE "order_intents"
  SET "order_number" = 'LEG-' || encode(gen_random_bytes(4), 'hex')
  WHERE "order_number" IS NULL;

-- H8: url_token backfill for legacy rows — purely defensive, the rows are
-- already `completed` so nothing should ever resolve them by token. NULL
-- is acceptable for legacy; new rows always populate it at create time.

ALTER TABLE "order_intents"
  ALTER COLUMN "order_number" SET NOT NULL;

CREATE UNIQUE INDEX "order_intents_order_number_key"
  ON "order_intents"("order_number");

-- FKs from order_intents → whatsapp_messages (receipt + restaurant alert).
-- ON DELETE SET NULL: if a WA message gets purged by retention the order
-- row still survives — we only lose the convenience of jumping to it.
ALTER TABLE "order_intents"
  ADD CONSTRAINT "order_intents_restaurant_whatsapp_message_id_fkey"
    FOREIGN KEY ("restaurant_whatsapp_message_id")
    REFERENCES "whatsapp_messages"("id")
    ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "order_intents"
  ADD CONSTRAINT "order_intents_customer_whatsapp_message_id_fkey"
    FOREIGN KEY ("customer_whatsapp_message_id")
    REFERENCES "whatsapp_messages"("id")
    ON DELETE SET NULL ON UPDATE CASCADE;

-- Indexes the new flows depend on:
--   * dashboard Action-Required view: (restaurant, status, created_at)
--   * expiry cron: (status, expires_at) WHERE status='pending'
--   * payment webhook: (restaurant, payment_session_id) — H7 fix: composite
--     so a leaked Telr sessionRef from one restaurant can't be used to
--     resolve another restaurant's OrderIntent.
--   * inbound WA reply → open-order match: (restaurant, normalized_phone, status)
CREATE INDEX "order_intents_restaurant_id_status_created_at_idx"
  ON "order_intents"("restaurant_id", "status", "created_at");

CREATE INDEX "order_intents_status_expires_at_idx"
  ON "order_intents"("status", "expires_at");

CREATE UNIQUE INDEX "order_intents_restaurant_payment_session_id_key"
  ON "order_intents"("restaurant_id", "payment_session_id")
  WHERE "payment_session_id" IS NOT NULL;

CREATE INDEX "order_intents_restaurant_id_normalized_phone_status_idx"
  ON "order_intents"("restaurant_id", "normalized_phone", "status");

-- ============================================================================
-- 5. order_intent_events — append-only audit log of every state transition.
--    This is the source of truth for "what happened to this order, when, why"
--    — load-bearing for support tickets and chargeback disputes.
-- ============================================================================

CREATE TABLE "order_intent_events" (
  "id" TEXT NOT NULL,
  "order_intent_id" TEXT NOT NULL,
  "from_status" "OrderIntentStatus",
  "to_status" "OrderIntentStatus" NOT NULL,
  "actor" "OrderIntentEventActor" NOT NULL,
  "source" TEXT,
  "metadata" JSONB,
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

  CONSTRAINT "order_intent_events_pkey" PRIMARY KEY ("id")
);

ALTER TABLE "order_intent_events"
  ADD CONSTRAINT "order_intent_events_order_intent_id_fkey"
    FOREIGN KEY ("order_intent_id")
    REFERENCES "order_intents"("id")
    ON DELETE CASCADE ON UPDATE CASCADE;

CREATE INDEX "order_intent_events_order_intent_id_created_at_idx"
  ON "order_intent_events"("order_intent_id", "created_at");

-- ============================================================================
-- 6. Feature flag on Restaurant — gates the whole ordering UI/endpoint.
-- ============================================================================

ALTER TABLE "restaurants"
  ADD COLUMN "orders_v1_enabled" BOOLEAN NOT NULL DEFAULT false;

-- ============================================================================
-- 7. C2: operator-phone verification flag on whatsapp_integrations. Until
--    this is non-null, the webhook IGNORES Accept/Reject taps from the
--    restaurant's whatsappNumber — protects against an owner mistyping their
--    number and handing operator authority to a stranger. The dashboard
--    surfaces a "Send CONFIRM from your WhatsApp" prompt; the webhook flips
--    this column when it sees the exact text "CONFIRM" inbound from
--    restaurant.whatsappNumber.
-- ============================================================================

ALTER TABLE "whatsapp_integrations"
  ADD COLUMN "operator_phone_verified_at" TIMESTAMP(3);
