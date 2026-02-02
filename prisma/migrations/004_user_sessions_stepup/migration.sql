-- Add risk/step-up fields to UserSession
ALTER TABLE "UserSession"
  ADD COLUMN IF NOT EXISTS "ipHash" TEXT,
  ADD COLUMN IF NOT EXISTS "deviceHash" TEXT,
  ADD COLUMN IF NOT EXISTS "requiresStepUp" BOOLEAN NOT NULL DEFAULT false;

CREATE INDEX IF NOT EXISTS "UserSession_requiresStepUp_idx" ON "UserSession"("requiresStepUp");
