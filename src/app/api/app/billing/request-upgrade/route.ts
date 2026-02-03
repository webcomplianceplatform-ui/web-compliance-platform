import { prisma } from "@/lib/db";
import { requireTenantContextApi, canManageSite } from "@/lib/tenant-auth";
import { z } from "zod";
import { parseJson, jsonOk, jsonError } from "@/lib/api-helpers";
import { getClientIp } from "@/lib/ip";
import { rateLimit } from "@/lib/rate-limit";
import { auditLog } from "@/lib/audit";

const RequestUpgradeSchema = z.object({
  tenant: z.string().min(1),
  desiredPlan: z.enum(["BUSINESS", "AGENCY"]),
  domainsCount: z.number().int().min(1).max(500).optional(),
  contactEmail: z.string().email().optional(),
  message: z.string().max(2000).optional(),
});

export async function POST(req: Request) {
  const ip = getClientIp(req);
  const rl = rateLimit({ key: `billing:upgrade:${ip}`, limit: 20, windowMs: 60_000 });
  if (rl.ok === false) {
    return jsonError("rate_limited", 429, { retryAfterSec: rl.retryAfterSec });
  }

  const parsed = await parseJson(req, RequestUpgradeSchema);
  if (parsed.ok === false) return parsed.res;

  const { tenant, desiredPlan, domainsCount, contactEmail, message } = parsed.data;

  const auth = await requireTenantContextApi(tenant);
  if (auth.ok === false) return auth.res;

  if (!canManageSite(auth.ctx.role)) return jsonError("forbidden", 403);

  const title = `Upgrade request → ${desiredPlan === "BUSINESS" ? "Business" : "Agency"}`;
  const lines = [
`TenantId: ${auth.ctx.tenantId}`,
    `Requested plan: ${desiredPlan}`,
    typeof domainsCount === "number" ? `Domains (approx): ${domainsCount}` : null,
    contactEmail ? `Contact: ${contactEmail}` : `Contact: ${auth.ctx.user.email ?? "unknown"}`,
    message ? `Notes: ${message}` : null,
  ].filter(Boolean);

  const ticket = await prisma.ticket.create({
    data: {
      tenantId: auth.ctx.tenantId,
      createdById: auth.ctx.user.id,
      title,
      description: lines.join("\n"),
      type: "LEAD",
      priority: "HIGH",
      status: "OPEN",
    },
    select: { id: true },
  });

  await auditLog({
    tenantId: auth.ctx.tenantId,
    actorUserId: auth.ctx.user.id,
    action: "billing.upgrade.request",
    targetType: "ticket",
    targetId: ticket.id,
    metaJson: { desiredPlan, domainsCount, contactEmail: contactEmail ?? null },
  });

  return jsonOk({ id: ticket.id });
}
