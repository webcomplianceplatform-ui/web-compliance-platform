import { prisma } from "@/lib/db";
import { requireTenantContextApi, canManageSettings } from "@/lib/tenant-auth";
import { parseJson, jsonOk, jsonError } from "@/lib/api-helpers";
import { z } from "zod";
import { rateLimit } from "@/lib/rate-limit";
import { getClientIp } from "@/lib/ip";
import { auditLog } from "@/lib/audit";
import { promises as dns } from "dns";

const VerifySchema = z.object({
  tenant: z.string().min(1),
});

async function domainResolves(domain: string): Promise<boolean> {
  try {
    // Try common DNS queries
    const [a4, a6, any, cname] = await Promise.allSettled([
      dns.resolve4(domain),
      dns.resolve6(domain),
      (dns as any).resolveAny ? (dns as any).resolveAny(domain) : dns.resolve4(domain),
      dns.resolveCname(domain),
    ]);

    const ok = [a4, a6, any, cname].some(
      (r) => r.status === "fulfilled" && Array.isArray(r.value) && r.value.length > 0
    );

    // Also allow bare lookup (covers CNAME->A chain)
    if (ok) return true;
    const lookup = await dns.lookup(domain);
    return Boolean(lookup?.address);
  } catch {
    return false;
  }
}

export async function POST(req: Request) {
  const ip = getClientIp(req);
  const rl = rateLimit({ key: `settings:domain:verify:${ip}`, limit: 20, windowMs: 60_000 });
  if (!rl.ok) return jsonError("rate_limited", 429, { retryAfterSec: rl.retryAfterSec });

  const parsed = await parseJson(req, VerifySchema);
  if (!parsed.ok) return parsed.res;

  const { tenant } = parsed.data;
  const auth = await requireTenantContextApi(tenant);
  if (!auth.ok) return auth.res;
  if (!canManageSettings(auth.ctx.role)) return jsonError("forbidden", 403);

  const t = await prisma.tenant.findUnique({
    where: { id: auth.ctx.tenantId },
    select: { customDomain: true },
  });

  const domain = t?.customDomain;
  if (!domain) return jsonError("no_custom_domain", 400);

  const ok = await domainResolves(domain);
  if (!ok) return jsonError("domain_not_resolving", 400);

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
    meta: ({ customDomain: domain } as any),
  });

  return jsonOk({ customDomainVerifiedAt: verifiedAt });
}
