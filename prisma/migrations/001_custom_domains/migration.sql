-- Add custom domain support for public tenant sites
ALTER TABLE "Tenant"
  ADD COLUMN IF NOT EXISTS "customDomain" TEXT,
  ADD COLUMN IF NOT EXISTS "customDomainVerifiedAt" TIMESTAMP(3);

-- Unique index for customDomain (nullable unique)
CREATE UNIQUE INDEX IF NOT EXISTS "Tenant_customDomain_key" ON "Tenant"("customDomain");

-- Helpful index for lookups
CREATE INDEX IF NOT EXISTS "Tenant_customDomainVerifiedAt_idx" ON "Tenant"("customDomainVerifiedAt");
