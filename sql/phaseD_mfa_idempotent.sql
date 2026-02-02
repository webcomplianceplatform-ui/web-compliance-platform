-- WebCompliance Phase D: MFA enforcement (idempotent)
-- Adds tenant-level policy + user TOTP fields.
-- Apply manually (repo avoids Prisma migrate)

-- 1) User MFA fields
ALTER TABLE public."User"
  ADD COLUMN IF NOT EXISTS "mfaEnabled" boolean NOT NULL DEFAULT false;

ALTER TABLE public."User"
  ADD COLUMN IF NOT EXISTS "mfaSecret" text;

ALTER TABLE public."User"
  ADD COLUMN IF NOT EXISTS "mfaEnabledAt" timestamptz;

-- 2) TenantPlan MFA policy
ALTER TABLE public."TenantPlan"
  ADD COLUMN IF NOT EXISTS "mfaRequired" boolean NOT NULL DEFAULT false;

-- Backfill just in case
UPDATE public."TenantPlan" SET "mfaRequired" = COALESCE("mfaRequired", false) WHERE "mfaRequired" IS NULL;
