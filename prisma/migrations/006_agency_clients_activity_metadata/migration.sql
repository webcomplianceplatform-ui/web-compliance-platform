-- Add activity tracking for client checklist work
ALTER TABLE "ComplianceCheck"
ADD COLUMN "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP;

-- Preserve evidence filenames for agency uploads
ALTER TABLE "Evidence"
ADD COLUMN "fileName" TEXT;

-- Support command-center style last activity queries
CREATE INDEX "ComplianceCheck_clientId_updatedAt_idx" ON "ComplianceCheck"("clientId", "updatedAt");
