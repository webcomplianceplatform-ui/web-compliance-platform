import Link from "next/link";
import { prisma } from "@/lib/db";
import {
  canManageSettings,
  canManageTickets,
  canManageUsers,
  requireTenantContextPage,
} from "@/lib/tenant-auth";
import EmptyState from "@/components/app/EmptyState";
import { Badge } from "@/components/ui/badge";

const DAYS_7_MS = 7 * 24 * 60 * 60 * 1000;

export default async function TenantHome({
  params,
}: {
  params: Promise<{ tenant: string }>;
}) {
  const { tenant } = await params;

  const ctx = await requireTenantContextPage(tenant);
  const isTicketManager = canManageTickets(ctx.role);
  const isUserManager = canManageUsers(ctx.role);
  const isSettingsManager = canManageSettings(ctx.role);

  const t = await prisma.tenant.findUnique({
    where: { id: ctx.tenantId },
    select: { id: true, name: true, slug: true, status: true },
  });

  if (!t) return <div>Tenant not found</div>;

  const ticketScopeWhere = isTicketManager
    ? { tenantId: t.id }
    : { tenantId: t.id, createdById: ctx.user.id };

  const [byStatus, totalTickets, last7d, recentTickets, checksTotal, checksEnabled, lastEvents] =
    await Promise.all([
      prisma.ticket.groupBy({
        by: ["status"],
        where: ticketScopeWhere,
        _count: { _all: true },
      }),
      prisma.ticket.count({ where: ticketScopeWhere }),
      prisma.ticket.count({
        where: {
          ...ticketScopeWhere,
          createdAt: { gte: new Date(Date.now() - DAYS_7_MS) },
        },
      }),
      prisma.ticket.findMany({
        where: ticketScopeWhere,
        orderBy: { createdAt: "desc" },
        take: 5,
        select: { id: true, title: true, status: true, priority: true, createdAt: true },
      }),
      prisma.monitorCheck.count({ where: { tenantId: t.id } }),
      prisma.monitorCheck.count({ where: { tenantId: t.id, enabled: true } }),
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

  const quickActions = [
    { label: "Create ticket", href: `/app/${tenant}/tickets/new`, show: true },
    { label: "View tickets", href: `/app/${tenant}/tickets`, show: true },
    { label: "Monitoring", href: `/app/${tenant}/monitor`, show: true },
    { label: "Users", href: `/app/${tenant}/users`, show: isUserManager },
    { label: "Settings", href: `/app/${tenant}/settings`, show: isSettingsManager },
  ].filter((a) => a.show);

  return (
    <main className="space-y-6">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold">{t.name}</h1>
          <div className="mt-1 flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
            <span>
              Tenant: <span className="font-mono">{t.slug}</span>
            </span>
            <span className="opacity-60">·</span>
            <span>
              Plan/status: <span className="font-mono">{String(t.status)}</span>
            </span>
            {!isTicketManager && (
              <>
                <span className="opacity-60">·</span>
                <span>Scope: <span className="font-mono">my tickets</span></span>
              </>
            )}
          </div>
        </div>

        <div className="flex flex-wrap gap-2">
          {quickActions.map((a) => (
            <Link key={a.href} href={a.href} className="rounded border px-3 py-2 text-sm hover:bg-muted">
              {a.label}
            </Link>
          ))}
          <a
            href={`/t/${tenant}`}
            target="_blank"
            className="rounded border px-3 py-2 text-sm text-muted-foreground hover:bg-muted hover:text-foreground"
          >
            Public site ↗
          </a>
        </div>
      </div>

      {totalTickets === 0 ? (
        <div className="rounded-xl border p-4">
          <EmptyState
            title="No tickets yet"
            description={
              isTicketManager
                ? "Create your first ticket to track changes, incidents, SEO or legal work for this tenant."
                : "You don't have any tickets yet. Create one to request changes or report an issue."
            }
            actionLabel="Create ticket"
            actionHref={`/app/${tenant}/tickets/new`}
          />
        </div>
      ) : null}

      <section className="grid gap-4 md:grid-cols-4">
        <div className="rounded-xl border p-4">
          <div className="text-xs text-muted-foreground">OPEN</div>
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
            {recentTickets.map((r) => (
              <Link
                key={r.id}
                href={`/app/${tenant}/tickets/${r.id}`}
                className="block rounded-lg border p-3 hover:bg-muted/50"
              >
                <div className="flex items-center justify-between gap-2">
                  <div className="font-medium truncate">{r.title}</div>
                  <div className="flex items-center gap-2">
                    <Badge className="font-mono" variant="outline">
                      {r.priority}
                    </Badge>
                    <Badge
                      className="font-mono"
                      variant={r.status === "RESOLVED" || r.status === "CLOSED" ? "success" : "muted"}
                    >
                      {r.status}
                    </Badge>
                  </div>
                </div>
                <div className="mt-1 text-xs text-muted-foreground">{new Date(r.createdAt).toLocaleString()}</div>
              </Link>
            ))}
            {recentTickets.length === 0 && (
              <div className="text-sm text-muted-foreground">No tickets found for your current scope.</div>
            )}
          </div>
        </div>

        <div className="rounded-xl border p-4">
          <div className="flex items-center justify-between">
            <div className="text-sm font-medium">Monitoring</div>
            <div className="text-xs text-muted-foreground">
              {checksEnabled}/{checksTotal} enabled
            </div>
          </div>

          <div className="mt-3 space-y-2">
            {lastEvents.map((e) => (
              <div key={e.id} className="rounded-lg border p-3">
                <div className="flex items-center justify-between gap-2">
                  <Badge className="font-mono" variant={e.status === "FAIL" ? "danger" : "success"}>
                    {e.status}
                  </Badge>
                  <div className="text-xs text-muted-foreground">{new Date(e.createdAt).toLocaleString()}</div>
                </div>
                <div className="mt-1 text-sm text-muted-foreground">{e.message}</div>
              </div>
            ))}
            {lastEvents.length === 0 && (
              <div className="text-sm text-muted-foreground">
                No monitoring events yet. Add a check and click <span className="font-mono">Run now</span>.
              </div>
            )}

            <div className="pt-2">
              <Link className="text-sm text-muted-foreground hover:text-foreground" href={`/app/${tenant}/monitor`}>
                Open monitoring →
              </Link>
            </div>
          </div>
        </div>
      </section>

      {(isSettingsManager || isUserManager) && (
        <section className="rounded-xl border p-4">
          <div className="text-sm font-medium">Admin shortcuts</div>
          <div className="mt-3 flex flex-wrap gap-2">
            {isUserManager && (
              <Link href={`/app/${tenant}/users`} className="rounded border px-3 py-2 text-sm hover:bg-muted">
                Manage users
              </Link>
            )}
            {isSettingsManager && (
              <Link href={`/app/${tenant}/settings`} className="rounded border px-3 py-2 text-sm hover:bg-muted">
                Edit theme / SEO / legal
              </Link>
            )}
          </div>
        </section>
      )}
    </main>
  );
}
