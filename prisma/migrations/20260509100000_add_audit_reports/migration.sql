-- CreateTable
CREATE TABLE "audit_reports" (
    "id" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "inputs_hash" TEXT NOT NULL,
    "status" "SeoStatus" NOT NULL DEFAULT 'queued',
    "restaurant_name" TEXT NOT NULL,
    "location" TEXT NOT NULL,
    "primary_cuisine" TEXT,
    "scorecard" JSONB,
    "raw_data" JSONB,
    "recommendations" JSONB,
    "photo_scores" JSONB,
    "peer_benchmark" JSONB,
    "executive_summary" TEXT,
    "error_message" TEXT,
    "cost_usd" DECIMAL(10,4),
    "progress" JSONB,
    "completed_at" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "audit_reports_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "audit_leads" (
    "id" TEXT NOT NULL,
    "phone" TEXT NOT NULL,
    "email" TEXT,
    "restaurant_name" TEXT NOT NULL,
    "location" TEXT NOT NULL,
    "ip_hash" TEXT NOT NULL,
    "user_agent" TEXT,
    "source" TEXT,
    "report_id" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "audit_leads_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "audit_reports_slug_key" ON "audit_reports"("slug");

-- CreateIndex
CREATE INDEX "audit_reports_inputs_hash_status_idx" ON "audit_reports"("inputs_hash", "status");

-- CreateIndex
CREATE INDEX "audit_reports_created_at_idx" ON "audit_reports"("created_at");

-- CreateIndex
CREATE INDEX "audit_leads_phone_idx" ON "audit_leads"("phone");

-- CreateIndex
CREATE INDEX "audit_leads_created_at_idx" ON "audit_leads"("created_at");

-- AddForeignKey
ALTER TABLE "audit_leads" ADD CONSTRAINT "audit_leads_report_id_fkey" FOREIGN KEY ("report_id") REFERENCES "audit_reports"("id") ON DELETE SET NULL ON UPDATE CASCADE;
