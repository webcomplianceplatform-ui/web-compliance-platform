"use client";

import type { ReactNode } from "react";
import Link from "next/link";
import { useState } from "react";
import {
  AlertTriangle,
  ArrowRight,
  BriefcaseBusiness,
  Clock3,
  FileCheck2,
  ListFilter,
  Search,
  ShieldCheck,
} from "lucide-react";
import { AppCard } from "@/components/app-ui/AppCard";
import { getComplianceStatusSummary } from "@/lib/client-compliance";
import { AttentionBadge, ComplianceStatusBadge, formatDateTime, formatRelativeDate } from "./client-ui";
import CreateClientForm from "./create-client-form";

type ClientRow = {
  id: string;
  name: string;
  createdAt: string;
  status: "GREEN" | "YELLOW" | "RED";
  pending: number;
  resolved: number;
  totalChecks: number;
  evidenceCount: number;
  lastActivityAt: string | null;
  attention: {
    level: "CLEAR" | "FOLLOW_UP" | "DUE" | "AT_RISK";
    label: string;
  };
};

const FILTERS = ["ALL", "GREEN", "YELLOW", "RED"] as const;
const SORTS = [
  { value: "attention", label: "Highest attention" },
  { value: "latest", label: "Latest activity" },
  { value: "name", label: "Client name" },
] as const;

export default function ClientsCommandCenter({
  tenant,
  clients,
}: {
  tenant: string;
  clients: ClientRow[];
}) {
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<(typeof FILTERS)[number]>("ALL");
  const [sortBy, setSortBy] = useState<(typeof SORTS)[number]["value"]>("attention");

  const attentionWeight = {
    AT_RISK: 3,
    DUE: 2,
    FOLLOW_UP: 1,
    CLEAR: 0,
  } as const;

  const normalizedSearch = search.trim().toLowerCase();
  const filteredClients = clients.filter((client) => {
    const matchesSearch = normalizedSearch.length === 0 || client.name.toLowerCase().includes(normalizedSearch);
    const matchesStatus = statusFilter === "ALL" || client.status === statusFilter;
    return matchesSearch && matchesStatus;
  });

  const sortedClients = [...filteredClients].sort((a, b) => {
    if (sortBy === "name") {
      return a.name.localeCompare(b.name);
    }

    if (sortBy === "latest") {
      return (b.lastActivityAt ? new Date(b.lastActivityAt).getTime() : 0) - (a.lastActivityAt ? new Date(a.lastActivityAt).getTime() : 0);
    }

    const weightDiff = attentionWeight[b.attention.level] - attentionWeight[a.attention.level];
    if (weightDiff !== 0) return weightDiff;
    if (b.pending !== a.pending) return b.pending - a.pending;
    return (a.lastActivityAt ? new Date(a.lastActivityAt).getTime() : 0) - (b.lastActivityAt ? new Date(b.lastActivityAt).getTime() : 0);
  });

  const attentionClients = sortedClients.filter((client) => client.attention.level !== "CLEAR").slice(0, 6);
  const urgentClients = sortedClients.filter(
    (client) => client.attention.level === "AT_RISK" || client.attention.level === "DUE"
  );
  const totalPendingChecks = clients.reduce((sum, client) => sum + client.pending, 0);
  const totalEvidence = clients.reduce((sum, client) => sum + client.evidenceCount, 0);
  const clientsNeedingAttention = clients.filter((client) => client.attention.level !== "CLEAR").length;
  const dueClients = clients.filter((client) => client.attention.level === "DUE" || client.attention.level === "AT_RISK").length;
  const latestActivityClient = [...clients]
    .filter((client) => !!client.lastActivityAt)
    .sort((a, b) => (b.lastActivityAt ? new Date(b.lastActivityAt).getTime() : 0) - (a.lastActivityAt ? new Date(a.lastActivityAt).getTime() : 0))[0];

  if (clients.length === 0) {
    return (
      <main className="space-y-6">
        <section className="grid gap-4 xl:grid-cols-[minmax(0,1.55fr)_minmax(360px,0.95fr)]">
          <AppCard className="overflow-hidden border-border/70 bg-gradient-to-br from-bg1 via-bg1 to-bg2/70 p-6">
            <div className="text-xs font-semibold uppercase tracking-[0.2em] text-muted-foreground">
              Agency command center
            </div>
            <div className="mt-3 max-w-2xl">
              <h1 className="text-3xl font-semibold tracking-tight text-foreground">Launch your first client workflow</h1>
              <p className="mt-3 text-sm leading-6 text-muted-foreground">
                Create a client workspace, review the starter compliance checks, attach supporting proof, and turn the
                result into a client-ready evidence pack.
              </p>
            </div>

            <div className="mt-6 grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
              <EmptyStateStep
                title="1. Create client"
                body="Open a dedicated workspace for each agency client."
              />
              <EmptyStateStep
                title="2. Review checklist"
                body="Work through consent and cookies, privacy notice, and form capture controls."
              />
              <EmptyStateStep
                title="3. Attach proof"
                body="Attach screenshots, exports, or notes so the final pack is easy to explain."
              />
              <EmptyStateStep
                title="4. Generate pack"
                body="Export a client-ready evidence pack once the checklist and proof are in place."
              />
            </div>
          </AppCard>

          <CreateClientForm tenant={tenant} />
        </section>
      </main>
    );
  }

  return (
    <main className="space-y-6">
      <section className="grid gap-4 xl:grid-cols-[minmax(0,1.55fr)_minmax(360px,0.95fr)]">
        <AppCard className="overflow-hidden border-border/70 bg-gradient-to-br from-bg1 via-bg1 to-bg2/70 p-6">
          <div className="text-xs font-semibold uppercase tracking-[0.2em] text-muted-foreground">
            Agency command center
          </div>
          <div className="mt-3 max-w-2xl">
            <h1 className="text-3xl font-semibold tracking-tight text-foreground">Client compliance</h1>
            <p className="mt-3 text-sm leading-6 text-muted-foreground">
              Run client compliance work from one place: review consent and privacy controls, collect proof, and
              prepare the evidence pack handoff.
            </p>
          </div>

          <div className="mt-4">
            <Link
              className="inline-flex items-center rounded-xl border border-border/70 bg-white/60 px-3 py-2 text-sm font-medium text-foreground transition hover:bg-white"
              href={`/app/${tenant}/evidence/packs`}
            >
              Open evidence packs
            </Link>
          </div>

          <div className="mt-6 grid gap-3 sm:grid-cols-3">
            <SummaryTile
              icon={<ShieldCheck className="h-4 w-4" />}
              label="Coverage"
              value={clients.length}
              hint="Client workspaces under active review."
            />
            <SummaryTile
              icon={<AlertTriangle className="h-4 w-4" />}
              label="Attention"
              value={clientsNeedingAttention}
              hint="Clients with pending work or follow-up due."
            />
            <SummaryTile
              icon={<FileCheck2 className="h-4 w-4" />}
              label="Evidence"
              value={totalEvidence}
              hint="Proof files attached across client records."
            />
          </div>
        </AppCard>

        <CreateClientForm tenant={tenant} />
      </section>

      <section className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
        <MetricCard
          label="Total clients"
          value={clients.length}
          hint="Active client workspaces"
          icon={<BriefcaseBusiness className="h-4 w-4" />}
        />
        <MetricCard
          label="Pending checks"
          value={totalPendingChecks}
          hint="Checklist items still open"
          icon={<ShieldCheck className="h-4 w-4" />}
        />
        <MetricCard
          label="Attention now"
          value={clientsNeedingAttention}
          hint={dueClients > 0 ? `${dueClients} require follow-up soon` : "No overdue follow-up"}
          icon={<AlertTriangle className="h-4 w-4" />}
        />
        <MetricCard
          label="Latest activity"
          value={latestActivityClient?.lastActivityAt ? formatRelativeDate(latestActivityClient.lastActivityAt) : "No activity"}
          hint={latestActivityClient ? latestActivityClient.name : "No client activity yet"}
          icon={<Clock3 className="h-4 w-4" />}
        />
      </section>

      <AppCard className="border-border/70 p-4">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <div className="text-xs font-semibold uppercase tracking-[0.18em] text-muted-foreground">
              Register controls
            </div>
            <div className="mt-1 text-sm text-muted-foreground">
              Search, filter, and sort the client register to focus the next compliance follow-up.
            </div>
          </div>

          <div className="rounded-full border border-border/70 bg-bg2/35 px-3 py-1 text-xs text-muted-foreground">
            Showing <span className="font-medium text-foreground">{sortedClients.length}</span> of{" "}
            <span className="font-medium text-foreground">{clients.length}</span>
          </div>
        </div>

        <div className="mt-4 grid gap-3 xl:grid-cols-[minmax(0,1fr)_auto_auto]">
          <label className="flex items-center gap-2 rounded-xl border border-border/70 bg-white/70 px-3 py-2.5">
            <Search className="h-4 w-4 text-muted-foreground" />
            <input
              className="w-full bg-transparent text-sm outline-none"
              placeholder="Search client name"
              value={search}
              onChange={(event) => setSearch(event.target.value)}
            />
          </label>

          <div className="flex flex-wrap gap-2">
            {FILTERS.map((filter) => (
              <button
                key={filter}
                className={`rounded-xl border px-3 py-2 text-sm transition ${
                  statusFilter === filter
                    ? "border-foreground/10 bg-foreground text-background"
                    : "border-border/70 bg-bg1 hover:bg-bg2"
                }`}
                onClick={() => setStatusFilter(filter)}
                type="button"
              >
                {filter === "ALL" ? "All status" : filter}
              </button>
            ))}
          </div>

          <label className="flex items-center gap-2 rounded-xl border border-border/70 bg-white/70 px-3 py-2.5 text-sm">
            <ListFilter className="h-4 w-4 text-muted-foreground" />
            <select
              className="bg-transparent outline-none"
              value={sortBy}
              onChange={(event) => setSortBy(event.target.value as (typeof SORTS)[number]["value"])}
            >
              {SORTS.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
          </label>
        </div>
      </AppCard>

      {urgentClients.length > 0 ? (
        <AppCard className="border-border/70 p-4">
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div>
              <div className="text-xs font-semibold uppercase tracking-[0.18em] text-muted-foreground">
                Most urgent today
              </div>
              <div className="mt-1 text-lg font-semibold text-foreground">Start here</div>
              <div className="mt-1 text-sm text-muted-foreground">
                These client records have the strongest follow-up signal and stay pinned near the top of the register.
              </div>
            </div>
            <div className="rounded-full border border-border/70 bg-bg2/35 px-3 py-1 text-xs text-muted-foreground">
              {urgentClients.length} urgent client{urgentClients.length === 1 ? "" : "s"}
            </div>
          </div>

          <div className="mt-4 grid gap-3 xl:grid-cols-3">
            {urgentClients.slice(0, 3).map((client) => {
              const nextActions = getNextActions(client);
              return (
                <div key={client.id} className="rounded-2xl border border-amber-200 bg-amber-50/70 p-4">
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <div className="font-medium text-foreground">{client.name}</div>
                      <div className="mt-1 text-xs text-muted-foreground">
                        Last activity {formatRelativeDate(client.lastActivityAt)}
                      </div>
                    </div>
                    <AttentionBadge label={client.attention.label} level={client.attention.level} />
                  </div>

                  <div className="mt-3 flex flex-wrap gap-2">
                    {nextActions.map((action) => (
                      <span
                        key={action}
                        className="rounded-full border border-amber-200 bg-white px-2.5 py-1 text-xs text-amber-800"
                      >
                        {action}
                      </span>
                    ))}
                  </div>

                  <div className="mt-4">
                    <Link
                      className="inline-flex items-center rounded-xl border border-amber-300 bg-white px-3 py-2 text-sm font-medium text-foreground transition hover:bg-amber-100/60"
                      href={`/app/${tenant}/clients/${client.id}`}
                    >
                      Open client
                    </Link>
                  </div>
                </div>
              );
            })}
          </div>
        </AppCard>
      ) : null}

      <section className="grid gap-4 xl:grid-cols-[minmax(0,1.25fr)_360px]">
        <AppCard className="overflow-hidden border-border/70">
          <div className="border-b border-border/70 px-5 py-4">
            <div className="text-xs font-semibold uppercase tracking-[0.18em] text-muted-foreground">
              Client register
            </div>
            <div className="mt-1 text-lg font-semibold text-foreground">Operational status by client</div>
            <div className="mt-1 text-sm text-muted-foreground">
              Review checklist health, proof coverage, and last movement from one table.
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="min-w-full text-sm">
              <thead className="bg-bg2/45 text-xs uppercase tracking-[0.14em] text-muted-foreground">
                <tr>
                  <th className="px-5 py-3 text-left font-medium">Client</th>
                  <th className="px-5 py-3 text-left font-medium">Status</th>
                  <th className="px-5 py-3 text-left font-medium">Checklist</th>
                  <th className="px-5 py-3 text-left font-medium">Evidence</th>
                  <th className="px-5 py-3 text-left font-medium">Next actions</th>
                  <th className="px-5 py-3 text-left font-medium">Last activity</th>
                  <th className="px-5 py-3 text-left font-medium">Attention</th>
                </tr>
              </thead>
              <tbody>
                {sortedClients.length === 0 ? (
                  <tr>
                    <td className="px-5 py-8" colSpan={7}>
                      <div className="rounded-2xl border border-dashed border-border/70 bg-bg2/20 p-5 text-sm text-muted-foreground">
                        No clients match the current filters. Try a different status, clear the search, or switch back
                        to the full register.
                      </div>
                    </td>
                  </tr>
                ) : (
                  sortedClients.map((client) => (
                    <tr
                      key={client.id}
                      className={`border-t border-border/60 transition hover:bg-bg2/20 ${
                        client.attention.level === "AT_RISK"
                          ? "bg-red-50/40"
                          : client.attention.level === "DUE"
                            ? "bg-amber-50/40"
                            : ""
                      }`}
                    >
                      <td className="px-5 py-4 align-top">
                        <Link
                          className="group inline-flex items-center gap-2 font-medium text-foreground"
                          href={`/app/${tenant}/clients/${client.id}`}
                        >
                          <span>{client.name}</span>
                          <ArrowRight className="h-4 w-4 text-muted-foreground transition group-hover:translate-x-0.5" />
                        </Link>
                        <div className="mt-1 text-xs text-muted-foreground">
                          Created {formatDateTime(client.createdAt)}
                        </div>
                      </td>
                      <td className="px-5 py-4 align-top">
                        <ComplianceStatusBadge status={client.status} />
                        <div className="mt-2 text-xs text-muted-foreground">
                          {getComplianceStatusSummary(client.status).label}
                        </div>
                      </td>
                      <td className="px-5 py-4 align-top">
                        <div className="font-medium text-foreground">
                          {client.resolved}/{client.totalChecks} reviewed
                        </div>
                        <div className="mt-1 text-xs text-muted-foreground">
                          {client.pending} pending item{client.pending === 1 ? "" : "s"}
                        </div>
                      </td>
                      <td className="px-5 py-4 align-top">
                        <div className="font-medium text-foreground">{client.evidenceCount}</div>
                        <div className="mt-1 text-xs text-muted-foreground">
                          Evidence file{client.evidenceCount === 1 ? "" : "s"} attached
                        </div>
                      </td>
                      <td className="px-5 py-4 align-top">
                        <div className="flex max-w-xs flex-wrap gap-2">
                          {getNextActions(client).map((action) => (
                            <span
                              key={action}
                              className="rounded-full border border-border/70 bg-white/80 px-2.5 py-1 text-xs text-muted-foreground"
                            >
                              {action}
                            </span>
                          ))}
                        </div>
                      </td>
                      <td className="px-5 py-4 align-top">
                        <div className="font-medium text-foreground">{formatRelativeDate(client.lastActivityAt)}</div>
                        <div className="mt-1 text-xs text-muted-foreground">{formatDateTime(client.lastActivityAt)}</div>
                      </td>
                      <td className="px-5 py-4 align-top">
                        <AttentionBadge label={client.attention.label} level={client.attention.level} />
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </AppCard>

        <AppCard className="overflow-hidden border-border/70">
          <div className="border-b border-border/70 px-5 py-4">
            <div className="text-xs font-semibold uppercase tracking-[0.18em] text-muted-foreground">
              Attention needed
            </div>
            <div className="mt-1 text-lg font-semibold text-foreground">Action queue</div>
            <div className="mt-1 text-sm text-muted-foreground">
              Start with the clients that carry open checklist work and stale activity.
            </div>
          </div>

          <div className="space-y-3 p-5">
            {attentionClients.length === 0 ? (
              <div className="rounded-2xl border border-emerald-200 bg-emerald-50 p-4 text-sm text-emerald-700">
                No immediate follow-up is required for the current view.
              </div>
            ) : (
              attentionClients.map((client) => {
                const nextActions = getNextActions(client);
                return (
                  <div
                    key={client.id}
                    className="rounded-2xl border border-border/70 bg-bg1/90 p-4"
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <div className="font-medium text-foreground">{client.name}</div>
                        <div className="mt-1 text-xs text-muted-foreground">
                          {client.pending} pending | {client.evidenceCount} evidence file
                          {client.evidenceCount === 1 ? "" : "s"} | last activity {formatRelativeDate(client.lastActivityAt)}
                        </div>
                      </div>
                      <AttentionBadge label={client.attention.label} level={client.attention.level} />
                    </div>

                    <div className="mt-3 flex flex-wrap gap-2">
                      {nextActions.map((action) => (
                        <span
                          key={action}
                          className="rounded-full border border-border/70 bg-white/80 px-2.5 py-1 text-xs text-muted-foreground"
                        >
                          {action}
                        </span>
                      ))}
                    </div>

                    <div className="mt-3 flex items-center justify-end gap-3">
                      <Link
                        className="inline-flex items-center rounded-xl border border-border/70 px-3 py-2 text-sm font-medium text-foreground transition hover:bg-bg2"
                        href={`/app/${tenant}/clients/${client.id}`}
                      >
                        Open client
                      </Link>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </AppCard>
      </section>
    </main>
  );
}

function SummaryTile({
  icon,
  label,
  value,
  hint,
}: {
  icon: ReactNode;
  label: string;
  value: string | number;
  hint: string;
}) {
  return (
    <div className="rounded-2xl border border-border/60 bg-white/55 p-4">
      <div className="flex items-center gap-2 text-xs font-medium uppercase tracking-[0.16em] text-muted-foreground">
        {icon}
        {label}
      </div>
      <div className="mt-3 text-2xl font-semibold text-foreground">{value}</div>
      <div className="mt-1 text-sm text-muted-foreground">{hint}</div>
    </div>
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

function EmptyStateStep({ title, body }: { title: string; body: string }) {
  return (
    <div className="rounded-2xl border border-border/60 bg-white/55 p-4">
      <div className="text-sm font-semibold text-foreground">{title}</div>
      <div className="mt-2 text-sm text-muted-foreground">{body}</div>
    </div>
  );
}

function getNextActions(client: ClientRow) {
  const actions: string[] = [];

  if (client.pending > 0) {
    actions.push(`${client.pending} control${client.pending === 1 ? "" : "s"} need review`);
  }

  if (client.evidenceCount === 0) {
    actions.push("No evidence uploaded yet");
  }

  if (client.attention.level === "DUE" || client.attention.level === "AT_RISK") {
    actions.push("Follow up now");
  }

  if (actions.length === 0) {
    actions.push("Ready for pack review");
  }

  return actions.slice(0, 3);
}
