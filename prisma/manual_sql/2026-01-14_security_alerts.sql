-- WebCompliance Platform
-- Manual / idempotent SQL (no prisma migrate)
-- Adds SecurityAlert table used by the Security module (alerts feed)

-- Needed for gen_random_uuid()
CREATE EXTENSION IF NOT EXISTS pgcrypto;

CREATE TABLE IF NOT EXISTS "SecurityAlert" (
  "id" TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
  "tenantId" TEXT NOT NULL,
  "level" TEXT NOT NULL DEFAULT 'INFO',
  "message" TEXT NOT NULL,
  "auditId" TEXT NULL,
  "createdAt" TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- FKs (added in a safe/idempotent way)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'SecurityAlert_tenantId_fkey'
  ) THEN
    ALTER TABLE "SecurityAlert"
      ADD CONSTRAINT "SecurityAlert_tenantId_fkey"
      FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id")
      ON DELETE CASCADE ON UPDATE CASCADE;
  END IF;
END$$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'SecurityAlert_auditId_fkey'
  ) THEN
    ALTER TABLE "SecurityAlert"
      ADD CONSTRAINT "SecurityAlert_auditId_fkey"
      FOREIGN KEY ("auditId") REFERENCES "AuditEvent"("id")
      ON DELETE SET NULL ON UPDATE CASCADE;
  END IF;
END$$;

-- Indexes
CREATE INDEX IF NOT EXISTS "SecurityAlert_tenantId_createdAt_idx"
  ON "SecurityAlert" ("tenantId", "createdAt" DESC);

CREATE INDEX IF NOT EXISTS "SecurityAlert_auditId_idx"
  ON "SecurityAlert" ("auditId");
