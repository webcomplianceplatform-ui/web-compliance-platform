import Link from "next/link";
import { prisma } from "@/lib/db";
import { canManageTickets, requireTenantContextPage } from "@/lib/tenant-auth";
import { TicketPriority, TicketStatus, TicketType } from "@prisma/client";
import EmptyState from "@/components/app/EmptyState";
import { Badge } from "@/components/ui/badge";

const PAGE_SIZE = 20;

function asEnum<T extends string>(value: string | undefined, allowed: readonly T[]): T | undefined {
  if (!value) return undefined;
  return (allowed as readonly string[]).includes(value) ? (value as T) : undefined;
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
    ["CHANGE_REQUEST", "INCIDENT", "LEGAL", "SEO"] as const
  ) as TicketType | undefined;

  const pageRaw = Array.isArray(sp.page) ? sp.page[0] : sp.page;
  const page = Math.max(1, Number(pageRaw ?? 1) || 1);

  const baseWhere = isManager
    ? { tenantId: ctx.tenantId }
    : { tenantId: ctx.tenantId, createdById: ctx.user.id };

  const where = {
    ...baseWhere,
    ...(status ? { status } : {}),
    ...(priority ? { priority } : {}),
    ...(type ? { type } : {}),
    ...(q
      ? {
          OR: [
            { title: { contains: q, mode: "insensitive" as const } },
            { description: { contains: q, mode: "insensitive" as const } },
          ],
        }
      : {}),
  };

  const [total, tickets] = await Promise.all([
    prisma.ticket.count({ where }),
    prisma.ticket.findMany({
      where,
      orderBy: { createdAt: "desc" },
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
  ]);

  const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE));

  const isEmptyDefault = total === 0 && !q && !status && !priority && !type;

  function buildLink(next: Partial<Record<string, string | undefined>>) {
    const u = new URL(`http://local/app/${tenant}/tickets`);
    const nextParams: Record<string, string> = {
      ...(q ? { q } : {}),
      ...(status ? { status } : {}),
      ...(priority ? { priority } : {}),
      ...(type ? { type } : {}),
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
          <h1 className="text-2xl font-semibold">Tickets</h1>
          <div className="mt-1 text-xs text-muted-foreground">
            {total} total · page {page} of {totalPages}
          </div>
        </div>

        <Link className="rounded border px-3 py-1 text-sm" href={`/app/${tenant}/tickets/new`}>
          New ticket
        </Link>
      </div>

      <form className="mt-4 grid gap-2 rounded border p-3 md:grid-cols-5" method="get">
        <input
          className="rounded border p-2 text-sm md:col-span-2"
          name="q"
          placeholder="Search title/description…"
          defaultValue={q}
        />

        <select className="rounded border p-2 text-sm" name="type" defaultValue={type ?? ""}>
          <option value="">All types</option>
          <option value="CHANGE_REQUEST">CHANGE_REQUEST</option>
          <option value="INCIDENT">INCIDENT</option>
          <option value="LEGAL">LEGAL</option>
          <option value="SEO">SEO</option>
        </select>

        <select className="rounded border p-2 text-sm" name="status" defaultValue={status ?? ""}>
          <option value="">All statuses</option>
          <option value="OPEN">OPEN</option>
          <option value="IN_PROGRESS">IN_PROGRESS</option>
          <option value="WAITING_CLIENT">WAITING_CLIENT</option>
          <option value="RESOLVED">RESOLVED</option>
          <option value="CLOSED">CLOSED</option>
        </select>

        <select className="rounded border p-2 text-sm" name="priority" defaultValue={priority ?? ""}>
          <option value="">All priorities</option>
          <option value="LOW">LOW</option>
          <option value="MEDIUM">MEDIUM</option>
          <option value="HIGH">HIGH</option>
          <option value="URGENT">URGENT</option>
        </select>

        <div className="md:col-span-5 flex flex-wrap items-center gap-2">
          <button className="rounded bg-black px-3 py-2 text-sm text-white" type="submit">
            Apply
          </button>
          <Link className="rounded border px-3 py-2 text-sm" href={`/app/${tenant}/tickets`}>
            Reset
          </Link>
        </div>
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
	          <div className="mt-4 overflow-hidden rounded border">
	            <table className="w-full text-sm">
          <thead className="border-b bg-muted/50">
            <tr>
              <th className="p-3 text-left">Title</th>
              <th className="p-3 text-left">Type</th>
              <th className="p-3 text-left">Status</th>
              <th className="p-3 text-left">Priority</th>
              <th className="p-3 text-left">Created</th>
              <th className="p-3 text-left">Updated</th>
            </tr>
          </thead>
          <tbody>
            {tickets.map((t) => (
              <tr key={t.id} className="border-b last:border-b-0">
                <td className="p-3">
                  <Link className="underline" href={`/app/${tenant}/tickets/${t.id}`}>
                    {t.title}
                  </Link>
                </td>
                <td className="p-3">
                  <Badge variant="outline" className="font-mono">{t.type}</Badge>
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
              </tr>
            ))}
            {tickets.length === 0 && (
              <tr>
                <td className="p-6 text-center text-sm text-muted-foreground" colSpan={6}>
                  No tickets found for the current filters.
                </td>
              </tr>
            )}
          </tbody>
	            </table>
	          </div>

      <div className="mt-4 flex items-center justify-between">
        <Link
          className={`rounded border px-3 py-2 text-sm ${page <= 1 ? "pointer-events-none opacity-50" : ""}`}
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
          className={`rounded border px-3 py-2 text-sm ${page >= totalPages ? "pointer-events-none opacity-50" : ""}`}
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
