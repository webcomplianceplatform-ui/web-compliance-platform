import { prisma } from "@/lib/db";
import { requireSuperadminPage } from "@/lib/superadmin";

async function safeDistinctTenants(model: "monitorCheck" | "ticket" | "legalPublished") {
  // Prisma count(distinct ...) support can vary depending on driver/version.
  // Raw SQL keeps it deterministic.
  try {
    switch (model) {
      case "monitorCheck": {
        const rows = await prisma.$queryRawUnsafe<{ n: number }[]>(
          'SELECT COUNT(DISTINCT "tenantId")::int AS n FROM public."MonitorCheck"',
        );
        return rows?.[0]?.n ?? 0;
      }
      case "ticket": {
        const rows = await prisma.$queryRawUnsafe<{ n: number }[]>(
          'SELECT COUNT(DISTINCT "tenantId")::int AS n FROM public."Ticket"',
        );
        return rows?.[0]?.n ?? 0;
      }
      case "legalPublished": {
        // Not implemented in this schema yet (kept as future-proof hook).
        return 0;
      }
    }
  } catch {
    return 0;
  }
}

function max(a: number, b: number) { return a > b ? a : b; }

function pct(n: number, d: number) {
  if (d <= 0) return "0%";
  return `${Math.round((n / d) * 100)}%`;
}

function BarKpi({ label, n, d }: { label: string; n: number; d: number }) {
  const p = d <= 0 ? 0 : Math.round((n / d) * 100);
  return (
    <div className="rounded-2xl border border-border bg-bg1/60 p-4">
      <div className="flex items-baseline justify-between gap-2">
        <div className="text-xs text-muted-foreground">{label}</div>
        <div className="text-xs text-muted-foreground">{n} / {d}</div>
      </div>
      <div className="mt-2 h-2 overflow-hidden rounded-full bg-white/5">
        <div className="h-2 rounded-full bg-[hsl(var(--brand))]" style={{ width: `${p}%` }} />
      </div>
      <div className="mt-2 text-lg font-semibold">{p}%</div>
    </div>
  );
}

export default async function AdminKpisPage() {
  await requireSuperadminPage();

  const [tenants, tenantsWithMonitoring, tenantsWithTickets, tenantsWithLegal] = await Promise.all([
    prisma.tenant.count(),
    safeDistinctTenants("monitorCheck"),
    safeDistinctTenants("ticket"),
    safeDistinctTenants("legalPublished"),
  ]);

  // Time to first value (avg hours). Cheapest signal: first ticket & first monitor created after provisioning.
  const [ttftTicket, ttftMonitor] = await Promise.all([
    prisma.$queryRawUnsafe<{ h: number | null }[]>(
      `
      WITH first_ticket AS (
        SELECT "tenantId", MIN("createdAt") AS first_at
        FROM public."Ticket"
        GROUP BY "tenantId"
      )
      SELECT AVG(EXTRACT(EPOCH FROM (ft.first_at - t."createdAt")) / 3600.0) AS h
      FROM first_ticket ft
      JOIN public."Tenant" t ON t.id = ft."tenantId"
      `,
    ),
    prisma.$queryRawUnsafe<{ h: number | null }[]>(
      `
      WITH first_monitor AS (
        SELECT "tenantId", MIN("createdAt") AS first_at
        FROM public."MonitorCheck"
        GROUP BY "tenantId"
      )
      SELECT AVG(EXTRACT(EPOCH FROM (fm.first_at - t."createdAt")) / 3600.0) AS h
      FROM first_monitor fm
      JOIN public."Tenant" t ON t.id = fm."tenantId"
      `,
    ),
  ]);

  const avgTicketH = Number(ttftTicket?.[0]?.h ?? 0);
  const avgMonitorH = Number(ttftMonitor?.[0]?.h ?? 0);

  // Retention/churn (last 30 days activity) by plan.
  const planRows = await prisma.$queryRawUnsafe<
    { plan: string; total: number; active30: number }[]
  >(
    `
    WITH active AS (
      SELECT DISTINCT "tenantId" FROM public."Ticket" WHERE "createdAt" >= now() - interval '30 days'
      UNION
      SELECT DISTINCT "tenantId" FROM public."MonitorEvent" WHERE "createdAt" >= now() - interval '30 days'
    )
    SELECT tp.plan::text AS plan,
           COUNT(*)::int AS total,
           SUM(CASE WHEN a."tenantId" IS NOT NULL THEN 1 ELSE 0 END)::int AS active30
    FROM public."TenantPlan" tp
    JOIN public."Tenant" t ON t.id = tp."tenantId"
    LEFT JOIN active a ON a."tenantId" = t.id
    GROUP BY tp.plan
    ORDER BY tp.plan
    `,
  );

  // High-signal usage (best effort): evidence exports & security alerts volume (ack not implemented yet).
  const [evidenceExports30, alerts30] = await Promise.all([
    prisma.auditEvent.count({ where: { action: "evidence.export", createdAt: { gte: new Date(Date.now() - 30 * 86400 * 1000) } } }),
    prisma.securityAlert.count({ where: { createdAt: { gte: new Date(Date.now() - 30 * 86400 * 1000) } } }),
  ]);

  // Growth funnel (last 7 days)
  const since7 = new Date(Date.now() - 7 * 86400 * 1000);
  const [users7, tenants7, domains7, connected7, exports7, upgradeReq7] = await Promise.all([
    prisma.user.count({ where: { createdAt: { gte: since7 } } }),
    prisma.tenant.count({ where: { createdAt: { gte: since7 } } }),
    prisma.$queryRawUnsafe<{ n: number }[]>(
      `SELECT COUNT(DISTINCT "tenantId")::int AS n FROM public."AuditEvent" WHERE action='monitor.check.create' AND "createdAt" >= now() - interval '7 days'`,
    ).then((r) => r?.[0]?.n ?? 0).catch(() => 0),
    prisma.$queryRawUnsafe<{ n: number }[]>(
      `SELECT COUNT(DISTINCT "tenantId")::int AS n FROM public."AuditEvent" WHERE action='evidence.source.connected' AND "createdAt" >= now() - interval '7 days'`,
    ).then((r) => r?.[0]?.n ?? 0).catch(() => 0),
    prisma.auditEvent.count({ where: { action: 'evidence.export', createdAt: { gte: since7 } } }),
    prisma.auditEvent.count({ where: { action: 'billing.upgrade.request', createdAt: { gte: since7 } } }),
  ]);



  return (
    <main className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold">Admin · KPIs</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Adoption and engagement (MVP). We keep it brutally simple: whether tenants actually use each module.
        </p>
      </div>

      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <div className="rounded-2xl border border-border bg-bg1/60 p-4">
          <div className="text-xs text-muted-foreground">Tenants</div>
          <div className="mt-1 text-3xl font-semibold">{tenants}</div>
        </div>
        <div className="rounded-2xl border border-border bg-bg1/60 p-4">
          <div className="text-xs text-muted-foreground">Monitoring adoption</div>
          <div className="mt-1 text-3xl font-semibold">{pct(tenantsWithMonitoring, tenants)}</div>
          <div className="mt-1 text-xs text-muted-foreground">{tenantsWithMonitoring} tenants</div>
        </div>
        <div className="rounded-2xl border border-border bg-bg1/60 p-4">
          <div className="text-xs text-muted-foreground">Tickets adoption</div>
          <div className="mt-1 text-3xl font-semibold">{pct(tenantsWithTickets, tenants)}</div>
          <div className="mt-1 text-xs text-muted-foreground">{tenantsWithTickets} tenants</div>
        </div>
        <div className="rounded-2xl border border-border bg-bg1/60 p-4">
          <div className="text-xs text-muted-foreground">Legal published</div>
          <div className="mt-1 text-3xl font-semibold">{pct(tenantsWithLegal, tenants)}</div>
          <div className="mt-1 text-xs text-muted-foreground">{tenantsWithLegal} tenants</div>
        </div>
      </div>

      <section className="rounded-2xl border border-border bg-bg1/60 p-4">
        <div className="flex flex-wrap items-end justify-between gap-2">
          <div>
            <div className="text-sm font-semibold">Growth funnel (7d)</div>
            <p className="mt-1 text-sm text-muted-foreground">Acquisition → activation → intent. These are the numbers you actually manage.</p>
          </div>
          <div className="text-xs text-muted-foreground">Last 7 days</div>
        </div>

        <div className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-6">
          <div className="rounded-2xl border border-border bg-bg1/60 p-4">
            <div className="text-xs text-muted-foreground">New users</div>
            <div className="mt-1 text-3xl font-semibold">{users7}</div>
          </div>
          <div className="rounded-2xl border border-border bg-bg1/60 p-4">
            <div className="text-xs text-muted-foreground">New tenants</div>
            <div className="mt-1 text-3xl font-semibold">{tenants7}</div>
          </div>
          <div className="rounded-2xl border border-border bg-bg1/60 p-4">
            <div className="text-xs text-muted-foreground">Tenants w/ domain</div>
            <div className="mt-1 text-3xl font-semibold">{domains7}</div>
            <div className="mt-1 text-xs text-muted-foreground">{pct(domains7, Math.max(1, tenants7))} of new tenants</div>
          </div>
          <div className="rounded-2xl border border-border bg-bg1/60 p-4">
            <div className="text-xs text-muted-foreground">Connected</div>
            <div className="mt-1 text-3xl font-semibold">{connected7}</div>
            <div className="mt-1 text-xs text-muted-foreground">{pct(connected7, Math.max(1, domains7))} of domain adds</div>
          </div>
          <div className="rounded-2xl border border-border bg-bg1/60 p-4">
            <div className="text-xs text-muted-foreground">Exports</div>
            <div className="mt-1 text-3xl font-semibold">{exports7}</div>
          </div>
          <div className="rounded-2xl border border-border bg-bg1/60 p-4">
            <div className="text-xs text-muted-foreground">Upgrade requests</div>
            <div className="mt-1 text-3xl font-semibold">{upgradeReq7}</div>
            <div className="mt-1 text-xs text-muted-foreground">{pct(upgradeReq7, Math.max(1, connected7))} of connected</div>
          </div>
        </div>

        <div className="mt-4 text-xs text-muted-foreground">
          Tip: if <span className="font-mono">Tenants w/ domain</span> is low, fix onboarding. If <span className="font-mono">Connected</span> is low, improve install steps. If <span className="font-mono">Upgrade requests</span> is low, raise export/retention limits & triggers.
        </div>
      </section>

      <section className="rounded-2xl border border-border bg-bg1/60 p-4">
        <div className="text-sm font-semibold">Adoption bars</div>
        <p className="mt-1 text-sm text-muted-foreground">A quick visual snapshot per module.</p>
        <div className="mt-4 grid gap-3 md:grid-cols-3">
          <BarKpi label="Monitoring" n={tenantsWithMonitoring} d={tenants} />
          <BarKpi label="Tickets" n={tenantsWithTickets} d={tenants} />
          <BarKpi label="Legal (published)" n={tenantsWithLegal} d={tenants} />
        </div>
      </section>

      <section className="rounded-2xl border border-border bg-bg1/60 p-4">
        <div className="text-sm font-semibold">Time-to-first-value</div>
        <p className="mt-1 text-sm text-muted-foreground">
          Average time from tenant provision to first usage. (MVP signal)
        </p>
        <div className="mt-4 grid gap-3 sm:grid-cols-2">
          <div className="rounded-2xl border border-border bg-bg1/60 p-4">
            <div className="text-xs text-muted-foreground">Provision → first ticket</div>
            <div className="mt-1 text-3xl font-semibold">{avgTicketH ? `${Math.round(avgTicketH)}h` : "—"}</div>
            <div className="mt-1 text-xs text-muted-foreground">(avg)</div>
          </div>
          <div className="rounded-2xl border border-border bg-bg1/60 p-4">
            <div className="text-xs text-muted-foreground">Provision → first monitor</div>
            <div className="mt-1 text-3xl font-semibold">{avgMonitorH ? `${Math.round(avgMonitorH)}h` : "—"}</div>
            <div className="mt-1 text-xs text-muted-foreground">(avg)</div>
          </div>
        </div>
      </section>

      <section className="rounded-2xl border border-border bg-bg1/60 p-4">
        <div className="text-sm font-semibold">Retention & churn (last 30d activity)</div>
        <p className="mt-1 text-sm text-muted-foreground">
          Active tenants are those with any Tickets or Monitor events in the last 30 days.
        </p>
        <div className="mt-4 overflow-hidden rounded-2xl border border-border">
          <table className="w-full text-sm">
            <thead className="bg-white/5 text-xs text-muted-foreground">
              <tr>
                <th className="px-4 py-2 text-left">Plan</th>
                <th className="px-4 py-2 text-right">Total</th>
                <th className="px-4 py-2 text-right">Active</th>
                <th className="px-4 py-2 text-right">Churned</th>
              </tr>
            </thead>
            <tbody>
              {(planRows ?? []).map((r) => {
                const churn = Math.max(0, (r.total ?? 0) - (r.active30 ?? 0));
                return (
                  <tr key={r.plan} className="border-t border-border">
                    <td className="px-4 py-2 font-medium">{r.plan}</td>
                    <td className="px-4 py-2 text-right">{r.total}</td>
                    <td className="px-4 py-2 text-right">{r.active30}</td>
                    <td className="px-4 py-2 text-right">{churn}</td>
                  </tr>
                );
              })}
              {!planRows?.length && (
                <tr>
                  <td className="px-4 py-3 text-muted-foreground" colSpan={4}>
                    No TenantPlan data yet.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </section>

      <section className="rounded-2xl border border-border bg-bg1/60 p-4">
        <div className="text-sm font-semibold">High-signal feature usage</div>
        <p className="mt-1 text-sm text-muted-foreground">
          Evidence exports + security alerts volume. (Alerts acknowledgement metric will be added when we store it.)
        </p>
        <div className="mt-4 grid gap-3 sm:grid-cols-2">
          <div className="rounded-2xl border border-border bg-bg1/60 p-4">
            <div className="text-xs text-muted-foreground">Evidence exports (30d)</div>
            <div className="mt-1 text-3xl font-semibold">{evidenceExports30}</div>
          </div>
          <div className="rounded-2xl border border-border bg-bg1/60 p-4">
            <div className="text-xs text-muted-foreground">Security alerts created (30d)</div>
            <div className="mt-1 text-3xl font-semibold">{alerts30}</div>
          </div>
        </div>
      </section>

      <div className="rounded-2xl border border-border bg-bg1/60 p-4">
        <div className="text-sm font-semibold">Next KPIs (when we have volume)</div>
        <ul className="mt-2 list-disc space-y-1 pl-5 text-sm text-muted-foreground">
          <li>Legal published adoption (needs Legal* table)</li>
          <li>Error-rate by route + slow query sampling (needs instrumentation)</li>
          <li>Alert acknowledgement + evidence bundle SLA (when stored)</li>
        </ul>
      </div>
    </main>
  );
}
