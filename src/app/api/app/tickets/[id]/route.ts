import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { requireTenantContextApi, canManageTickets } from "@/lib/tenant-auth";
import { TicketPriority, TicketStatus } from "@prisma/client";

export async function PATCH(
  req: Request,
  { params }: { params: { id: string } }
) {
  const body = (await req.json()) as {
    tenant: string;
    status?: TicketStatus;
    priority?: TicketPriority;
  };

  const { tenant, status, priority } = body ?? {};
  if (!tenant || (!status && !priority)) {
    return NextResponse.json({ ok: false, error: "missing_fields" }, { status: 400 });
  }

  const auth = await requireTenantContextApi(tenant);
  if (!auth.ok) return auth.res;
  const { ctx } = auth;

  if (!canManageTickets(ctx.role)) {
    return NextResponse.json({ ok: false, error: "forbidden" }, { status: 403 });
  }

  // asegura tenant
  const ticket = await prisma.ticket.findFirst({
    where: { id: params.id, tenantId: ctx.tenantId },
    select: { id: true },
  });
  if (!ticket) {
    return NextResponse.json({ ok: false, error: "not_found" }, { status: 404 });
  }

  await prisma.ticket.update({
    where: { id: params.id },
    data: {
      ...(status ? { status } : {}),
      ...(priority ? { priority } : {}),
    },
  });

  return NextResponse.json({ ok: true });
}
