import Link from "next/link";
import { requireTenantContextPage, canManageTickets } from "@/lib/tenant-auth";
import { prisma } from "@/lib/db";

export default async function TicketsPage({
  params,
}: {
  params: Promise<{ tenant: string }>;
}) {
  const { tenant } = await params;
  const ctx = await requireTenantContextPage(tenant);

  const where = canManageTickets(ctx.role)
    ? { tenantId: ctx.tenantId }
    : { tenantId: ctx.tenantId, createdById: ctx.user.id };

  const tickets = await prisma.ticket.findMany({
    where,
    orderBy: { createdAt: "desc" },
    select: { id: true, title: true, status: true, priority: true, createdAt: true },
    take: 100,
  });

  return (
    <main>
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-semibold">Tickets</h1>

        <Link className="rounded border px-3 py-1 text-sm" href={`/app/${tenant}/tickets/new`}>
          New ticket
        </Link>
      </div>

      <div className="mt-4 overflow-hidden rounded border">
        <table className="w-full text-sm">
          <thead className="border-b bg-muted/50">
            <tr>
              <th className="p-3 text-left">Title</th>
              <th className="p-3 text-left">Status</th>
              <th className="p-3 text-left">Priority</th>
              <th className="p-3 text-left">Created</th>
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
                <td className="p-3 font-mono">{t.status}</td>
                <td className="p-3 font-mono">{t.priority}</td>
                <td className="p-3">{new Date(t.createdAt).toLocaleString()}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </main>
  );
}
