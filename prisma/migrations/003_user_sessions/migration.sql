-- CreateTable
CREATE TABLE IF NOT EXISTS "UserSession" (
  "id" TEXT NOT NULL,
  "userId" TEXT NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "lastSeenAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "revokedAt" TIMESTAMP(3),
  "revokedByUserId" TEXT,
  "revokedReason" TEXT,
  "ip" TEXT,
  "userAgent" TEXT,
  "sessionVersionAtIssue" INTEGER NOT NULL DEFAULT 0,
  "metaJson" JSONB,
  CONSTRAINT "UserSession_pkey" PRIMARY KEY ("id")
);

-- AddForeignKey (userId)
DO $$
BEGIN
  ALTER TABLE "UserSession"
  ADD CONSTRAINT "UserSession_userId_fkey"
  FOREIGN KEY ("userId") REFERENCES "User"("id")
  ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN
  NULL;
END $$;

-- AddForeignKey (revokedByUserId)
DO $$
BEGIN
  ALTER TABLE "UserSession"
  ADD CONSTRAINT "UserSession_revokedByUserId_fkey"
  FOREIGN KEY ("revokedByUserId") REFERENCES "User"("id")
  ON DELETE SET NULL ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN
  NULL;
END $$;

-- Indexes
CREATE INDEX IF NOT EXISTS "UserSession_userId_lastSeenAt_idx" ON "UserSession"("userId", "lastSeenAt");
CREATE INDEX IF NOT EXISTS "UserSession_revokedAt_idx" ON "UserSession"("revokedAt");
CREATE INDEX IF NOT EXISTS "UserSession_createdAt_idx" ON "UserSession"("createdAt");
