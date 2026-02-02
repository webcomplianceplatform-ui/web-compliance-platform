import { prisma } from "@/lib/db";
import { requireTenantContextApi } from "@/lib/tenant-auth";
import { parseJson, jsonOk, jsonError } from "@/lib/api-helpers";
import { z } from "zod";
import { rateLimit } from "@/lib/rate-limit";
import { getClientIp } from "@/lib/ip";
import { auditLog } from "@/lib/audit";
import { promises as dns } from "dns";
import { requireModuleApi } from "@/lib/feature-guard";

const VerifySchema = z.object({
  tenant: z.string().min(1),
});

function normalizeDnsName(name: string) {
  return name.toLowerCase().trim().replace(/\.$/, "");
}

async function domainPointsToExpected(domain: string): Promise<boolean> {
  const expected = normalizeDnsName(process.env.DOMAIN_CNAME_TARGET || "");
  if (!expected) return false;

  try {
    const cnames = await dns.resolveCname(domain);
    return cnames.some((c) => normalizeDnsName(c) === expected);
  } catch {
    return false;
  }
}

export async function POST(req: Request) {
  const parsed = await parseJson(req, VerifySchema);
  if (parsed.ok === false) return parsed.res;

  const { tenant } = parsed.data;
  const auth = await requireTenantContextApi(tenant);
  if (auth.ok === false) return auth.res;

  const gate = requireModuleApi(auth.ctx.features, "web");
  if (gate) return gate;

  if (!auth.ctx.isSuperadmin) return jsonError("forbidden", 403);

  const ip = getClientIp(req);
  const rl = rateLimit({
    key: `settings:domain:verify:${auth.ctx.tenantId}:${ip}`,
    limit: 20,
    windowMs: 60_000,
  });
  if (rl.ok === false) return jsonError("rate_limited", 429, { retryAfterSec: rl.retryAfterSec });

  const t = await prisma.tenant.findUnique({
    where: { id: auth.ctx.tenantId },
    select: { customDomain: true },
  });

  const domain = t?.customDomain;
  if (!domain) return jsonError("no_custom_domain", 400);

  const ok = await domainPointsToExpected(domain);
  if (!ok) return jsonError("domain_not_pointing", 400);

  const verifiedAt = new Date();
  await prisma.tenant.update({
    where: { id: auth.ctx.tenantId },
    data: { customDomainVerifiedAt: verifiedAt },
    select: { id: true },
  });

  await auditLog({
    tenantId: auth.ctx.tenantId,
    actorUserId: auth.ctx.user.id,
    action: "tenant.domain.verify",
    targetType: "tenant",
    targetId: auth.ctx.tenantId,
    metaJson: { customDomain: domain },
  });

  return jsonOk({ customDomainVerifiedAt: verifiedAt });
}
