import { z } from "zod";
import { prisma } from "@/lib/db";
import { auditLog } from "@/lib/audit";
import { jsonError, jsonOk, parseJson } from "@/lib/api-helpers";
import { requireTenantContextApi } from "@/lib/tenant-auth";
import { DEFAULT_COMPLIANCE_CHECKS, isAgencyPlan } from "@/lib/client-compliance";

const CreateClientSchema = z.object({
  tenant: z.string().min(1),
  name: z.string().trim().min(1).max(120),
});

export async function POST(req: Request) {
  const parsed = await parseJson(req, CreateClientSchema);
  if (parsed.ok === false) {
    return parsed.res;
  }

  const { tenant, name } = parsed.data;
  const auth = await requireTenantContextApi(tenant);
  if (auth.ok === false) {
    return auth.res;
  }

  if (!isAgencyPlan(auth.ctx.features.plan)) {
    return jsonError("agency_only", 403);
  }

  const existing = await prisma.client.findFirst({
    where: {
      tenantId: auth.ctx.tenantId,
      name,
    },
    select: { id: true },
  });
  if (existing) {
    return jsonError("client_exists", 409);
  }

  const client = await prisma.client.create({
    data: {
      tenantId: auth.ctx.tenantId,
      name,
      checks: {
        create: DEFAULT_COMPLIANCE_CHECKS.map((title) => ({
          title,
        })),
      },
    },
    select: { id: true },
  });

  await auditLog({
    tenantId: auth.ctx.tenantId,
    actorUserId: auth.ctx.user.id,
    action: "client.create",
    targetType: "client",
    targetId: client.id,
    meta: { name },
  });

  return jsonOk({ id: client.id });
}
