-- WebCompliance Phase B: SecurityAlert table + indexes (idempotent)
-- NOTE: This repo avoids Prisma migrate. Apply this SQL manually.

-- 1) Create table if missing
CREATE TABLE IF NOT EXISTS public."SecurityAlert" (
  id TEXT PRIMARY KEY,
  "tenantId" TEXT NOT NULL,
  level TEXT NOT NULL DEFAULT 'INFO',
  message TEXT NOT NULL,
  "auditId" TEXT,
  "createdAt" TIMESTAMPTZ NOT NULL DEFAULT now(),
  "updatedAt" TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 2) If an older table exists with tenantId as uuid, coerce it to TEXT for compatibility with Tenant.id (TEXT).
DO $$
DECLARE
  t TEXT;
BEGIN
  SELECT data_type INTO t
  FROM information_schema.columns
  WHERE table_schema='public' AND table_name='SecurityAlert' AND column_name='tenantId';

  IF t = 'uuid' THEN
    ALTER TABLE public."SecurityAlert"
      ALTER COLUMN "tenantId" TYPE TEXT USING "tenantId"::text;
  END IF;
END$$;

-- 3) Basic indexes
CREATE INDEX IF NOT EXISTS "SecurityAlert_tenantId_createdAt_idx"
  ON public."SecurityAlert" ("tenantId", "createdAt" DESC);

-- 4) Optional: 1 alert per audit event (prevents duplicates)
CREATE UNIQUE INDEX IF NOT EXISTS "SecurityAlert_auditId_key"
  ON public."SecurityAlert" ("auditId")
  WHERE "auditId" IS NOT NULL;

-- 5) Optional FK (only if Tenant.id is TEXT in your DB)
DO $$
BEGIN
  IF EXISTS (
    SELECT 1
    FROM information_schema.columns
    WHERE table_schema='public' AND table_name='Tenant' AND column_name='id'
      AND data_type='text'
  ) THEN
    IF NOT EXISTS (
      SELECT 1
      FROM pg_constraint
      WHERE conname = 'SecurityAlert_tenantId_fkey'
    ) THEN
      ALTER TABLE public."SecurityAlert"
        ADD CONSTRAINT "SecurityAlert_tenantId_fkey"
        FOREIGN KEY ("tenantId") REFERENCES public."Tenant"("id")
        ON DELETE CASCADE;
    END IF;
  END IF;
END$$;
