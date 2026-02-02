-- WebCompliance: schema alignment for Sessions + Trusted Devices + Access Events
-- Goal: make DB columns match Prisma (camelCase, quoted identifiers) and add missing columns.
-- Safe to run multiple times (best-effort). Review in staging first.

DO $$
BEGIN
  -- UserSession: rename legacy lowercase columns to Prisma camelCase
  BEGIN
    ALTER TABLE public."UserSession" RENAME COLUMN userid TO "userId";
  EXCEPTION WHEN undefined_column THEN
    NULL;
  END;

  BEGIN
    ALTER TABLE public."UserSession" RENAME COLUMN createdat TO "createdAt";
  EXCEPTION WHEN undefined_column THEN
    NULL;
  END;

  BEGIN
    ALTER TABLE public."UserSession" RENAME COLUMN lastseenat TO "lastSeenAt";
  EXCEPTION WHEN undefined_column THEN
    NULL;
  END;

  BEGIN
    ALTER TABLE public."UserSession" RENAME COLUMN useragent TO "userAgent";
  EXCEPTION WHEN undefined_column THEN
    NULL;
  END;

  BEGIN
    ALTER TABLE public."UserSession" RENAME COLUMN devicehash TO "deviceHash";
  EXCEPTION WHEN undefined_column THEN
    NULL;
  END;

  BEGIN
    ALTER TABLE public."UserSession" RENAME COLUMN iphash TO "ipHash";
  EXCEPTION WHEN undefined_column THEN
    NULL;
  END;

  BEGIN
    ALTER TABLE public."UserSession" RENAME COLUMN requiresstepup TO "requiresStepUp";
  EXCEPTION WHEN undefined_column THEN
    NULL;
  END;

  BEGIN
    ALTER TABLE public."UserSession" RENAME COLUMN revokedat TO "revokedAt";
  EXCEPTION WHEN undefined_column THEN
    NULL;
  END;

  BEGIN
    ALTER TABLE public."UserSession" RENAME COLUMN revokedbyuserid TO "revokedByUserId";
  EXCEPTION WHEN undefined_column THEN
    NULL;
  END;

  BEGIN
    ALTER TABLE public."UserSession" RENAME COLUMN revokedreason TO "revokedReason";
  EXCEPTION WHEN undefined_column THEN
    NULL;
  END;

  BEGIN
    ALTER TABLE public."UserSession" RENAME COLUMN metajson TO "metaJson";
  EXCEPTION WHEN undefined_column THEN
    NULL;
  END;

  -- Ensure required columns exist
  BEGIN
    ALTER TABLE public."UserSession" ADD COLUMN IF NOT EXISTS "sessionVersionAtIssue" integer NOT NULL DEFAULT 0;
  EXCEPTION WHEN duplicate_column THEN
    NULL;
  END;

  -- TrustedDevice: add approvedAt if missing
  BEGIN
    ALTER TABLE public."TrustedDevice" ADD COLUMN IF NOT EXISTS "approvedAt" timestamptz;
  EXCEPTION WHEN duplicate_column THEN
    NULL;
  END;

  -- AccessEvent: add kind if missing
  BEGIN
    ALTER TABLE public."AccessEvent" ADD COLUMN IF NOT EXISTS kind text NOT NULL DEFAULT 'LOGIN';
  EXCEPTION WHEN duplicate_column THEN
    NULL;
  END;
END $$;
