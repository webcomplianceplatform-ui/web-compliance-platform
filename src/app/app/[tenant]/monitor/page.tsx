import { prisma } from "@/lib/db";
import { requireTenantContextPage } from "@/lib/tenant-auth";
import MonitorClient from "./monitor-client";
import ModuleLocked from "@/components/app/ModuleLocked";

export default async function MonitorPage({
  params,
}: {
  params: Promise<{ tenant: string }>;
}) {
  const { tenant } = await params;

  const ctx = await requireTenantContextPage(tenant);

  if (!ctx.features.monitoring) {
    return <ModuleLocked tenant={tenant} module="monitoring" />;
  }

  const t = await prisma.tenant.findUnique({ where: { id: ctx.tenantId }, select: { id: true, slug: true, name: true } });
  if (!t) return <div>Tenant not found</div>;

  const [checks, events] = await Promise.all([
    prisma.monitorCheck.findMany({
      where: { tenantId: t.id },
      orderBy: { createdAt: "desc" },
      take: 50,
      select: {
        id: true,
        type: true,
        targetUrl: true,
        intervalM: true,
        enabled: true,
        lastStatus: true,
        lastRunAt: true,
        createdAt: true,
      },
    }),
    prisma.monitorEvent.findMany({
      where: { tenantId: t.id },
      orderBy: { createdAt: "desc" },
      take: 30,
      select: {
        id: true,
        status: true,
        severity: true,
        message: true,
        metaJson: true,
        createdAt: true,
        checkId: true,
      },
    }),
  ]);

  return (
    <main className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold">Monitoring</h1>
        <p className="text-sm text-muted-foreground">
          Tenant: <span className="font-mono">{tenant}</span>
        </p>
      </div>

      <MonitorClient tenant={tenant} role={ctx.role} initialChecks={checks} initialEvents={events} />
    </main>
  );
}
