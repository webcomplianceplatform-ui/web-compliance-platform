import { prisma } from "@/lib/db";
import { requireTenantContextApi } from "@/lib/tenant-auth";
import { z } from "zod";
import { parseJson, jsonOk, jsonError } from "@/lib/api-helpers";
import { rateLimit } from "@/lib/rate-limit";
import { getClientIp } from "@/lib/ip";
import { auditLog } from "@/lib/audit";
import { requireModuleApi } from "@/lib/feature-guard";

const DomainUpdateSchema = z.object({
  tenant: z.string().min(1),
  customDomain: z.string().trim().max(253).nullable(),
});

function normalizeDomain(input: string) {
  let d = input.trim().toLowerCase();
  d = d.replace(/^https?:\/\//, "");
  d = d.split("/")[0] ?? "";
  d = d.replace(/:\d+$/, "");
  if (d.endsWith(".")) d = d.slice(0, -1);
  if (d.startsWith("www.")) d = d.slice(4);
  return d;
}

export async function GET(req: Request) {
  const url = new URL(req.url);
  const tenant = url.searchParams.get("tenant");
  if (!tenant) return jsonError("missing_tenant", 400);

  const auth = await requireTenantContextApi(tenant);
  if (auth.ok === false) return auth.res;

  const gate = requireModuleApi(auth.ctx.features, "web");
  if (gate) return gate;

  // ✅ RL for GET too (multi-tenant key)
  const ip = getClientIp(req);
  const rl = rateLimit({ key: `settings:domain:get:${auth.ctx.tenantId}:${ip}`, limit: 120, windowMs: 60_000 });
  if (rl.ok === false) return jsonError("rate_limited", 429, { retryAfterSec: rl.retryAfterSec });

  const t = await prisma.tenant.findUnique({
    where: { id: auth.ctx.tenantId },
    select: { customDomain: true, customDomainVerifiedAt: true },
  });

  return jsonOk({
    customDomain: t?.customDomain ?? null,
    customDomainVerifiedAt: t?.customDomainVerifiedAt ?? null,
  });
}

export async function POST(req: Request) {
  const parsed = await parseJson(req, DomainUpdateSchema);
  if (parsed.ok === false) return parsed.res;

  const { tenant, customDomain } = parsed.data;

  const auth = await requireTenantContextApi(tenant);
  if (auth.ok === false) return auth.res;

  const gate = requireModuleApi(auth.ctx.features, "web");
  if (gate) return gate;

  // ✅ permission guard (CRÍTICO)
  if (!auth.ctx.isSuperadmin) return jsonError("forbidden", 403);

  const ip = getClientIp(req);
  const rl = rateLimit({ key: `settings:domain:set:${auth.ctx.tenantId}:${ip}`, limit: 30, windowMs: 60_000 });
  if (rl.ok === false) return jsonError("rate_limited", 429, { retryAfterSec: rl.retryAfterSec });

  const normalized = customDomain ? normalizeDomain(customDomain) : null;

  // ✅ minimal domain sanity checks
  if (normalized) {
    if (normalized.includes("*") || normalized.includes("_")) return jsonError("invalid_domain", 400);
    if (!normalized.includes(".")) return jsonError("invalid_domain", 400);
    if (normalized.includes("localhost") || normalized.includes(" ")) return jsonError("invalid_domain", 400);
  }

  try {
    await prisma.tenant.update({
      where: { id: auth.ctx.tenantId },
      data: {
        customDomain: normalized,
        customDomainVerifiedAt: null, // force re-verify after changes
      },
      select: { id: true },
    });
  } catch (e: any) {
    if (String(e?.code) === "P2002") return jsonError("domain_taken", 409);
    throw e;
  }

  await auditLog({
    tenantId: auth.ctx.tenantId,
    actorUserId: auth.ctx.user.id,
    action: "tenant.domain.update",
    targetType: "tenant",
    targetId: auth.ctx.tenantId,
    // ✅ metaJson (no meta)
    metaJson: normalized ? { customDomain: normalized } : { customDomain: null },
  });

  return jsonOk({ customDomain: normalized, customDomainVerifiedAt: null });
}
