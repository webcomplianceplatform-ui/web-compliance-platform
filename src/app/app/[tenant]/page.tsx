import Link from "next/link";
import { prisma } from "@/lib/db";

export default async function TenantOverview({
  params,
}: {
  params: Promise<{ tenant: string }>;
}) {
  const { tenant } = await params;

  const t = await prisma.tenant.findUnique({
    where: { slug: tenant },
    select: { id: true, name: true, slug: true },
  });

  if (!t) return <div>Tenant not found</div>;

  const [byStatus, last7d, recent, checksCount, lastEvents] = await Promise.all([
    prisma.ticket.groupBy({
      by: ["status"],
      where: { tenantId: t.id },
      _count: { _all: true },
    }),
    prisma.ticket.count({
      where: { tenantId: t.id, createdAt: { gte: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000) } },
    }),
    prisma.ticket.findMany({
      where: { tenantId: t.id },
      orderBy: { createdAt: "desc" },
      take: 5,
      select: { id: true, title: true, status: true, priority: true, createdAt: true },
    }),
    prisma.monitorCheck.count({ where: { tenantId: t.id } }),
    prisma.monitorEvent.findMany({
      where: { tenantId: t.id },
      orderBy: { createdAt: "desc" },
      take: 5,
      select: { id: true, status: true, message: true, createdAt: true },
    }),
  ]);

  const statusMap = new Map(byStatus.map((s) => [s.status, s._count._all]));
  const open = statusMap.get("OPEN") ?? 0;
  const inProgress = statusMap.get("IN_PROGRESS") ?? 0;
  const waiting = statusMap.get("WAITING_CLIENT") ?? 0;

  return (
    <main className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold">{t.name} — Overview</h1>
        <p className="text-sm text-muted-foreground">
          Tenant: <span className="font-mono">{t.slug}</span>
        </p>
      </div>

      <section className="grid gap-4 md:grid-cols-4">
        <div className="rounded-xl border p-4">
          <div className="text-xs text-muted-foreground">Tickets OPEN</div>
          <div className="mt-2 text-2xl font-semibold">{open}</div>
        </div>
        <div className="rounded-xl border p-4">
          <div className="text-xs text-muted-foreground">IN_PROGRESS</div>
          <div className="mt-2 text-2xl font-semibold">{inProgress}</div>
        </div>
        <div className="rounded-xl border p-4">
          <div className="text-xs text-muted-foreground">WAITING_CLIENT</div>
          <div className="mt-2 text-2xl font-semibold">{waiting}</div>
        </div>
        <div className="rounded-xl border p-4">
          <div className="text-xs text-muted-foreground">Created last 7 days</div>
          <div className="mt-2 text-2xl font-semibold">{last7d}</div>
        </div>
      </section>

      <section className="grid gap-4 md:grid-cols-2">
        <div className="rounded-xl border p-4">
          <div className="flex items-center justify-between">
            <div className="text-sm font-medium">Recent tickets</div>
            <Link className="text-sm text-muted-foreground hover:text-foreground" href={`/app/${tenant}/tickets`}>
              View all →
            </Link>
          </div>

          <div className="mt-3 space-y-2">
            {recent.map((r) => (
              <Link
                key={r.id}
                href={`/app/${tenant}/tickets/${r.id}`}
                className="block rounded-lg border p-3 hover:bg-muted/50"
              >
                <div className="flex items-center justify-between">
                  <div className="font-medium">{r.title}</div>
                  <div className="text-xs text-muted-foreground font-mono">
                    {r.status} · {r.priority}
                  </div>
                </div>
                <div className="mt-1 text-xs text-muted-foreground">
                  {new Date(r.createdAt).toLocaleString()}
                </div>
              </Link>
            ))}
            {recent.length === 0 && <div className="text-sm text-muted-foreground">No tickets yet.</div>}
          </div>
        </div>

        <div className="rounded-xl border p-4">
          <div className="flex items-center justify-between">
            <div className="text-sm font-medium">Monitoring</div>
            <div className="text-xs text-muted-foreground">{checksCount} checks</div>
          </div>

          <div className="mt-3 space-y-2">
            {lastEvents.map((e) => (
              <div key={e.id} className="rounded-lg border p-3">
                <div className="flex items-center justify-between">
                  <div className="font-mono text-xs">{e.status}</div>
                  <div className="text-xs text-muted-foreground">{new Date(e.createdAt).toLocaleString()}</div>
                </div>
                <div className="mt-1 text-sm text-muted-foreground">{e.message}</div>
              </div>
            ))}
            {lastEvents.length === 0 && (
              <div className="text-sm text-muted-foreground">
                No monitoring events yet (next step: enable checks + cron).
              </div>
            )}
          </div>
        </div>
      </section>
    </main>
  );
}
