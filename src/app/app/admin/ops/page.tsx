import { prisma } from "@/lib/db";
import { requireSuperadminPage } from "@/lib/superadmin";

function fmt(d: Date | null | undefined) {
  if (!d) return "—";
  try {
    return new Intl.DateTimeFormat("en-GB", {
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
      hour: "2-digit",
      minute: "2-digit",
      second: "2-digit",
    }).format(d);
  } catch {
    return d.toISOString();
  }
}

function statusPill(ok: boolean, labelOk: string, labelBad: string) {
  return (
    <span
      className={
        "inline-flex items-center rounded-full border px-2.5 py-1 text-xs " +
        (ok ? "border-emerald-400/30 bg-emerald-400/10 text-emerald-200" : "border-rose-400/30 bg-rose-400/10 text-rose-200")
      }
    >
      {ok ? labelOk : labelBad}
    </span>
  );
}

export default async function AdminOpsPage() {
  await requireSuperadminPage();

  const now = Date.now();
  const last24h = new Date(now - 24 * 3600 * 1000);

  const [dbOkResult, lastMonitorEventAt, evidenceExports24h, mailerOk24h, mailerFail24h] = await Promise.all([
    prisma
      .$queryRawUnsafe("SELECT 1")
      .then(() => true)
      .catch(() => false),
    prisma.monitorEvent
      .findFirst({ orderBy: { createdAt: "desc" }, select: { createdAt: true } })
      .then((r) => r?.createdAt ?? null)
      .catch(() => null),
    prisma.auditEvent
      .count({ where: { action: "evidence.export", createdAt: { gte: last24h } } })
      .catch(() => 0),
    prisma.auditEvent
      .count({ where: { action: "mailer.sent", createdAt: { gte: last24h } } })
      .catch(() => 0),
    prisma.auditEvent
      .count({ where: { action: "mailer.fail", createdAt: { gte: last24h } } })
      .catch(() => 0),
  ]);

  const dbOk = dbOkResult;

  const [
    tenants,
    users,
    tickets,
    checks,
    lastMonitorEvent,
    lastSecurityAlert,
    lastAudit,
    lastMonitorRunAudit,
    lastEvidenceExportAudit,
  ] = await Promise.all([
    prisma.tenant.count().catch(() => 0),
    prisma.user.count().catch(() => 0),
    prisma.ticket.count().catch(() => 0),
    prisma.monitorCheck.count().catch(() => 0),
    prisma.monitorEvent.findFirst({ orderBy: { createdAt: "desc" }, select: { createdAt: true } }).catch(() => null),
    prisma.securityAlert.findFirst({ orderBy: { createdAt: "desc" }, select: { createdAt: true, level: true } }).catch(() => null),
    prisma.auditEvent.findFirst({ orderBy: { createdAt: "desc" }, select: { createdAt: true, action: true } }).catch(() => null),
    prisma.auditEvent
      .findFirst({ where: { action: "monitor.run" }, orderBy: { createdAt: "desc" }, select: { createdAt: true } })
      .catch(() => null),
    prisma.auditEvent
      .findFirst({ where: { action: "evidence.export" }, orderBy: { createdAt: "desc" }, select: { createdAt: true } })
      .catch(() => null),
  ]);

  // Mailer: we keep it simple. If the env var is present, we consider it configured.
  const mailerConfigured = Boolean(process.env.RESEND_API_KEY || process.env.SMTP_HOST || process.env.MAIL_FROM);

  // Error-rate (very lightweight): WARN alerts in last 24h.
  let warn24h = 0;
  try {
    warn24h = await prisma.securityAlert.count({
      where: { level: "WARN", createdAt: { gte: new Date(Date.now() - 24 * 60 * 60 * 1000) } },
    });
  } catch {
    warn24h = 0;
  }

  return (
    <main className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold">Admin · Ops</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Health signals for the platform. These are intentionally cheap checks (MVP): DB reachability, activity timestamps,
          and last-seen events.
        </p>
      </div>

      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <div className="rounded-2xl border border-border bg-bg1/60 p-4">
          <div className="text-xs text-muted-foreground">Database</div>
          <div className="mt-2">{statusPill(dbOkResult, "Connected", "Unreachable")}</div>
          <div className="mt-2 text-xs text-muted-foreground">SELECT 1</div>
        </div>

        <div className="rounded-2xl border border-border bg-bg1/60 p-4">
          <div className="text-xs text-muted-foreground">Mailer</div>
          <div className="mt-2">{statusPill(mailerConfigured, "Configured", "Not configured")}</div>
          <div className="mt-2 text-xs text-muted-foreground">Env-based signal (RESEND/SMTP/Mail From)</div>
        </div>

        <div className="rounded-2xl border border-border bg-bg1/60 p-4">
          <div className="text-xs text-muted-foreground">Monitor runner</div>
          <div className="mt-1 text-sm font-semibold">Last run</div>
          <div className="mt-1 text-xs text-muted-foreground">{fmt(lastMonitorRunAudit?.createdAt)}</div>
          <div className="mt-2 text-xs text-muted-foreground">Checks: {checks}</div>
        </div>

        <div className="rounded-2xl border border-border bg-bg1/60 p-4">
          <div className="text-xs text-muted-foreground">Evidence exports</div>
          <div className="mt-1 text-sm font-semibold">Last export</div>
          <div className="mt-1 text-xs text-muted-foreground">{fmt(lastEvidenceExportAudit?.createdAt)}</div>
          <div className="mt-2 text-xs text-muted-foreground">Audit action: evidence.export</div>
        </div>
      </div>

      <section className="rounded-2xl border border-border bg-bg1/60 p-4">
        <div className="text-sm font-semibold">Internal jobs (24h)</div>
        <p className="mt-1 text-sm text-muted-foreground">
          Counters based on AuditEvent actions. If a job is not instrumented yet, the counter stays at 0.
        </p>
        <div className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          <div className="rounded-2xl border border-border bg-slate-950/20 p-4">
            <div className="text-xs text-muted-foreground">Monitor runner activity</div>
            <div className="mt-1 text-sm">Last monitor event</div>
            <div className="mt-1 text-xs text-muted-foreground">{fmt(lastMonitorEventAt)}</div>
          </div>
          <div className="rounded-2xl border border-border bg-slate-950/20 p-4">
            <div className="text-xs text-muted-foreground">Evidence exports</div>
            <div className="mt-1 text-3xl font-semibold">{evidenceExports24h}</div>
            <div className="mt-1 text-xs text-muted-foreground">events / 24h</div>
          </div>
          <div className="rounded-2xl border border-border bg-slate-950/20 p-4">
            <div className="text-xs text-muted-foreground">Mailer success</div>
            <div className="mt-1 text-3xl font-semibold">{mailerOk24h}</div>
            <div className="mt-1 text-xs text-muted-foreground">mailer.sent / 24h</div>
          </div>
          <div className="rounded-2xl border border-border bg-slate-950/20 p-4">
            <div className="text-xs text-muted-foreground">Mailer failures</div>
            <div className="mt-1 text-3xl font-semibold">{mailerFail24h}</div>
            <div className="mt-1 text-xs text-muted-foreground">mailer.fail / 24h</div>
          </div>
        </div>
      </section>

      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <div className="rounded-2xl border border-border bg-bg1/60 p-4">
          <div className="text-xs text-muted-foreground">Tenants</div>
          <div className="mt-1 text-3xl font-semibold">{tenants}</div>
        </div>
        <div className="rounded-2xl border border-border bg-bg1/60 p-4">
          <div className="text-xs text-muted-foreground">Users</div>
          <div className="mt-1 text-3xl font-semibold">{users}</div>
        </div>
        <div className="rounded-2xl border border-border bg-bg1/60 p-4">
          <div className="text-xs text-muted-foreground">Tickets</div>
          <div className="mt-1 text-3xl font-semibold">{tickets}</div>
        </div>
        <div className="rounded-2xl border border-border bg-bg1/60 p-4">
          <div className="text-xs text-muted-foreground">Warn alerts (24h)</div>
          <div className="mt-1 text-3xl font-semibold">{warn24h}</div>
        </div>
      </div>

      <div className="rounded-2xl border border-border bg-bg1/60 p-4">
        <div className="text-sm font-semibold">Latest activity</div>
        <div className="mt-3 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          <div className="rounded-2xl border border-border bg-slate-950/20 p-4">
            <div className="text-xs text-muted-foreground">Last monitor event</div>
            <div className="mt-1 text-sm">{fmt(lastMonitorEvent?.createdAt)}</div>
          </div>
          <div className="rounded-2xl border border-border bg-slate-950/20 p-4">
            <div className="text-xs text-muted-foreground">Last security alert</div>
            <div className="mt-1 text-sm">{fmt(lastSecurityAlert?.createdAt)}</div>
            <div className="mt-1 text-xs text-muted-foreground">Level: {lastSecurityAlert?.level ?? "—"}</div>
          </div>
          <div className="rounded-2xl border border-border bg-slate-950/20 p-4">
            <div className="text-xs text-muted-foreground">Last audit event</div>
            <div className="mt-1 text-sm">{fmt(lastAudit?.createdAt)}</div>
            <div className="mt-1 text-xs text-muted-foreground">Action: {lastAudit?.action ?? "—"}</div>
          </div>
        </div>
      </div>

      <div className="rounded-2xl border border-border bg-bg1/60 p-4">
        <div className="text-sm font-semibold">What we can add next (when needed)</div>
        <ul className="mt-2 list-disc space-y-1 pl-5 text-sm text-muted-foreground">
          <li>Uptime of internal jobs: monitor runner, evidence exports, notification dispatch</li>
          <li>Mailer delivery success/fail counters (and retry queue size)</li>
          <li>DB connection pool saturation + slow query sampling</li>
          <li>Error-rate by route (4xx/5xx) and top failing actions</li>
        </ul>
      </div>
    </main>
  );
}
