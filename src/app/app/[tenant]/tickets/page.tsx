import Link from "next/link";
import { prisma } from "@/lib/db";
import { canManageTickets, requireTenantContextPage } from "@/lib/tenant-auth";
import { TicketPriority, TicketStatus, TicketType } from "@prisma/client";
import EmptyState from "@/components/app/EmptyState";
import { Badge } from "@/components/ui/badge";
import { AppCard } from "@/components/app-ui/AppCard";
import { appButtonClassName } from "@/components/app-ui/AppButton";
import { AppInput } from "@/components/app-ui/AppInput";
import { AppTable, AppTableHead, AppTableRow } from "@/components/app-ui/AppTable";
import ModuleLocked from "@/components/app/ModuleLocked";

const PAGE_SIZE = 20;

function asEnum<T extends string>(value: string | undefined, allowed: readonly T[]): T | undefined {
  if (!value) return undefined;
  return (allowed as readonly string[]).includes(value) ? (value as T) : undefined;
}

type SortDir = "asc" | "desc";
type SortField = "title" | "type" | "status" | "priority" | "createdAt" | "updatedAt";

function parseSort(raw: string | undefined): Array<{ field: SortField; dir: SortDir }> {
  if (!raw) return [];
  const parts = raw
    .split(",")
    .map((p) => p.trim())
    .filter(Boolean);

  const out: Array<{ field: SortField; dir: SortDir }> = [];
  const allowed: SortField[] = ["title", "type", "status", "priority", "createdAt", "updatedAt"];

  for (const part of parts) {
    const [f, d] = part.split(":");
    const field = f as SortField;
    const dir = (d as SortDir) || "asc";
    if (!allowed.includes(field)) continue;
    if (dir !== "asc" && dir !== "desc") continue;
    if (out.find((x) => x.field === field)) continue;
    out.push({ field, dir });
    if (out.length >= 3) break;
  }

  return out;
}

function sortToString(sort: Array<{ field: SortField; dir: SortDir }>) {
  return sort.map((s) => `${s.field}:${s.dir}`).join(",");
}

function toggleSort(sort: Array<{ field: SortField; dir: SortDir }>, field: SortField) {
  const existing = sort.find((s) => s.field === field);
  const nextDir: SortDir = existing ? (existing.dir === "asc" ? "desc" : "asc") : "asc";
  const next = [{ field, dir: nextDir }, ...sort.filter((s) => s.field !== field)];
  return next.slice(0, 3);
}

function sortIndicator(sort: Array<{ field: SortField; dir: SortDir }>, field: SortField) {
  const i = sort.findIndex((s) => s.field === field);
  if (i === -1) return "";
  const d = sort[i].dir === "asc" ? "▲" : "▼";
  const rank = sort.length > 1 ? `${i + 1}` : "";
  return ` ${d}${rank}`;
}

export default async function TicketsPage({
  params,
  searchParams,
}: {
  params: Promise<{ tenant: string }>;
  searchParams?: Promise<Record<string, string | string[] | undefined>>;
}) {
  const { tenant } = await params;
  const sp = (await searchParams) ?? {};

  const ctx = await requireTenantContextPage(tenant);

  const ticketingEnabled = !!ctx.features.tickets;
  const intakeEnabled = !!(ctx.features as any).intake;
  const intakeOnly = intakeEnabled && !ticketingEnabled;

  // Plan gate: allow either full ticketing or Intake-only (LEADs)
  if (!ticketingEnabled && !intakeEnabled) {
    return <ModuleLocked tenant={tenant} module="tickets" />;
  }

  const isManager = canManageTickets(ctx.role);

  const qRaw = Array.isArray(sp.q) ? sp.q[0] : sp.q;
  const q = (qRaw ?? "").trim();

  const status = asEnum(
    Array.isArray(sp.status) ? sp.status[0] : sp.status,
    ["OPEN", "IN_PROGRESS", "WAITING_CLIENT", "RESOLVED", "CLOSED"] as const
  ) as TicketStatus | undefined;

  const priority = asEnum(
    Array.isArray(sp.priority) ? sp.priority[0] : sp.priority,
    ["LOW", "MEDIUM", "HIGH", "URGENT"] as const
  ) as TicketPriority | undefined;

  const type = asEnum(
    Array.isArray(sp.type) ? sp.type[0] : sp.type,
    ["LEAD", "CHANGE_REQUEST", "INCIDENT", "LEGAL", "SEO"] as const
  ) as TicketType | undefined;

  // If tenant is Intake-only, force LEAD view regardless of query params.
  const effectiveType: TicketType | undefined = intakeOnly ? "LEAD" : type;

  const sortRaw = Array.isArray(sp.sort) ? sp.sort[0] : sp.sort;
  const sort = parseSort(sortRaw);

  const pageRaw = Array.isArray(sp.page) ? sp.page[0] : sp.page;
  const page = Math.max(1, Number(pageRaw ?? 1) || 1);

  const baseWhere = isManager
    ? { tenantId: ctx.tenantId }
    : { tenantId: ctx.tenantId, createdById: ctx.user.id };

  const where: any = {
    ...baseWhere,
    ...(status ? { status } : {}),
    ...(priority ? { priority } : {}),
    ...(effectiveType ? { type: effectiveType } : {}),
    ...(q
      ? {
          OR: [
            { title: { contains: q, mode: "insensitive" as const } },
            { description: { contains: q, mode: "insensitive" as const } },
          ],
        }
      : {}),
  };

  const whereForStatus: any = { ...where };
  delete whereForStatus.status;

  // ✅ IMPORTANT: ordering fixed (leadOpen is count, byStatus is array)
  const [total, tickets, leadOpen, byStatus] = await Promise.all([
    prisma.ticket.count({ where }),
    prisma.ticket.findMany({
      where,
      orderBy: (sort.length ? sort.map((s) => ({ [s.field]: s.dir })) : [{ createdAt: "desc" }]) as any,
      select: {
        id: true,
        title: true,
        type: true,
        status: true,
        priority: true,
        createdAt: true,
        updatedAt: true,
      },
      take: PAGE_SIZE,
      skip: (page - 1) * PAGE_SIZE,
    }),
    prisma.ticket.count({
      where: {
        ...whereForStatus,
        type: "LEAD",
        status: { in: ["OPEN", "IN_PROGRESS", "WAITING_CLIENT"] },
      } as any,
    }),
    prisma.ticket.groupBy({
      by: ["status"],
      _count: { _all: true },
      where: whereForStatus,
    }),
  ]);

  const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE));

  const statusCounts: Record<string, number> = {
    OPEN: 0,
    IN_PROGRESS: 0,
    WAITING_CLIENT: 0,
  };

  // ✅ byStatus is now the groupBy array (no TS error)
  (byStatus ?? []).forEach((r: any) => {
    statusCounts[r.status] = r._count?._all ?? 0;
  });

  const isEmptyDefault = total === 0 && !q && !status && !priority && !type;

  function buildLink(next: Partial<Record<string, string | undefined>>) {
    const u = new URL(`http://local/app/${tenant}/tickets`);
    const nextParams: Record<string, string> = {
      ...(q ? { q } : {}),
      ...(status ? { status } : {}),
      ...(priority ? { priority } : {}),
      ...(effectiveType ? { type: effectiveType } : {}),
      ...(sort.length ? { sort: sortToString(sort) } : {}),
      ...(page ? { page: String(page) } : {}),
    };

    for (const [k, v] of Object.entries(next)) {
      if (!v) delete nextParams[k];
      else nextParams[k] = v;
    }

    Object.entries(nextParams).forEach(([k, v]) => u.searchParams.set(k, v));
    return u.pathname + (u.search ? u.search : "");
  }

  return (
    <main>
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div>
          {intakeOnly ? (
            <h1 className="text-2xl font-semibold">Inbox</h1>
          ) : (
            <h1 className="text-2xl font-semibold">Tickets</h1>
          )}
          <div className="mt-1 text-xs text-muted-foreground">
            {total} total · page {page} of {totalPages}
          </div>
        </div>

        {ticketingEnabled ? (
          <Link className={appButtonClassName({ variant: "primary" })} href={`/app/${tenant}/tickets/new`}>
            New ticket
          </Link>
        ) : null}
      </div>

      <div className="mt-4 grid gap-3 md:grid-cols-4">
        <Link href={buildLink({ type: "LEAD", page: "1" })} className="block">
          <AppCard className="p-4 transition hover:-translate-y-0.5 hover:border-brand/30">
            <div className="text-xs text-muted-foreground">Leads (open)</div>
            <div className="mt-1 text-2xl font-semibold">{leadOpen}</div>
          </AppCard>
        </Link>

        <Link href={buildLink({ status: "OPEN", page: "1" })} className="block">
          <AppCard className="p-4 transition hover:-translate-y-0.5 hover:border-brand/30">
            <div className="text-xs text-muted-foreground">Open</div>
            <div className="mt-1 text-2xl font-semibold">{statusCounts.OPEN}</div>
          </AppCard>
        </Link>

        <Link href={buildLink({ status: "IN_PROGRESS", page: "1" })} className="block">
          <AppCard className="p-4 transition hover:-translate-y-0.5 hover:border-brand/30">
            <div className="text-xs text-muted-foreground">In progress</div>
            <div className="mt-1 text-2xl font-semibold">{statusCounts.IN_PROGRESS}</div>
          </AppCard>
        </Link>

        <Link href={buildLink({ status: "WAITING_CLIENT", page: "1" })} className="block">
          <AppCard className="p-4 transition hover:-translate-y-0.5 hover:border-brand/30">
            <div className="text-xs text-muted-foreground">Waiting client</div>
            <div className="mt-1 text-2xl font-semibold">{statusCounts.WAITING_CLIENT}</div>
          </AppCard>
        </Link>
      </div>

      <form className="mt-4" method="get">
        <AppCard className="grid gap-2 p-3 md:grid-cols-5">
          <AppInput name="q" placeholder="Search title/description…" defaultValue={q} className="md:col-span-2" />

          {!intakeOnly ? (
            <select
              className="w-full rounded-xl border border-border bg-bg2/50 px-3 py-2 text-sm text-foreground backdrop-blur transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand/30 focus-visible:border-brand2"
              name="type"
              defaultValue={effectiveType ?? ""}
            >
              <option value="">All types</option>
              <option value="LEAD">LEAD</option>
              <option value="CHANGE_REQUEST">CHANGE_REQUEST</option>
              <option value="INCIDENT">INCIDENT</option>
              <option value="LEGAL">LEGAL</option>
              <option value="SEO">SEO</option>
            </select>
          ) : (
            <div className="rounded-xl border bg-bg2/40 px-3 py-2 text-sm">
              Showing: <span className="font-mono">LEAD</span>
            </div>
          )}

          <select
            className="w-full rounded-xl border border-border bg-bg2/50 px-3 py-2 text-sm text-foreground backdrop-blur transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand/30 focus-visible:border-brand2"
            name="status"
            defaultValue={status ?? ""}
          >
            <option value="">All statuses</option>
            <option value="OPEN">OPEN</option>
            <option value="IN_PROGRESS">IN_PROGRESS</option>
            <option value="WAITING_CLIENT">WAITING_CLIENT</option>
            <option value="RESOLVED">RESOLVED</option>
            <option value="CLOSED">CLOSED</option>
          </select>

          <select
            className="w-full rounded-xl border border-border bg-bg2/50 px-3 py-2 text-sm text-foreground backdrop-blur transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand/30 focus-visible:border-brand2"
            name="priority"
            defaultValue={priority ?? ""}
          >
            <option value="">All priorities</option>
            <option value="LOW">LOW</option>
            <option value="MEDIUM">MEDIUM</option>
            <option value="HIGH">HIGH</option>
            <option value="URGENT">URGENT</option>
          </select>

          <div className="md:col-span-5 flex flex-wrap items-center gap-2">
            <button className={appButtonClassName({ variant: "primary" })} type="submit">
              Apply
            </button>
            <Link className={appButtonClassName({ variant: "secondary" })} href={`/app/${tenant}/tickets`}>
              Reset
            </Link>
          </div>
        </AppCard>
      </form>

      {isEmptyDefault ? (
        <div className="mt-4">
          <EmptyState
            title="No tickets yet"
            description="Create your first ticket to track changes, incidents, SEO or legal requests for this tenant."
            actionLabel="Create ticket"
            actionHref={`/app/${tenant}/tickets/new`}
          />
        </div>
      ) : (
        <>
          <AppTable className="mt-4">
            <AppTableHead>
              <tr>
                <th className="p-3 text-left">
                  <Link className="hover:underline" href={buildLink({ sort: sortToString(toggleSort(sort, "title")) })}>
                    Title{sortIndicator(sort, "title")}
                  </Link>
                </th>
                <th className="p-3 text-left">
                  <Link className="hover:underline" href={buildLink({ sort: sortToString(toggleSort(sort, "type")) })}>
                    Type{sortIndicator(sort, "type")}
                  </Link>
                </th>
                <th className="p-3 text-left">
                  <Link className="hover:underline" href={buildLink({ sort: sortToString(toggleSort(sort, "status")) })}>
                    Status{sortIndicator(sort, "status")}
                  </Link>
                </th>
                <th className="p-3 text-left">
                  <Link className="hover:underline" href={buildLink({ sort: sortToString(toggleSort(sort, "priority")) })}>
                    Priority{sortIndicator(sort, "priority")}
                  </Link>
                </th>
                <th className="p-3 text-left">
                  <Link className="hover:underline" href={buildLink({ sort: sortToString(toggleSort(sort, "createdAt")) })}>
                    Created{sortIndicator(sort, "createdAt")}
                  </Link>
                </th>
                <th className="p-3 text-left">
                  <Link className="hover:underline" href={buildLink({ sort: sortToString(toggleSort(sort, "updatedAt")) })}>
                    Updated{sortIndicator(sort, "updatedAt")}
                  </Link>
                </th>
              </tr>
            </AppTableHead>

            <tbody>
              {tickets.map((t) => (
                <AppTableRow key={t.id}>
                  <td className="p-3">
                    <Link className="underline" href={`/app/${tenant}/tickets/${t.id}`}>
                      {t.title}
                    </Link>
                  </td>
                  <td className="p-3">
                    <Badge variant="outline" className="font-mono">
                      {t.type}
                    </Badge>
                  </td>
                  <td className="p-3">
                    <Badge
                      className="font-mono"
                      variant={
                        t.status === "RESOLVED" || t.status === "CLOSED"
                          ? "success"
                          : t.status === "WAITING_CLIENT"
                          ? "warning"
                          : "muted"
                      }
                    >
                      {t.status}
                    </Badge>
                  </td>
                  <td className="p-3">
                    <Badge
                      className="font-mono"
                      variant={
                        t.priority === "URGENT" || t.priority === "HIGH"
                          ? "danger"
                          : t.priority === "MEDIUM"
                          ? "warning"
                          : "muted"
                      }
                    >
                      {t.priority}
                    </Badge>
                  </td>
                  <td className="p-3">{new Date(t.createdAt).toLocaleString()}</td>
                  <td className="p-3">{new Date(t.updatedAt).toLocaleString()}</td>
                </AppTableRow>
              ))}

              {tickets.length === 0 && (
                <tr>
                  <td className="p-6 text-center text-sm text-muted-foreground" colSpan={6}>
                    No tickets found for the current filters.
                  </td>
                </tr>
              )}
            </tbody>
          </AppTable>

          <div className="mt-4 flex items-center justify-between">
            <Link
              className={appButtonClassName({
                variant: "secondary",
                className: page <= 1 ? "pointer-events-none opacity-50" : "",
              })}
              href={buildLink({ page: String(Math.max(1, page - 1)) })}
            >
              ← Prev
            </Link>

            <div className="text-xs text-muted-foreground">
              {total === 0
                ? "Showing 0 of 0"
                : `Showing ${(page - 1) * PAGE_SIZE + 1}–${Math.min(page * PAGE_SIZE, total)} of ${total}`}
            </div>

            <Link
              className={appButtonClassName({
                variant: "secondary",
                className: page >= totalPages ? "pointer-events-none opacity-50" : "",
              })}
              href={buildLink({ page: String(Math.min(totalPages, page + 1)) })}
            >
              Next →
            </Link>
          </div>
        </>
      )}
    </main>
  );
}
