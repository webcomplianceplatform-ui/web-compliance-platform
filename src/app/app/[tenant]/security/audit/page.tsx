import Link from "next/link";
import { prisma } from "@/lib/db";
import { requireTenantContextPage } from "@/lib/tenant-auth";
import ModuleLocked from "@/components/app/ModuleLocked";
import { AppCard } from "@/components/app-ui/AppCard";
import { AppInput } from "@/components/app-ui/AppInput";
import { appButtonClassName } from "@/components/app-ui/AppButton";
import { AppTable, AppTableHead, AppTableRow } from "@/components/app-ui/AppTable";

const TAKE = 100;

type SP = Record<string, string | string[] | undefined>;

function first(v: string | string[] | undefined) {
  return Array.isArray(v) ? v[0] : v;
}

type ActionRow = { action: string; cnt: number };

export default async function SecurityAuditPage({
  params,
  searchParams,
}: {
  params: Promise<{ tenant: string }>;
  searchParams?: Promise<SP>;
}) {
  const { tenant } = await params;
  const sp = (await searchParams) ?? {};

  const ctx = await requireTenantContextPage(tenant);
  const advancedAudit = !!(ctx.features as any)?.raw?.security?.audit;

  if (!ctx.features.security || !advancedAudit) {
    return <ModuleLocked tenant={tenant} module="security" />;
  }

  const actionExact = (first(sp.action) ?? "").trim();
  const actorQ = (first(sp.actor) ?? "").trim();
  const includeAccess = first(sp.access) === "1";

  const days = Math.min(365, Math.max(1, Number(first(sp.days) ?? 30) || 30));
  const since = new Date(Date.now() - days * 24 * 60 * 60 * 1000);

  const humanAction = (a: string) => {
    // Keep this small and opinionated (Phase B). Unknown actions fall back to the raw value.
    const map: Record<string, string> = {
      "tenant.plan.update": "Plan changed",
      "tenant.legal.update": "Legal updated",
      "tenant.domain.update": "Domain updated",
      "tenant.domain.verify": "Domain verified",
      "tenant.user.add": "User added",
      "tenant.user.invite": "User invited",
      "tenant.user.remove": "User removed",
      "tenant.user.role.update": "User role changed",
      "admin.impersonation_start": "Superadmin impersonation started",
      "admin.impersonation_stop": "Superadmin impersonation ended",
      "user.password.change": "Password changed",
      "admin.user.password.reset": "Password reset by superadmin",
    };
    return map[a] ?? a;
  };

  const buildQueryString = () => {
    const u = new URL("http://local");
    if (actionExact) u.searchParams.set("action", actionExact);
    if (actorQ) u.searchParams.set("actor", actorQ);
    u.searchParams.set("days", String(days));
    if (includeAccess) u.searchParams.set("access", "1");
    return u.search;
  };

  // Main events filter
  const where: any = {
    tenantId: ctx.tenantId,
    createdAt: { gte: since },
  };

  // Hide ACCESS category by default (impersonation, etc.)
  if (!includeAccess) {
    where.NOT = [{ metaJson: { path: ["category"], equals: "ACCESS" } }];
  }

  if (actionExact) where.action = actionExact;

  if (actorQ) {
    where.OR = [
      { actor: { email: { contains: actorQ, mode: "insensitive" } } },
      { actor: { name: { contains: actorQ, mode: "insensitive" } } },
    ];
  }

  // Dropdown actions: use SQL (reliable across Prisma versions/models)
  // We must mirror the ACCESS filter here too.
  const actions = await prisma.$queryRaw<ActionRow[]>`
    SELECT
      "action" as action,
      COUNT(*)::int as cnt
    FROM public."AuditEvent"
    WHERE "tenantId" = ${ctx.tenantId}
      AND "createdAt" >= ${since}
      AND (
        ${includeAccess} = true
        OR NOT (COALESCE("metaJson",'{}'::jsonb) ->> 'category' = 'ACCESS')
      )
    GROUP BY "action"
    ORDER BY cnt DESC
    LIMIT 50
  `;

  const events = await prisma.auditEvent.findMany({
    where,
    orderBy: { createdAt: "desc" },
    take: TAKE,
    select: {
      id: true,
      createdAt: true,
      action: true,
      targetType: true,
      targetId: true,
      metaJson: true,
      actor: { select: { email: true, name: true } },
    },
  });

  return (
    <main className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div>
          <h1 className="text-2xl font-semibold">Security · Audit</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Last {days} days · showing up to {TAKE} events
          </p>
        </div>

        <div className="flex flex-wrap gap-2">
          <Link
            className={appButtonClassName({ variant: "secondary" })}
            href={`/api/app/${tenant}/security/audit/export${buildQueryString()}`}
          >
            Export CSV
          </Link>
          <Link className={appButtonClassName({ variant: "secondary" })} href={`/app/${tenant}/security`}>
            Back to Security
          </Link>
        </div>
      </div>

      <form method="get">
        <AppCard className="grid gap-2 p-3 md:grid-cols-5">
          <label className="text-xs">
            Action
            <select
              name="action"
              defaultValue={actionExact}
              className="mt-1 w-full rounded-xl border border-border bg-bg2/50 px-3 py-2 text-sm text-foreground backdrop-blur transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand/30 focus-visible:border-brand2"
            >
              <option value="">All actions</option>
              {actions.map((a) => (
                <option key={a.action} value={a.action}>
                  {a.action} ({a.cnt})
                </option>
              ))}
            </select>
          </label>

          <label className="text-xs">
            Actor
            <AppInput name="actor" defaultValue={actorQ} placeholder="email or name…" className="mt-1" />
          </label>

          <label className="text-xs">
            Days
            <AppInput name="days" defaultValue={String(days)} placeholder="Days" className="mt-1" />
          </label>

          <label className="flex items-center gap-2 text-xs md:mt-6">
            <input type="checkbox" name="access" value="1" defaultChecked={includeAccess} />
            Include access events
          </label>

          <div className="flex items-center gap-2 md:mt-6">
            <button className={appButtonClassName({ variant: "primary" })} type="submit">
              Apply
            </button>
            <Link className={appButtonClassName({ variant: "secondary" })} href={`/app/${tenant}/security/audit`}>
              Reset
            </Link>
          </div>
        </AppCard>
      </form>

      <AppTable>
        <AppTableHead>
          <tr>
            <th className="p-3 text-left">Time</th>
            <th className="p-3 text-left">Action</th>
            <th className="p-3 text-left">Actor</th>
            <th className="p-3 text-left">Target</th>
          </tr>
        </AppTableHead>
        <tbody>
          {events.map((e) => (
            <AppTableRow key={e.id}>
              <td className="p-3 whitespace-nowrap text-xs text-muted-foreground">
                {new Date(e.createdAt).toLocaleString()}
              </td>

              <td className="p-3 text-sm">
                <div className="min-w-0">
                  <div className="truncate text-sm font-medium">{humanAction(e.action)}</div>
                  <div className="truncate font-mono text-[11px] text-muted-foreground">{e.action}</div>
                </div>
              </td>

              <td className="p-3 text-sm">
                {e.actor?.name ? (
                  <div className="min-w-0">
                    <div className="truncate">{e.actor.name}</div>
                    <div className="truncate text-xs text-muted-foreground">{e.actor.email}</div>
                  </div>
                ) : (
                  <span className="text-xs text-muted-foreground">{e.actor?.email ?? "—"}</span>
                )}
              </td>

              <td className="p-3 text-sm">
                {e.targetType ? (
                  <div className="min-w-0">
                    <div className="truncate font-mono text-xs">{e.targetType}</div>
                    <div className="truncate text-xs text-muted-foreground">{e.targetId ?? ""}</div>
                  </div>
                ) : (
                  <span className="text-xs text-muted-foreground">—</span>
                )}
              </td>
            </AppTableRow>
          ))}

          {events.length === 0 && (
            <tr>
              <td colSpan={4} className="p-6 text-center text-sm text-muted-foreground">
                No audit events found for the selected filters.
              </td>
            </tr>
          )}
        </tbody>
      </AppTable>

      <details className="rounded-2xl border bg-bg1/70 p-4">
        <summary className="cursor-pointer text-sm text-muted-foreground">Notes</summary>
        <div className="mt-2 text-sm text-muted-foreground space-y-1">
          <p>• Audit is stored as immutable events (best-effort logging).</p>
          <p>• Access events (e.g., impersonation) are hidden by default.</p>
        </div>
      </details>
    </main>
  );
}
