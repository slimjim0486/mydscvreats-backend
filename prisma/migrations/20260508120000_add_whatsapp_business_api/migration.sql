-- AlterEnum
ALTER TYPE "CampaignStatus" ADD VALUE 'sending';
ALTER TYPE "CampaignStatus" ADD VALUE 'sent';
ALTER TYPE "CampaignStatus" ADD VALUE 'failed';

-- AlterEnum
ALTER TYPE "MessageLogStatus" ADD VALUE 'queued';
ALTER TYPE "MessageLogStatus" ADD VALUE 'sent';
ALTER TYPE "MessageLogStatus" ADD VALUE 'delivered';
ALTER TYPE "MessageLogStatus" ADD VALUE 'read';
ALTER TYPE "MessageLogStatus" ADD VALUE 'failed';

-- CreateEnum
CREATE TYPE "WhatsAppIntegrationStatus" AS ENUM ('pending', 'connected', 'needs_review', 'failed', 'disconnected');

-- CreateEnum
CREATE TYPE "WhatsAppTemplateStatus" AS ENUM ('draft', 'pending', 'approved', 'rejected', 'paused', 'disabled');

-- CreateEnum
CREATE TYPE "WhatsAppMessageDirection" AS ENUM ('inbound', 'outbound');

-- CreateEnum
CREATE TYPE "WhatsAppMessageType" AS ENUM ('text', 'image', 'audio', 'video', 'document', 'button', 'interactive', 'template', 'unknown');

-- CreateEnum
CREATE TYPE "WhatsAppMessageStatus" AS ENUM ('received', 'queued', 'sent', 'delivered', 'read', 'failed');

-- AlterTable
ALTER TABLE "message_logs"
ADD COLUMN "template_name" TEXT,
ADD COLUMN "provider_message_id" TEXT,
ADD COLUMN "error_code" TEXT,
ADD COLUMN "error_message" TEXT,
ADD COLUMN "sent_at" TIMESTAMP(3),
ADD COLUMN "delivered_at" TIMESTAMP(3),
ADD COLUMN "read_at" TIMESTAMP(3),
ADD COLUMN "failed_at" TIMESTAMP(3);

-- CreateTable
CREATE TABLE "whatsapp_integrations" (
    "id" TEXT NOT NULL,
    "restaurant_id" TEXT NOT NULL,
    "status" "WhatsAppIntegrationStatus" NOT NULL DEFAULT 'pending',
    "waba_id" TEXT,
    "business_account_id" TEXT,
    "phone_number_id" TEXT NOT NULL,
    "display_phone_number" TEXT NOT NULL,
    "access_token_cipher" TEXT NOT NULL,
    "token_last_four" TEXT,
    "connected_at" TIMESTAMP(3),
    "last_webhook_at" TIMESTAMP(3),
    "last_template_sync_at" TIMESTAMP(3),
    "last_error" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "whatsapp_integrations_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "whatsapp_templates" (
    "id" TEXT NOT NULL,
    "restaurant_id" TEXT NOT NULL,
    "integration_id" TEXT,
    "name" TEXT NOT NULL,
    "label" TEXT NOT NULL,
    "category" TEXT NOT NULL,
    "language" TEXT NOT NULL DEFAULT 'en',
    "status" "WhatsAppTemplateStatus" NOT NULL DEFAULT 'draft',
    "body" TEXT NOT NULL,
    "variables" JSONB,
    "meta_template_id" TEXT,
    "rejection_reason" TEXT,
    "last_synced_at" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "whatsapp_templates_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "whatsapp_conversations" (
    "id" TEXT NOT NULL,
    "restaurant_id" TEXT NOT NULL,
    "integration_id" TEXT,
    "customer_id" TEXT,
    "customer_phone" TEXT NOT NULL,
    "customer_name" TEXT,
    "last_message_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "unread_count" INTEGER NOT NULL DEFAULT 0,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "whatsapp_conversations_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "whatsapp_messages" (
    "id" TEXT NOT NULL,
    "restaurant_id" TEXT NOT NULL,
    "integration_id" TEXT,
    "conversation_id" TEXT,
    "customer_id" TEXT,
    "message_log_id" TEXT,
    "provider_message_id" TEXT,
    "direction" "WhatsAppMessageDirection" NOT NULL,
    "type" "WhatsAppMessageType" NOT NULL DEFAULT 'text',
    "status" "WhatsAppMessageStatus" NOT NULL DEFAULT 'received',
    "from_phone" TEXT,
    "to_phone" TEXT,
    "body" TEXT,
    "raw_payload" JSONB,
    "sent_at" TIMESTAMP(3),
    "delivered_at" TIMESTAMP(3),
    "read_at" TIMESTAMP(3),
    "failed_at" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "whatsapp_messages_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "whatsapp_message_status_events" (
    "id" TEXT NOT NULL,
    "restaurant_id" TEXT NOT NULL,
    "integration_id" TEXT,
    "message_id" TEXT,
    "provider_message_id" TEXT NOT NULL,
    "status" "WhatsAppMessageStatus" NOT NULL,
    "recipient_phone" TEXT,
    "error_code" TEXT,
    "error_message" TEXT,
    "raw_payload" JSONB,
    "occurred_at" TIMESTAMP(3) NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "whatsapp_message_status_events_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "message_logs_provider_message_id_key" ON "message_logs"("provider_message_id");

-- CreateIndex
CREATE UNIQUE INDEX "whatsapp_integrations_restaurant_id_key" ON "whatsapp_integrations"("restaurant_id");

-- CreateIndex
CREATE UNIQUE INDEX "whatsapp_integrations_phone_number_id_key" ON "whatsapp_integrations"("phone_number_id");

-- CreateIndex
CREATE INDEX "whatsapp_integrations_restaurant_id_status_idx" ON "whatsapp_integrations"("restaurant_id", "status");

-- CreateIndex
CREATE INDEX "whatsapp_integrations_phone_number_id_idx" ON "whatsapp_integrations"("phone_number_id");

-- CreateIndex
CREATE UNIQUE INDEX "whatsapp_templates_restaurant_id_name_language_key" ON "whatsapp_templates"("restaurant_id", "name", "language");

-- CreateIndex
CREATE INDEX "whatsapp_templates_restaurant_id_status_idx" ON "whatsapp_templates"("restaurant_id", "status");

-- CreateIndex
CREATE INDEX "whatsapp_templates_integration_id_idx" ON "whatsapp_templates"("integration_id");

-- CreateIndex
CREATE UNIQUE INDEX "whatsapp_conversations_restaurant_id_customer_phone_key" ON "whatsapp_conversations"("restaurant_id", "customer_phone");

-- CreateIndex
CREATE INDEX "whatsapp_conversations_restaurant_id_last_message_at_idx" ON "whatsapp_conversations"("restaurant_id", "last_message_at");

-- CreateIndex
CREATE INDEX "whatsapp_conversations_customer_id_last_message_at_idx" ON "whatsapp_conversations"("customer_id", "last_message_at");

-- CreateIndex
CREATE INDEX "whatsapp_conversations_integration_id_idx" ON "whatsapp_conversations"("integration_id");

-- CreateIndex
CREATE UNIQUE INDEX "whatsapp_messages_message_log_id_key" ON "whatsapp_messages"("message_log_id");

-- CreateIndex
CREATE UNIQUE INDEX "whatsapp_messages_provider_message_id_key" ON "whatsapp_messages"("provider_message_id");

-- CreateIndex
CREATE INDEX "whatsapp_messages_restaurant_id_created_at_idx" ON "whatsapp_messages"("restaurant_id", "created_at");

-- CreateIndex
CREATE INDEX "whatsapp_messages_conversation_id_created_at_idx" ON "whatsapp_messages"("conversation_id", "created_at");

-- CreateIndex
CREATE INDEX "whatsapp_messages_customer_id_created_at_idx" ON "whatsapp_messages"("customer_id", "created_at");

-- CreateIndex
CREATE INDEX "whatsapp_messages_integration_id_idx" ON "whatsapp_messages"("integration_id");

-- CreateIndex
CREATE INDEX "whatsapp_message_status_events_restaurant_id_occurred_at_idx" ON "whatsapp_message_status_events"("restaurant_id", "occurred_at");

-- CreateIndex
CREATE INDEX "whatsapp_message_status_events_provider_message_id_occurred_at_idx" ON "whatsapp_message_status_events"("provider_message_id", "occurred_at");

-- CreateIndex
CREATE INDEX "whatsapp_message_status_events_message_id_idx" ON "whatsapp_message_status_events"("message_id");

-- CreateIndex
CREATE INDEX "whatsapp_message_status_events_integration_id_idx" ON "whatsapp_message_status_events"("integration_id");

-- AddForeignKey
ALTER TABLE "whatsapp_integrations" ADD CONSTRAINT "whatsapp_integrations_restaurant_id_fkey" FOREIGN KEY ("restaurant_id") REFERENCES "restaurants"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "whatsapp_templates" ADD CONSTRAINT "whatsapp_templates_restaurant_id_fkey" FOREIGN KEY ("restaurant_id") REFERENCES "restaurants"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "whatsapp_templates" ADD CONSTRAINT "whatsapp_templates_integration_id_fkey" FOREIGN KEY ("integration_id") REFERENCES "whatsapp_integrations"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "whatsapp_conversations" ADD CONSTRAINT "whatsapp_conversations_restaurant_id_fkey" FOREIGN KEY ("restaurant_id") REFERENCES "restaurants"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "whatsapp_conversations" ADD CONSTRAINT "whatsapp_conversations_integration_id_fkey" FOREIGN KEY ("integration_id") REFERENCES "whatsapp_integrations"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "whatsapp_conversations" ADD CONSTRAINT "whatsapp_conversations_customer_id_fkey" FOREIGN KEY ("customer_id") REFERENCES "customers"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "whatsapp_messages" ADD CONSTRAINT "whatsapp_messages_restaurant_id_fkey" FOREIGN KEY ("restaurant_id") REFERENCES "restaurants"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "whatsapp_messages" ADD CONSTRAINT "whatsapp_messages_integration_id_fkey" FOREIGN KEY ("integration_id") REFERENCES "whatsapp_integrations"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "whatsapp_messages" ADD CONSTRAINT "whatsapp_messages_conversation_id_fkey" FOREIGN KEY ("conversation_id") REFERENCES "whatsapp_conversations"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "whatsapp_messages" ADD CONSTRAINT "whatsapp_messages_customer_id_fkey" FOREIGN KEY ("customer_id") REFERENCES "customers"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "whatsapp_messages" ADD CONSTRAINT "whatsapp_messages_message_log_id_fkey" FOREIGN KEY ("message_log_id") REFERENCES "message_logs"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "whatsapp_message_status_events" ADD CONSTRAINT "whatsapp_message_status_events_restaurant_id_fkey" FOREIGN KEY ("restaurant_id") REFERENCES "restaurants"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "whatsapp_message_status_events" ADD CONSTRAINT "whatsapp_message_status_events_integration_id_fkey" FOREIGN KEY ("integration_id") REFERENCES "whatsapp_integrations"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "whatsapp_message_status_events" ADD CONSTRAINT "whatsapp_message_status_events_message_id_fkey" FOREIGN KEY ("message_id") REFERENCES "whatsapp_messages"("id") ON DELETE SET NULL ON UPDATE CASCADE;
