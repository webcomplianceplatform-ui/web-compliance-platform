import { prisma } from "@/lib/db";
import MonitorClient from "./monitor-client";

export default async function MonitorPage({
  params,
}: {
  params: Promise<{ tenant: string }>;
}) {
  const { tenant } = await params;

  const t = await prisma.tenant.findUnique({
    where: { slug: tenant },
    select: { id: true, slug: true, name: true },
  });

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

      <MonitorClient tenant={tenant} initialChecks={checks} initialEvents={events} />
    </main>
  );
}
