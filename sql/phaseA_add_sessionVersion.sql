-- Adds User.sessionVersion for server-side session invalidation.
-- Safe to run multiple times.

ALTER TABLE public."User"
  ADD COLUMN IF NOT EXISTS "sessionVersion" integer NOT NULL DEFAULT 0;

-- Backfill in case existing rows were created before default.
UPDATE public."User" SET "sessionVersion" = 0 WHERE "sessionVersion" IS NULL;
