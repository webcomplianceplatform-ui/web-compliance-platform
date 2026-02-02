-- WebCompliance Phase E: MFA hardening (idempotent)
-- Adds recovery codes + last verified timestamp.
-- Apply manually (repo avoids Prisma migrate)

ALTER TABLE public."User"
  ADD COLUMN IF NOT EXISTS "mfaRecoveryCodes" jsonb;

ALTER TABLE public."User"
  ADD COLUMN IF NOT EXISTS "mfaRecoveryCodesGeneratedAt" timestamptz;

ALTER TABLE public."User"
  ADD COLUMN IF NOT EXISTS "mfaLastVerifiedAt" timestamptz;
