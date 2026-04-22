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
  AND NOT ("features" ? 'modules')
  AND jsonb_typeof("features"->'features') = 'object'
  AND ("features"->'features') ? 'modules'
  AND ("features" ? 'tier' OR "features" ? 'addons' OR "features" ? 'overrides');

SELECT
  "tenantId",
  plan,
  "createdAt",
  "updatedAt",
  "features"
FROM public."TenantPlan"
WHERE jsonb_typeof("features") = 'object'
  AND "features" ? 'features'
  AND NOT ("features" ? 'modules')
  AND jsonb_typeof("features"->'features') = 'object'
  AND ("features"->'features') ? 'modules'
  AND ("features" ? 'tier' OR "features" ? 'addons' OR "features" ? 'overrides')
ORDER BY "updatedAt" DESC;

-- 2) Repair only the wrapped-shape rows
UPDATE public."TenantPlan"
SET "features" = "features"->'features'
WHERE jsonb_typeof("features") = 'object'
  AND "features" ? 'features'
  AND NOT ("features" ? 'modules')
  AND jsonb_typeof("features"->'features') = 'object'
  AND ("features"->'features') ? 'modules'
  AND ("features" ? 'tier' OR "features" ? 'addons' OR "features" ? 'overrides')
RETURNING "tenantId", plan;

-- 3) Validate after repair
SELECT
  COUNT(*) AS broken_count_after
FROM public."TenantPlan"
WHERE jsonb_typeof("features") = 'object'
  AND "features" ? 'features'
  AND NOT ("features" ? 'modules')
  AND jsonb_typeof("features"->'features') = 'object'
  AND ("features"->'features') ? 'modules'
  AND ("features" ? 'tier' OR "features" ? 'addons' OR "features" ? 'overrides');
