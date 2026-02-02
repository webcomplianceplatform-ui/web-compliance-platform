-- CreateTable
CREATE TABLE IF NOT EXISTS "AccessEvent" (
  "id" TEXT NOT NULL,
  "userId" TEXT,
  "tenantId" TEXT,
  "kind" TEXT NOT NULL,
  "ip" TEXT,
  "userAgent" TEXT,
  "metaJson" JSONB,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "AccessEvent_pkey" PRIMARY KEY ("id")
);

-- AddForeignKey (userId)
DO $$
BEGIN
  ALTER TABLE "AccessEvent"
  ADD CONSTRAINT "AccessEvent_userId_fkey"
  FOREIGN KEY ("userId") REFERENCES "User"("id")
  ON DELETE SET NULL ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN
  NULL;
END $$;

-- AddForeignKey (tenantId)
DO $$
BEGIN
  ALTER TABLE "AccessEvent"
  ADD CONSTRAINT "AccessEvent_tenantId_fkey"
  FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id")
  ON DELETE SET NULL ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN
  NULL;
END $$;

-- Indexes
CREATE INDEX IF NOT EXISTS "AccessEvent_createdAt_idx" ON "AccessEvent"("createdAt");
CREATE INDEX IF NOT EXISTS "AccessEvent_userId_createdAt_idx" ON "AccessEvent"("userId", "createdAt");
CREATE INDEX IF NOT EXISTS "AccessEvent_tenantId_createdAt_idx" ON "AccessEvent"("tenantId", "createdAt");
CREATE INDEX IF NOT EXISTS "AccessEvent_kind_createdAt_idx" ON "AccessEvent"("kind", "createdAt");
