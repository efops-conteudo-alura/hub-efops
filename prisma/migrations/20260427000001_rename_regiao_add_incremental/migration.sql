-- Rename column: regiao → costCenter
ALTER TABLE "LeadtimeTask" RENAME COLUMN "regiao" TO "costCenter";

-- Update index names
DROP INDEX IF EXISTS "LeadtimeTask_regiao_idx";
CREATE INDEX "LeadtimeTask_costCenter_idx" ON "LeadtimeTask"("costCenter");

-- Add clickupUpdatedAt for incremental sync (skip tasks unchanged since last sync)
ALTER TABLE "LeadtimeTask" ADD COLUMN "clickupUpdatedAt" TIMESTAMP(3);
