import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { requireTenantContextApi, canManageTickets } from "@/lib/tenant-auth";
import { TicketPriority, TicketType } from "@prisma/client";

export async function POST(req: Request) {
  const body = (await req.json()) as {
    tenant: string;
    title: string;
    description: string;
    priority?: TicketPriority;
  };

  const { tenant, title, description, priority } = body ?? {};
  if (!tenant || !title || !description) {
    return NextResponse.json({ ok: false, error: "missing_fields" }, { status: 400 });
  }

  const auth = await requireTenantContextApi(tenant);
  if (!auth.ok) return auth.res;

  const { ctx } = auth;

  const ticket = await prisma.ticket.create({
  data: {
    title,
    description,
    type: TicketType.CHANGE_REQUEST,
    priority: (priority ?? TicketPriority.MEDIUM) as TicketPriority,
    tenant: { connect: { id: ctx.tenantId } },
    createdBy: { connect: { id: ctx.user.id } },
  },
  select: { id: true },
});


  return NextResponse.json({ ok: true, id: ticket.id });
}
