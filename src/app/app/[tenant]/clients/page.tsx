import Link from "next/link";
import { prisma } from "@/lib/db";
import { requireTenantContextPage } from "@/lib/tenant-auth";
import { AppCard } from "@/components/app-ui/AppCard";
import {
  computeAttentionState,
  computeComplianceStatus,
  computeLastActivityAt,
  isAgencyPlan,
  pendingChecksCount,
  resolvedChecksCount,
} from "@/lib/client-compliance";
import ClientsCommandCenter from "./clients-command-center";

export default async function ClientsPage({ params }: { params: Promise<{ tenant: string }> }) {
  const { tenant } = await params;
  const ctx = await requireTenantContextPage(tenant);

  if (!isAgencyPlan(ctx.features.plan)) {
    return (
      <main className="space-y-6">
        <div>
          <h1 className="text-2xl font-semibold">Clients</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Agency mode lets you manage compliance work for multiple clients under your tenant.
          </p>
        </div>

        <AppCard className="p-5">
          <div className="text-sm font-semibold">Agency feature</div>
          <div className="mt-1 text-sm text-muted-foreground">
            Client compliance management is available on the{" "}
            <span className="font-semibold text-foreground">Agency</span> plan.
          </div>
          <div className="mt-4">
            <Link
              href={`/app/${tenant}/settings?tab=billing`}
              className="inline-flex items-center rounded-xl bg-primary px-4 py-2 text-sm text-primary-foreground transition hover:opacity-90"
            >
              Request upgrade
            </Link>
          </div>
        </AppCard>
      </main>
    );
  }

  const rawClients = await prisma.client.findMany({
    where: { tenantId: ctx.tenantId },
    select: {
      id: true,
      name: true,
      createdAt: true,
      checks: {
        select: {
          status: true,
          updatedAt: true,
          createdAt: true,
        },
      },
      evidence: {
        select: {
          createdAt: true,
        },
      },
    },
    orderBy: { createdAt: "desc" },
  });

  const clients = rawClients.map((client) => {
    const status = computeComplianceStatus(client.checks);
    const pending = pendingChecksCount(client.checks);
    const resolved = resolvedChecksCount(client.checks);
    const evidenceCount = client.evidence.length;
    const lastActivityAt = computeLastActivityAt({
      clientCreatedAt: client.createdAt,
      checks: client.checks,
      evidence: client.evidence,
    });
    const attention = computeAttentionState({
      checks: client.checks,
      lastActivityAt,
    });

    return {
      id: client.id,
      name: client.name,
      createdAt: client.createdAt.toISOString(),
      status,
      pending,
      resolved,
      totalChecks: client.checks.length,
      evidenceCount,
      lastActivityAt: lastActivityAt ? lastActivityAt.toISOString() : null,
      attention,
    };
  });

  return <ClientsCommandCenter tenant={tenant} clients={clients} />;
}
