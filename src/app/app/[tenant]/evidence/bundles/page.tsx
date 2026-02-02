import Link from "next/link";
import { requireTenantContextPage } from "@/lib/tenant-auth";
import { AppCard } from "@/components/app-ui/AppCard";
import BundlesLockedClient from "./BundlesLockedClient";

function tierDays(plan?: string) {
  const p = String(plan ?? "").toUpperCase();
  if (p === "CONTROL") return 7;
  if (p === "COMPLIANCE") return 90;
  if (p === "ASSURED") return 365;
  return 90;
}

function planLabel(plan?: string) {
  const p = String(plan ?? "").toUpperCase();
  if (p === "CONTROL") return "Starter";
  if (p === "COMPLIANCE") return "Business";
  if (p === "ASSURED") return "Agency";
  return "Custom";
}

export default async function EvidenceBundlesPage({
  params,
}: {
  params: Promise<{ tenant: string }>;
}) {
  const { tenant } = await params;
  const ctx = await requireTenantContextPage(tenant);

  const plan = planLabel(ctx.features.plan);
  const days = tierDays(ctx.features.plan);

  // Commercial rule: Starter can view evidence, but export is paywalled.
  const exportLocked = String(ctx.features.plan ?? "").toUpperCase() === "CONTROL";

  return (
    <main className="space-y-6">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold">Evidence Bundles</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Export a shareable bundle: audit, alerts, monitoring and legal history. Designed to be shown to auditors or
            customers.
          </p>
        </div>

        <div className="rounded-full border bg-bg2/50 px-3 py-1 text-xs font-medium text-muted-foreground">
          Plan: <span className="font-semibold text-foreground">{plan}</span> · Range: {days} days
        </div>
      </div>

      {exportLocked ? <BundlesLockedClient tenant={tenant} currentPlanLabel={plan} retentionDays={days} /> : null}

      {!exportLocked ? (
        <div className="grid gap-3 md:grid-cols-3">
          <AppCard className="p-4">
            <div className="text-xs text-muted-foreground">Bundle</div>
            <div className="mt-1 text-lg font-semibold">JSON (manifest + datasets)</div>
            <div className="mt-2 text-sm text-muted-foreground">
              Best for internal processing, archiving and integrations.
            </div>
            <div className="mt-3">
              <a
                href={`/api/app/security/evidence/export?tenant=${encodeURIComponent(tenant)}&days=${days}&format=json&kind=bundle`}
                className="inline-flex items-center rounded-xl bg-primary px-4 py-2 text-sm text-primary-foreground transition hover:opacity-90"
              >
                Download JSON bundle
              </a>
            </div>
          </AppCard>

          <AppCard className="p-4">
            <div className="text-xs text-muted-foreground">Report</div>
            <div className="mt-1 text-lg font-semibold">PDF (shareable evidence summary)</div>
            <div className="mt-2 text-sm text-muted-foreground">
              Executive summary + recent activity. Designed to be shared with clients, auditors or legal teams.
            </div>
            <div className="mt-3">
              <a
                href={`/api/app/security/evidence/export?tenant=${encodeURIComponent(tenant)}&days=${days}&format=pdf&kind=report`}
                className="inline-flex items-center rounded-xl bg-primary px-4 py-2 text-sm text-primary-foreground transition hover:opacity-90"
              >
                Download PDF report
              </a>
            </div>
          </AppCard>

          <AppCard className="p-4">
            <div className="text-xs text-muted-foreground">Audit</div>
            <div className="mt-1 text-lg font-semibold">CSV (actions trail)</div>
            <div className="mt-2 text-sm text-muted-foreground">
              Human-friendly export of audited actions (who/what/when).
            </div>
            <div className="mt-3">
              <a
                href={`/api/app/security/evidence/export?tenant=${encodeURIComponent(tenant)}&days=${days}&format=csv&kind=audit`}
                className="inline-flex items-center rounded-xl border bg-bg2/60 px-4 py-2 text-sm transition hover:bg-bg2/80"
              >
                Download audit CSV
              </a>
            </div>
          </AppCard>

          <AppCard className="p-4">
            <div className="text-xs text-muted-foreground">Alerts</div>
            <div className="mt-1 text-lg font-semibold">CSV (security changes)</div>
            <div className="mt-2 text-sm text-muted-foreground">
              Sensitive changes feed (plan, legal, domain, users). Useful for investigations.
            </div>
            <div className="mt-3">
              <a
                href={`/api/app/security/evidence/export?tenant=${encodeURIComponent(tenant)}&days=${days}&format=csv&kind=alerts`}
                className="inline-flex items-center rounded-xl border bg-bg2/60 px-4 py-2 text-sm transition hover:bg-bg2/80"
              >
                Download alerts CSV
              </a>
            </div>
          </AppCard>


          <AppCard className="p-4">
            <div className="text-xs text-muted-foreground">Packs</div>
            <div className="mt-1 text-lg font-semibold">Monthly Evidence Packs</div>
            <div className="mt-2 text-sm text-muted-foreground">Branded PDFs you can send to clients on a schedule.</div>
            <div className="mt-3">
              <Link href={`/app/${tenant}/evidence/packs`} className="inline-flex items-center rounded-xl border bg-bg2/60 px-4 py-2 text-sm transition hover:bg-bg2/80">
                Configure packs
              </Link>
            </div>
          </AppCard>
        </div>
      ) : null}

      <AppCard className="p-4">
        <div className="text-sm font-semibold">Notes</div>
        <ul className="mt-2 list-disc space-y-1 pl-5 text-sm text-muted-foreground">
          <li>
            Bundles include monitoring checks/events and legal history even if Security add-on is disabled (alerts may be
            empty).
          </li>
          <li>Exports are rate-limited and logged as <span className="font-mono">evidence.export</span>.</li>
        </ul>
      </AppCard>
    </main>
  );
}
