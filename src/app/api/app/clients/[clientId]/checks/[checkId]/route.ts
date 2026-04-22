import { ComplianceCheckStatus } from "@prisma/client";
import { z } from "zod";
import { prisma } from "@/lib/db";
import { auditLog } from "@/lib/audit";
import { jsonError, jsonOk, parseJson } from "@/lib/api-helpers";
import { requireTenantContextApi } from "@/lib/tenant-auth";
import { isAgencyPlan } from "@/lib/client-compliance";

const UpdateCheckSchema = z.object({
  tenant: z.string().min(1),
  status: z.nativeEnum(ComplianceCheckStatus),
});

export async function PATCH(req: Request, routeCtx: any) {
  const params = await routeCtx.params;
  const clientId = String(params?.clientId ?? "");
  const checkId = String(params?.checkId ?? "");

  const parsed = await parseJson(req, UpdateCheckSchema);
  if (parsed.ok === false) {
    return parsed.res;
  }

  const { tenant, status } = parsed.data;
  const auth = await requireTenantContextApi(tenant);
  if (auth.ok === false) {
    return auth.res;
  }

  if (!isAgencyPlan(auth.ctx.features.plan)) {
    return jsonError("agency_only", 403);
  }

  const client = await prisma.client.findFirst({
    where: { id: clientId, tenantId: auth.ctx.tenantId },
    select: { id: true },
  });
  if (!client) {
    return jsonError("not_found", 404);
  }

  const check = await prisma.complianceCheck.findFirst({
    where: { id: checkId, clientId },
    select: { id: true },
  });
  if (!check) {
    return jsonError("not_found", 404);
  }

  await prisma.complianceCheck.update({
    where: { id: checkId },
    data: { status },
  });

  await auditLog({
    tenantId: auth.ctx.tenantId,
    actorUserId: auth.ctx.user.id,
    action: "client.check.update",
    targetType: "complianceCheck",
    targetId: checkId,
    meta: { clientId, status },
  });

  return jsonOk();
}
