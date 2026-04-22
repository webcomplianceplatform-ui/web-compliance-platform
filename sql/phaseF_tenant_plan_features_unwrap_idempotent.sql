-- WebCompliance: unwrap accidentally wrapped TenantPlan.features payloads
-- created by the old admin provisioning flow.
-- Safe to review in staging first. Idempotent: repaired rows stop matching
-- the predicate and will not be updated again on subsequent runs.

-- 1) Detect candidate rows before repair
SELECT
  COUNT(*) AS broken_count
FROM public."TenantPlan"
WHERE jsonb_typeof("features") = 'object'
  AND "features" ? 'features'
  AND "features" ? 'tier'
  AND "features" ? 'addons'
  AND "features" ? 'overrides'
  AND NOT ("features" ? 'modules')
  AND jsonb_typeof("features"->'tier') = 'string'
  AND jsonb_typeof("features"->'addons') = 'object'
  AND jsonb_typeof("features"->'overrides') = 'object'
  AND jsonb_typeof("features"->'features') = 'object'
  AND ("features"->'features') ? 'modules';

SELECT
  "tenantId",
  plan,
  "createdAt",
  "updatedAt",
  "features"
FROM public."TenantPlan"
WHERE jsonb_typeof("features") = 'object'
  AND "features" ? 'features'
  AND "features" ? 'tier'
  AND "features" ? 'addons'
  AND "features" ? 'overrides'
  AND NOT ("features" ? 'modules')
  AND jsonb_typeof("features"->'tier') = 'string'
  AND jsonb_typeof("features"->'addons') = 'object'
  AND jsonb_typeof("features"->'overrides') = 'object'
  AND jsonb_typeof("features"->'features') = 'object'
  AND ("features"->'features') ? 'modules'
ORDER BY "updatedAt" DESC;

-- 2) Repair only the wrapped-shape rows
UPDATE public."TenantPlan"
SET "features" = "features"->'features'
WHERE jsonb_typeof("features") = 'object'
  AND "features" ? 'features'
  AND "features" ? 'tier'
  AND "features" ? 'addons'
  AND "features" ? 'overrides'
  AND NOT ("features" ? 'modules')
  AND jsonb_typeof("features"->'tier') = 'string'
  AND jsonb_typeof("features"->'addons') = 'object'
  AND jsonb_typeof("features"->'overrides') = 'object'
  AND jsonb_typeof("features"->'features') = 'object'
  AND ("features"->'features') ? 'modules'
RETURNING "tenantId", plan;

-- 3) Validate after repair
SELECT
  COUNT(*) AS broken_count_after
FROM public."TenantPlan"
WHERE jsonb_typeof("features") = 'object'
  AND "features" ? 'features'
  AND "features" ? 'tier'
  AND "features" ? 'addons'
  AND "features" ? 'overrides'
  AND NOT ("features" ? 'modules')
  AND jsonb_typeof("features"->'tier') = 'string'
  AND jsonb_typeof("features"->'addons') = 'object'
  AND jsonb_typeof("features"->'overrides') = 'object'
  AND jsonb_typeof("features"->'features') = 'object'
  AND ("features"->'features') ? 'modules';
