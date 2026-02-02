import { prisma } from "@/lib/db";
import { requireTenantContextApi } from "@/lib/tenant-auth";
import { jsonOk, jsonError } from "@/lib/api-helpers";

export async function GET(req: Request) {
  const url = new URL(req.url);
  const tenant = url.searchParams.get("tenant");
  if (!tenant) return jsonError("missing_tenant", 400);

  const auth = await requireTenantContextApi(tenant);
  if (auth.ok === false) return auth.res;

  const tenantId = auth.ctx.tenantId;

  const [tickets, checks, events, members] = await Promise.all([
    prisma.ticket.count({ where: { tenantId } }),
    prisma.monitorCheck.count({ where: { tenantId } }),
    prisma.monitorEvent.count({ where: { tenantId } }),
    prisma.userTenant.count({ where: { tenantId } }),
  ]);

  const steps = {
    ticket: tickets > 0,
    monitor: checks > 0,
    monitorEvents: events > 0,
    users: members > 1,
  };

  // Heurística: si no has hecho casi nada, muestra onboarding
  const completedCore = [steps.ticket, steps.monitor, steps.users].filter(Boolean).length;
  const shouldShowOnboarding = completedCore < 2;

  return jsonOk({
    steps,
    stats: { tickets, checks, events, members },
    completedCore,
    shouldShowOnboarding,
  });
}
