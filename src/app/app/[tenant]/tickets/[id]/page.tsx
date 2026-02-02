import { prisma } from "@/lib/db";
import { requireTenantContextPage, canManageTickets } from "@/lib/tenant-auth";
import TicketActions from "./ticket-actions";

export default async function TicketDetailPage({
  params,
}: {
  params: Promise<{ tenant: string; id: string }>;
}) {
  const { tenant, id } = await params;

  const ctx = await requireTenantContextPage(tenant);

  if (!ctx.features.tickets) redirect(`/app/${tenant}`);

  const ticket = await prisma.ticket.findFirst({
    where: { id, tenantId: ctx.tenantId },
    select: {
      id: true,
      title: true,
      description: true,
      type: true,
      status: true,
      priority: true,
      createdAt: true,
      createdBy: { select: { email: true, name: true } },
      comments: {
        orderBy: { createdAt: "asc" },
        select: {
          id: true,
          body: true,
          createdAt: true,
          author: { select: { email: true, name: true } },
        },
      },
    },
  });

  if (!ticket) {
    return <div className="rounded border p-4">Ticket not found</div>;
  }

  const isManager = canManageTickets(ctx.role);

  return (
    <main className="max-w-2xl space-y-6">
      <div>
        <h1 className="text-2xl font-semibold">{ticket.title}</h1>
        <div className="mt-2 text-sm text-muted-foreground">
          <span className="font-mono">{ticket.type}</span> ·{" "}
          <span className="font-mono">{ticket.status}</span> ·{" "}
          <span className="font-mono">{ticket.priority}</span>
        </div>

        <p className="mt-4 whitespace-pre-wrap">{ticket.description}</p>

        <div className="mt-4 text-xs text-muted-foreground">
          Created by {ticket.createdBy.name ?? ticket.createdBy.email} ·{" "}
          {new Date(ticket.createdAt).toLocaleString()}
        </div>
      </div>

      <TicketActions
        tenant={tenant}
        ticketId={ticket.id}
        canManage={isManager}
        currentType={ticket.type}
        currentStatus={ticket.status}
        currentPriority={ticket.priority}
      />

      <section className="space-y-3">
        <h2 className="text-lg font-semibold">Activity</h2>

        <div className="space-y-2">
          {ticket.comments.map((c) => {
            const isSystem = c.body.startsWith("[SYSTEM]");
            const body = isSystem ? c.body.replace(/^\[SYSTEM\]\s*/, "") : c.body;
            return (
              <div key={c.id} className={`rounded border p-3 ${isSystem ? "bg-muted/30" : ""}`}>
                <div className="text-xs text-muted-foreground">
                  {isSystem ? "System" : c.author.name ?? c.author.email} ·{" "}
                  {new Date(c.createdAt).toLocaleString()}
                </div>
                <div className={`mt-2 whitespace-pre-wrap text-sm ${isSystem ? "italic" : ""}`}>{body}</div>
              </div>
            );
          })}
        </div>
      </section>
    </main>
  );
}
