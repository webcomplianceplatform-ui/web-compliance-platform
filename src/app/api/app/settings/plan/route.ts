import { prisma } from "@/lib/db";
import { requireTenantContextApi } from "@/lib/tenant-auth";
import { jsonOk, jsonError } from "@/lib/api-helpers";

export async function GET(req: Request) {
  const url = new URL(req.url);
  const tenant = url.searchParams.get("tenant");
  if (!tenant) return jsonError("missing_tenant", 400);

  const auth = await requireTenantContextApi(tenant);
  if (auth.ok === false) return auth.res;

  const tp = await prisma.tenantPlan.findUnique({
    where: { tenantId: auth.ctx.tenantId },
    select: { plan: true, features: true, mfaRequired: true },
  });

  const plan = (tp?.plan ?? (auth.ctx.features.plan as any) ?? "COMPLIANCE") as string;

  return jsonOk({
    plan,
    mfaRequired: tp?.mfaRequired ?? false,
    features: tp?.features ?? auth.ctx.features,
  });
}
