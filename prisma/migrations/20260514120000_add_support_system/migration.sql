CREATE TYPE "SupportTicketStatus" AS ENUM ('open', 'in_progress', 'waiting_on_customer', 'resolved', 'closed');
CREATE TYPE "SupportTicketSeverity" AS ENUM ('sev1', 'sev2', 'sev3', 'sev4');
CREATE TYPE "SupportTicketPriority" AS ENUM ('urgent', 'high', 'normal', 'low');
CREATE TYPE "SupportTicketSource" AS ENUM ('dashboard', 'sous_chef', 'admin');
CREATE TYPE "SupportTicketMessageAuthorType" AS ENUM ('owner', 'admin', 'system');

CREATE TABLE "support_tickets" (
  "id" TEXT NOT NULL,
  "restaurant_id" TEXT NOT NULL,
  "owner_user_id" TEXT NOT NULL,
  "assigned_admin_user_id" TEXT,
  "title" TEXT NOT NULL,
  "description" TEXT NOT NULL,
  "status" "SupportTicketStatus" NOT NULL DEFAULT 'open',
  "source" "SupportTicketSource" NOT NULL DEFAULT 'dashboard',
  "plan_snapshot" "SubscriptionPlan",
  "ai_severity" "SupportTicketSeverity" NOT NULL DEFAULT 'sev3',
  "admin_override_severity" "SupportTicketSeverity",
  "priority" "SupportTicketPriority" NOT NULL DEFAULT 'normal',
  "priority_score" INTEGER NOT NULL DEFAULT 40,
  "category" TEXT,
  "ai_summary" TEXT,
  "suggested_response" TEXT,
  "ai_confidence" DOUBLE PRECISION,
  "escalation_flags" TEXT[] NOT NULL DEFAULT ARRAY[]::TEXT[],
  "triage_status" TEXT NOT NULL DEFAULT 'pending',
  "triage_metadata" JSONB,
  "resolution_summary" TEXT,
  "first_response_at" TIMESTAMP(3),
  "resolved_at" TIMESTAMP(3),
  "closed_at" TIMESTAMP(3),
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "support_tickets_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "support_ticket_messages" (
  "id" TEXT NOT NULL,
  "ticket_id" TEXT NOT NULL,
  "restaurant_id" TEXT NOT NULL,
  "author_type" "SupportTicketMessageAuthorType" NOT NULL,
  "author_user_id" TEXT,
  "body" TEXT NOT NULL,
  "is_internal" BOOLEAN NOT NULL DEFAULT false,
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "support_ticket_messages_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "support_ticket_events" (
  "id" TEXT NOT NULL,
  "ticket_id" TEXT NOT NULL,
  "restaurant_id" TEXT NOT NULL,
  "actor_user_id" TEXT,
  "event_type" TEXT NOT NULL,
  "previous" JSONB,
  "next" JSONB,
  "note" TEXT,
  "visible_to_owner" BOOLEAN NOT NULL DEFAULT true,
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "support_ticket_events_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "support_ticket_attachments" (
  "id" TEXT NOT NULL,
  "ticket_id" TEXT NOT NULL,
  "message_id" TEXT,
  "restaurant_id" TEXT NOT NULL,
  "file_name" TEXT NOT NULL,
  "content_type" TEXT NOT NULL,
  "size_bytes" INTEGER NOT NULL,
  "url" TEXT NOT NULL,
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "support_ticket_attachments_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "support_articles" (
  "id" TEXT NOT NULL,
  "title" TEXT NOT NULL,
  "slug" TEXT NOT NULL,
  "question" TEXT NOT NULL,
  "answer" TEXT NOT NULL,
  "category" TEXT,
  "tags" TEXT[] NOT NULL DEFAULT ARRAY[]::TEXT[],
  "is_published" BOOLEAN NOT NULL DEFAULT false,
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "support_articles_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "support_tickets_restaurant_id_status_priority_idx" ON "support_tickets"("restaurant_id", "status", "priority");
CREATE INDEX "support_tickets_owner_user_id_created_at_idx" ON "support_tickets"("owner_user_id", "created_at");
CREATE INDEX "support_tickets_assigned_admin_user_id_status_idx" ON "support_tickets"("assigned_admin_user_id", "status");
CREATE INDEX "support_tickets_priority_status_created_at_idx" ON "support_tickets"("priority", "status", "created_at");
CREATE INDEX "support_ticket_messages_ticket_id_created_at_idx" ON "support_ticket_messages"("ticket_id", "created_at");
CREATE INDEX "support_ticket_messages_restaurant_id_created_at_idx" ON "support_ticket_messages"("restaurant_id", "created_at");
CREATE INDEX "support_ticket_events_ticket_id_created_at_idx" ON "support_ticket_events"("ticket_id", "created_at");
CREATE INDEX "support_ticket_events_restaurant_id_created_at_idx" ON "support_ticket_events"("restaurant_id", "created_at");
CREATE INDEX "support_ticket_attachments_ticket_id_created_at_idx" ON "support_ticket_attachments"("ticket_id", "created_at");
CREATE INDEX "support_ticket_attachments_message_id_idx" ON "support_ticket_attachments"("message_id");
CREATE UNIQUE INDEX "support_articles_slug_key" ON "support_articles"("slug");
CREATE INDEX "support_articles_is_published_category_idx" ON "support_articles"("is_published", "category");

ALTER TABLE "support_tickets"
  ADD CONSTRAINT "support_tickets_restaurant_id_fkey"
  FOREIGN KEY ("restaurant_id") REFERENCES "restaurants"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "support_tickets"
  ADD CONSTRAINT "support_tickets_owner_user_id_fkey"
  FOREIGN KEY ("owner_user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "support_tickets"
  ADD CONSTRAINT "support_tickets_assigned_admin_user_id_fkey"
  FOREIGN KEY ("assigned_admin_user_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "support_ticket_messages"
  ADD CONSTRAINT "support_ticket_messages_ticket_id_fkey"
  FOREIGN KEY ("ticket_id") REFERENCES "support_tickets"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "support_ticket_messages"
  ADD CONSTRAINT "support_ticket_messages_restaurant_id_fkey"
  FOREIGN KEY ("restaurant_id") REFERENCES "restaurants"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "support_ticket_messages"
  ADD CONSTRAINT "support_ticket_messages_author_user_id_fkey"
  FOREIGN KEY ("author_user_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "support_ticket_events"
  ADD CONSTRAINT "support_ticket_events_ticket_id_fkey"
  FOREIGN KEY ("ticket_id") REFERENCES "support_tickets"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "support_ticket_events"
  ADD CONSTRAINT "support_ticket_events_restaurant_id_fkey"
  FOREIGN KEY ("restaurant_id") REFERENCES "restaurants"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "support_ticket_events"
  ADD CONSTRAINT "support_ticket_events_actor_user_id_fkey"
  FOREIGN KEY ("actor_user_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "support_ticket_attachments"
  ADD CONSTRAINT "support_ticket_attachments_ticket_id_fkey"
  FOREIGN KEY ("ticket_id") REFERENCES "support_tickets"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "support_ticket_attachments"
  ADD CONSTRAINT "support_ticket_attachments_message_id_fkey"
  FOREIGN KEY ("message_id") REFERENCES "support_ticket_messages"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "support_ticket_attachments"
  ADD CONSTRAINT "support_ticket_attachments_restaurant_id_fkey"
  FOREIGN KEY ("restaurant_id") REFERENCES "restaurants"("id") ON DELETE CASCADE ON UPDATE CASCADE;
