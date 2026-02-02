import Link from "next/link";
import { requireTenantContextPage } from "@/lib/tenant-auth";
import { AppCard } from "@/components/app-ui/AppCard";

function planLabel(plan?: string) {
  const p = String(plan ?? "").toUpperCase();
  if (p === "CONTROL") return "Starter";
  if (p === "COMPLIANCE") return "Business";
  if (p === "ASSURED") return "Agency";
  return "Custom";
}

function tierDays(plan?: string) {
  const p = String(plan ?? "").toUpperCase();
  if (p === "CONTROL") return 7;
  if (p === "COMPLIANCE") return 90;
  if (p === "ASSURED") return 365;
  return 90;
}

export default async function EvidenceHome({
  params,
}: {
  params: Promise<{ tenant: string }>;
}) {
  const { tenant } = await params;
  const ctx = await requireTenantContextPage(tenant);

  const p = planLabel(ctx.features.plan);
  const days = tierDays(ctx.features.plan);

  return (
    <main className="space-y-6">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold">Evidence</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Your tenant’s proof trail. Legal, security and operational evidence — in one place.
          </p>
        </div>

        <div className="rounded-full border bg-bg2/50 px-3 py-1 text-xs font-medium text-muted-foreground">
          Plan: <span className="font-semibold text-foreground">{p}</span>
        </div>
      </div>

      <AppCard className="p-4">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <div className="text-sm font-semibold">Evidence retention</div>
            <div className="mt-1 text-sm text-muted-foreground">
              Your plan keeps a rolling window of <span className="font-semibold text-foreground">{days} days</span> of
              evidence visible in the platform.
            </div>
          </div>
          {String(ctx.features.plan ?? "").toUpperCase() === "CONTROL" ? (
            <Link
              href={`/app/${tenant}/settings?tab=billing`}
              className="inline-flex items-center rounded-xl bg-primary px-4 py-2 text-sm text-primary-foreground transition hover:opacity-90"
            >
              Upgrade to keep 90+ days
            </Link>
          ) : null}
        </div>
      </AppCard>

      <div className="grid gap-3 md:grid-cols-4">
        <Link href={`/app/${tenant}/evidence/legal`} className="block">
          <AppCard className="p-4 transition hover:-translate-y-[1px] hover:shadow-sm">
            <div className="text-xs text-muted-foreground">Legal</div>
            <div className="mt-1 text-lg font-semibold">Consent + docs</div>
            <div className="mt-1 text-sm text-muted-foreground">Cookies, legal texts and proof of acceptance.</div>
          </AppCard>
        </Link>

        <Link href={`/app/${tenant}/evidence/security`} className="block">
          <AppCard className="p-4 transition hover:-translate-y-[1px] hover:shadow-sm">
            <div className="text-xs text-muted-foreground">Security</div>
            <div className="mt-1 text-lg font-semibold">Audit + alerts</div>
            <div className="mt-1 text-sm text-muted-foreground">Who did what, when and from where.</div>
          </AppCard>
        </Link>

        <Link href={`/app/${tenant}/evidence/operations`} className="block">
          <AppCard className="p-4 transition hover:-translate-y-[1px] hover:shadow-sm">
            <div className="text-xs text-muted-foreground">Operations</div>
            <div className="mt-1 text-lg font-semibold">Uptime + incidents</div>
            <div className="mt-1 text-sm text-muted-foreground">Monitoring events and incident workflow.</div>
          </AppCard>
        </Link>

        <Link href={`/app/${tenant}/evidence/bundles`} className="block">
          <AppCard className="p-4 transition hover:-translate-y-[1px] hover:shadow-sm">
            <div className="text-xs text-muted-foreground">Bundles</div>
            <div className="mt-1 text-lg font-semibold">Export proof</div>
            <div className="mt-1 text-sm text-muted-foreground">Generate a bundle ready for auditors and clients.</div>
          </AppCard>
        </Link>


        <Link href={`/app/${tenant}/evidence/packs`} className="block">
          <AppCard className="p-4 transition hover:-translate-y-[1px] hover:shadow-sm">
            <div className="text-xs text-muted-foreground">Packs</div>
            <div className="mt-1 text-lg font-semibold">Monthly deliverables</div>
            <div className="mt-1 text-sm text-muted-foreground">Branded PDFs you can send to clients.</div>
          </AppCard>
        </Link>
      </div>

      <AppCard className="p-4">
        <div className="text-sm font-semibold">How this works</div>
        <ul className="mt-2 list-disc space-y-1 pl-5 text-sm text-muted-foreground">
          <li>Evidence is generated automatically by modules (Legal, Security, Monitoring, Tickets).</li>
          <li>Bundles convert that trail into a shareable export.</li>
          <li>The more evidence you generate, the easier it is to prove control during audits or incidents.</li>
        </ul>
      </AppCard>
    </main>
  );
}
