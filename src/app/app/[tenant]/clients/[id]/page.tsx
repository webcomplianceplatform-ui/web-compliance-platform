import type { ReactNode } from "react";
import Link from "next/link";
import { redirect } from "next/navigation";
import { Activity, ArrowLeft, FileCheck2, ListTodo, ShieldCheck } from "lucide-react";
import { prisma } from "@/lib/db";
import { AppCard } from "@/components/app-ui/AppCard";
import { requireTenantContextPage } from "@/lib/tenant-auth";
import {
  computeAttentionState,
  computeComplianceStatus,
  computeLastActivityAt,
  getComplianceStatusSummary,
  isAgencyPlan,
  pendingChecksCount,
  resolvedChecksCount,
} from "@/lib/client-compliance";
import {
  AttentionBadge,
  ComplianceStatusBadge,
  formatDateTime,
  formatRelativeDate,
} from "../client-ui";
import ClientDetailClient from "./client-detail-client";

export default async function ClientDetailPage({
  params,
}: {
  params: Promise<{ tenant: string; id: string }>;
}) {
  const { tenant, id } = await params;
  const ctx = await requireTenantContextPage(tenant);

  if (!isAgencyPlan(ctx.features.plan)) {
    redirect(`/app/${tenant}/clients`);
  }

  const client = await prisma.client.findFirst({
    where: { id, tenantId: ctx.tenantId },
    select: {
      id: true,
      name: true,
      createdAt: true,
      evidence: {
        select: {
          id: true,
          createdAt: true,
        },
      },
      checks: {
        orderBy: { createdAt: "asc" },
        select: {
          id: true,
          title: true,
          status: true,
          createdAt: true,
          updatedAt: true,
          evidence: {
            orderBy: { createdAt: "desc" },
            select: {
              id: true,
              createdAt: true,
              fileName: true,
            },
          },
        },
      },
    },
  });

  if (!client) {
    return <div className="rounded border p-4">Client not found.</div>;
  }

  const status = computeComplianceStatus(client.checks);
  const pending = pendingChecksCount(client.checks);
  const resolved = resolvedChecksCount(client.checks);
  const totalEvidence = client.evidence.length;
  const lastActivityAt = computeLastActivityAt({
    clientCreatedAt: client.createdAt,
    checks: client.checks,
    evidence: client.evidence,
  });
  const attention = computeAttentionState({
    checks: client.checks,
    lastActivityAt,
  });
  const statusSummary = getComplianceStatusSummary(status);
  const checksWithEvidence = client.checks.filter((check) => check.evidence.length > 0).length;
  const completionRate =
    client.checks.length > 0 ? Math.round((resolved / client.checks.length) * 100) : 0;

  return (
    <main className="space-y-6">
      <div className="space-y-3">
        <Link
          className="inline-flex items-center gap-2 text-sm text-muted-foreground transition hover:text-foreground"
          href={`/app/${tenant}/clients`}
        >
          <ArrowLeft className="h-4 w-4" />
          Back to clients
        </Link>

        <AppCard className="overflow-hidden border-border/70 bg-gradient-to-br from-bg1 via-bg1 to-bg2/70 p-6">
          <div className="text-xs font-semibold uppercase tracking-[0.18em] text-muted-foreground">
            Client workspace
          </div>
          <div className="mt-3 flex flex-wrap items-start justify-between gap-4">
            <div>
              <h1 className="text-3xl font-semibold tracking-tight text-foreground">{client.name}</h1>
              <p className="mt-2 max-w-2xl text-sm leading-6 text-muted-foreground">
                Review the starter compliance controls, attach supporting proof, and keep a clear operational record
                ready for agency follow-up and pack generation.
              </p>
            </div>

            <div className="flex flex-wrap items-center gap-2">
              <ComplianceStatusBadge className="text-xs" status={status} />
              <AttentionBadge className="text-xs" label={attention.label} level={attention.level} />
            </div>
          </div>

          <div className="mt-5 flex flex-wrap gap-6 text-sm text-muted-foreground">
            <div>
              Last activity <span className="font-medium text-foreground">{formatRelativeDate(lastActivityAt)}</span>
            </div>
            <div>
              Pending checks <span className="font-medium text-foreground">{pending}</span>
            </div>
            <div>
              Evidence files <span className="font-medium text-foreground">{totalEvidence}</span>
            </div>
          </div>
        </AppCard>
      </div>

      <section className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
        <MetricCard
          label="Overall status"
          value={statusSummary.label}
          hint={statusSummary.description}
          icon={<ShieldCheck className="h-4 w-4" />}
        />
        <MetricCard
          label="Pending checks"
          value={pending}
          hint={`${resolved}/${client.checks.length} reviewed`}
          icon={<ListTodo className="h-4 w-4" />}
        />
        <MetricCard
          label="Evidence files"
          value={totalEvidence}
          hint={`${checksWithEvidence}/${client.checks.length} checks covered`}
          icon={<FileCheck2 className="h-4 w-4" />}
        />
        <MetricCard
          label="Last activity"
          value={formatRelativeDate(lastActivityAt)}
          hint={formatDateTime(lastActivityAt)}
          icon={<Activity className="h-4 w-4" />}
        />
      </section>

      <section className="grid gap-4 xl:grid-cols-[minmax(0,1.4fr)_360px]">
        <AppCard className="border-border/70 p-5">
          <div className="text-xs font-semibold uppercase tracking-[0.18em] text-muted-foreground">Overview</div>
          <div className="mt-1 text-lg font-semibold text-foreground">Checklist coverage</div>
          <div className="mt-2 text-sm text-muted-foreground">
            The starter checklist is grouped into consent and cookies, privacy notice, and forms and data capture so
            the agency team can explain each review decision clearly.
          </div>

          <div className="mt-5">
            <div className="flex items-center justify-between text-sm">
              <span className="text-muted-foreground">Completion</span>
              <span className="font-medium text-foreground">{completionRate}%</span>
            </div>
            <div className="mt-2 h-2 rounded-full bg-bg2">
              <div
                className={`h-2 rounded-full ${
                  status === "GREEN" ? "bg-emerald-500" : status === "RED" ? "bg-red-500" : "bg-amber-500"
                }`}
                style={{ width: `${completionRate}%` }}
              />
            </div>
          </div>
        </AppCard>

        <AppCard className="border-border/70 p-5">
          <div className="text-xs font-semibold uppercase tracking-[0.18em] text-muted-foreground">Evidence</div>
          <div className="mt-1 text-lg font-semibold text-foreground">Proof coverage</div>
          <div className="mt-3 space-y-3 text-sm">
            <div className="flex items-center justify-between">
              <span className="text-muted-foreground">Checks with evidence</span>
              <span className="font-medium text-foreground">
                {checksWithEvidence}/{client.checks.length}
              </span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-muted-foreground">Total evidence files</span>
              <span className="font-medium text-foreground">{totalEvidence}</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-muted-foreground">Client created</span>
              <span className="font-medium text-foreground">{formatDateTime(client.createdAt)}</span>
            </div>
          </div>

          <div className="mt-4 rounded-2xl border border-border/70 bg-bg2/35 p-4 text-sm text-muted-foreground">
            {pending === 0
              ? "All current checklist items are covered."
              : "Pending checklist items should be paired with evidence or a review decision to keep the client record audit-ready."}
          </div>

          <div className="mt-4">
            <Link
              className="inline-flex items-center rounded-xl border border-border/70 px-3 py-2 text-sm font-medium text-foreground transition hover:bg-bg2"
              href={`/app/${tenant}/evidence/packs`}
            >
              Open evidence packs
            </Link>
            <div className="mt-2 text-xs text-muted-foreground">
              Tenant packs now include this client summary and the uploaded proof references linked to each checklist
              item.
            </div>
          </div>
        </AppCard>
      </section>

      <ClientDetailClient
        tenant={tenant}
        clientId={client.id}
        checks={client.checks.map((check) => ({
          id: check.id,
          title: check.title,
          status: check.status,
          createdAt: check.createdAt.toISOString(),
          updatedAt: check.updatedAt.toISOString(),
          evidence: check.evidence.map((item) => ({
            id: item.id,
            createdAt: item.createdAt.toISOString(),
            fileName: item.fileName,
          })),
        }))}
      />
    </main>
  );
}

function MetricCard({
  label,
  value,
  hint,
  icon,
}: {
  label: string;
  value: string | number;
  hint: string;
  icon: ReactNode;
}) {
  return (
    <AppCard className="border-border/70 p-4">
      <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.18em] text-muted-foreground">
        {icon}
        {label}
      </div>
      <div className="mt-3 text-2xl font-semibold text-foreground">{value}</div>
      <div className="mt-1 text-sm text-muted-foreground">{hint}</div>
    </AppCard>
  );
}
