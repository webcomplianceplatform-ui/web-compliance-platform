import { prisma } from "@/lib/db";
import { jsonError, jsonOk, parseJson } from "@/lib/api-helpers";
import { auditLog } from "@/lib/audit";
import { requireTenantContextApi, requireRecentMfaApi } from "@/lib/tenant-auth";
import { z } from "zod";

const BodySchema = z.object({
  userId: z.string().min(1),
});

export async function POST(req: Request, routeCtx: any) {
  const params = await routeCtx.params;
  const tenant = params.tenant as string;

  const ctxRes = await requireTenantContextApi(tenant);
  if (ctxRes.ok === false) return ctxRes.res;

  const { tenantId, user: me, role, isSuperadmin } = ctxRes.ctx;
  if (!isSuperadmin && role !== "OWNER") {
    return jsonError("forbidden", 403);
  }

  const recent = await requireRecentMfaApi({ tenantSlug: tenant, tenantId, userId: me.id, maxAgeMs: 5 * 60 * 1000 });
  if (!recent.ok) return recent.res;

  const parsed = await parseJson(req, BodySchema);
  if (parsed.ok === false) return parsed.res;

  const targetUserId = parsed.data.userId;

  // Ensure target is member of tenant
  const membership = await prisma.userTenant.findUnique({
    where: { userId_tenantId: { userId: targetUserId, tenantId } },
    select: { role: true },
  });
  if (!membership) return jsonError("not_found", 404);

  // In tenant scope, OWNER cannot disable MFA for an OWNER user (reserved for superadmin)
  if (!isSuperadmin && membership.role === "OWNER") {
    return jsonError("cannot_modify_owner", 403);
  }

  await prisma.user.update({
    where: { id: targetUserId },
    data: {
      mfaEnabled: false,
      mfaSecret: null,
      mfaEnabledAt: null,
      mfaRecoveryCodes: null,
      mfaRecoveryCodesGeneratedAt: null,
    },
  });

  await auditLog({
    tenantId,
    actorUserId: me.id,
    action: "mfa.user.removed",
    targetType: "User",
    targetId: targetUserId,
    metaJson: { category: "SECURITY" },
  });

  return jsonOk({});
}
