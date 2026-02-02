-- WebCompliance Phase C: MonitorCheck.metaJson + SecurityAlert.updatedAt (idempotent)
-- Apply manually (repo avoids Prisma migrate)

-- 1) MonitorCheck.metaJson
ALTER TABLE public."MonitorCheck"
  ADD COLUMN IF NOT EXISTS "metaJson" jsonb;

-- 2) SecurityAlert.updatedAt
ALTER TABLE public."SecurityAlert"
  ADD COLUMN IF NOT EXISTS "updatedAt" timestamptz NOT NULL DEFAULT now();

-- Backfill / keep updatedAt consistent
UPDATE public."SecurityAlert" SET "updatedAt" = COALESCE("updatedAt", "createdAt", now())
WHERE "updatedAt" IS NULL;

-- Optional index for filtering by level
CREATE INDEX IF NOT EXISTS "SecurityAlert_tenantId_level_createdAt_idx"
  ON public."SecurityAlert" ("tenantId", level, "createdAt" DESC);
