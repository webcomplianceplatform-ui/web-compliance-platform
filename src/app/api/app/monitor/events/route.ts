import { prisma } from "@/lib/db";
import { requireTenantContextApi } from "@/lib/tenant-auth";
import { jsonOk, jsonError } from "@/lib/api-helpers";
import { requireModuleApi } from "@/lib/feature-guard";

export async function GET(req: Request) {
  const url = new URL(req.url);
  const tenant = url.searchParams.get("tenant");
  if (!tenant) return jsonError("missing_tenant", 400);

  const auth = await requireTenantContextApi(tenant);
  if (auth.ok === false) return auth.res;

  const gate = requireModuleApi(auth.ctx.features, "monitoring");
  if (gate) return gate;

  const events = await prisma.monitorEvent.findMany({
    where: { tenantId: auth.ctx.tenantId },
    orderBy: { createdAt: "desc" },
    take: 200,
    select: {
      id: true,
      checkId: true,
      status: true,
      severity: true,
      message: true,
      metaJson: true,
      createdAt: true,
    },
  });

  return jsonOk({ events });
}
