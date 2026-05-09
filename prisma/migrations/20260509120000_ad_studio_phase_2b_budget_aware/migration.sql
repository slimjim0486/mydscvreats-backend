-- Phase 2B fix-pass: capture per-variant daily budget so the engine can emit
-- concrete "scale to AED X/day" recommendations instead of generic "+20%".

ALTER TABLE "ad_performance_snapshots"
  ADD COLUMN "daily_budget_aed" DECIMAL(10, 2);
