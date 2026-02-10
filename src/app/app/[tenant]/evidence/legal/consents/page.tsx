import Link from "next/link";
import { prisma } from "@/lib/db";
import { requireTenantContextPage } from "@/lib/tenant-auth";
import ModuleLocked from "@/components/app/ModuleLocked";
import { AppCard } from "@/components/app-ui/AppCard";
import { AppInput } from "@/components/app-ui/AppInput";
import { AppTable, AppTableHead, AppTableRow } from "@/components/app-ui/AppTable";
import { appButtonClassName } from "@/components/app-ui/AppButton";

const TAKE = 200;

type SP = Record<string, string | string[] | undefined>;
function first(v: string | string[] | undefined) {
  return Array.isArray(v) ? v[0] : v;
}

export default async function LegalConsentsPage({
  params,
  searchParams,
}: {
  params: Promise<{ tenant: string }>;
  searchParams?: Promise<SP>;
}) {
  const { tenant } = await params;
  const sp = (await searchParams) ?? {};

  const ctx = await requireTenantContextPage(tenant);
  if (!ctx.features.legal) return <ModuleLocked tenant={tenant} module="legal" />;

  const days = Math.min(365, Math.max(1, Number(first(sp.days) ?? 30) || 30));
  const since = new Date(Date.now() - days * 24 * 60 * 60 * 1000);
  const state = (first(sp.state) ?? "").trim();

  const actions = ["legal.consent.accepted", "legal.consent.rejected", "legal.consent.reset", "legal.consent.custom"];

  const where: any = {
    tenantId: ctx.tenantId,
    createdAt: { gte: since },
    action: { in: actions },
  };

  if (state) {
    where.metaJson = { path: ["state"], equals: state };
  }

  const events = await prisma.auditEvent.findMany({
    where,
    orderBy: { createdAt: "desc" },
    take: TAKE,
    select: {
      id: true,
      createdAt: true,
      action: true,
      metaJson: true,
      ip: true,
      actor: { select: { id: true, email: true, name: true } },
    },
  });

  const label = (a: string) =>
    a === "legal.consent.accepted"
      ? "Accepted"
      : a === "legal.consent.rejected"
        ? "Rejected"
        : a === "legal.consent.custom"
          ? "Custom"
          : "Reset";

  const qs = new URL("http://local");
  qs.searchParams.set("days", String(days));
  if (state) qs.searchParams.set("state", state);

  return (
    <main className="space-y-4">
      <div className="flex flex-wrap items-start justify-between gap-2">
        <div>
          <h1 className="text-2xl font-semibold">Evidence · Legal · Consent logs</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Consentimientos registrados como evidencia (AuditEvent) · últimos {days} días
          </p>
        </div>

        <div className="flex flex-wrap gap-2">
          <Link
            className={appButtonClassName({ variant: "secondary" })}
            href={`/api/app/${tenant}/evidence/legal/consents/export${qs.search}`}
          >
            Export CSV
          </Link>
          <Link className={appButtonClassName({ variant: "secondary" })} href={`/app/${tenant}/evidence/legal`}>
            Back to Legal Evidence
          </Link>
        </div>
      </div>

      <form method="get">
        <AppCard className="grid gap-2 p-3 md:grid-cols-4">
          <label className="text-xs">
            State
            <select
              name="state"
              defaultValue={state}
              className="mt-1 w-full rounded-xl border border-border bg-bg2/50 px-3 py-2 text-sm text-foreground backdrop-blur transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand/30 focus-visible:border-brand2"
            >
              <option value="">All</option>
              <option value="accepted">accepted</option>
              <option value="rejected">rejected</option>
              <option value="custom">custom</option>
              <option value="unset">unset</option>
            </select>
          </label>

          <label className="text-xs">
            Days
            <AppInput name="days" defaultValue={String(days)} className="mt-1" />
          </label>

          <div className="flex items-center gap-2 md:mt-6">
            <button className={appButtonClassName({ variant: "primary" })} type="submit">
              Apply
            </button>
            <Link
              className={appButtonClassName({ variant: "secondary" })}
              href={`/app/${tenant}/evidence/legal/consents`}
            >
              Reset
            </Link>
          </div>
        </AppCard>
      </form>

      <AppTable>
        <AppTableHead>
          <tr>
            <th className="p-3 text-left">Time</th>
            <th className="p-3 text-left">Decision</th>
            <th className="p-3 text-left">Categories</th>
            <th className="p-3 text-left">Actor</th>
            <th className="p-3 text-left">IP</th>
            <th className="p-3 text-left">Source</th>
            <th className="p-3 text-left">Path</th>
          </tr>
        </AppTableHead>
        <tbody>
          {events.map((e) => {
            const m: any = e.metaJson ?? {};
            const cats = m.categories ?? {};
            return (
              <AppTableRow key={e.id}>
                <td className="p-3 whitespace-nowrap text-xs text-muted-foreground">
                  {new Date(e.createdAt).toLocaleString()}
                </td>
                <td className="p-3 text-sm">
                  <div className="font-medium">{label(e.action)}</div>
                  <div className="font-mono text-[11px] text-muted-foreground">{e.action}</div>
                </td>
                <td className="p-3 text-sm">
                  <div className="text-sm">
                    necessary ✓ · analytics {cats.analytics ? "✓" : "—"} · marketing {cats.marketing ? "✓" : "—"}
                  </div>
                  <div className="font-mono text-[11px] text-muted-foreground">state={m.state ?? "—"}</div>
                </td>
                <td className="p-3 text-sm">
                  {e.actor ? (
                    <>
                      <div className="text-sm">{e.actor.name ?? e.actor.email}</div>
                      <div className="font-mono text-[11px] text-muted-foreground">{e.actor.id}</div>
                    </>
                  ) : (
                    <>
                      <div className="text-sm">—</div>
                      <div className="font-mono text-[11px] text-muted-foreground">{m.scope ?? "PUBLIC"}</div>
                    </>
                  )}
                </td>
                <td className="p-3 whitespace-nowrap font-mono text-xs text-muted-foreground">{e.ip ?? "—"}</td>
                <td className="p-3 text-sm">
                  <div className="text-sm">{m.source ?? "—"}</div>
                  <div className="font-mono text-[11px] text-muted-foreground">{m.scope ?? "PUBLIC"}</div>
                </td>
                <td className="p-3 text-sm">
                  <div className="truncate">{m.path ?? "—"}</div>
                  <div className="truncate font-mono text-[11px] text-muted-foreground">
                    ref={m.referrer ? String(m.referrer).slice(0, 48) : "—"}
                  </div>
                </td>
              </AppTableRow>
            );
          })}

          {events.length === 0 && (
            <tr>
              <td className="p-4 text-sm text-muted-foreground" colSpan={7}>
                No consent events yet. Trigger the banner on /t/{tenant} or the marketing site, then refresh.
              </td>
            </tr>
          )}
        </tbody>
      </AppTable>
    </main>
  );
}
