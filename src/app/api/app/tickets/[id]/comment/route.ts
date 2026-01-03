import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { requireTenantContextApi } from "@/lib/tenant-auth";

export async function POST(
  req: Request,
  { params }: { params: { id: string } }
) {
  const body = (await req.json()) as { tenant: string; body: string };
  const { tenant, body: commentBody } = body ?? {};

  if (!tenant || !commentBody) {
    return NextResponse.json({ ok: false, error: "missing_fields" }, { status: 400 });
  }

  const auth = await requireTenantContextApi(tenant);
  if (!auth.ok) return auth.res;
  const { ctx } = auth;

  // Asegura que el ticket pertenece al tenant
  const ticket = await prisma.ticket.findFirst({
    where: { id: params.id, tenantId: ctx.tenantId },
    select: { id: true },
  });
  if (!ticket) {
    return NextResponse.json({ ok: false, error: "not_found" }, { status: 404 });
  }

  await prisma.ticketComment.create({
    data: {
      body: commentBody,
      ticket: { connect: { id: params.id } },
      author: { connect: { id: ctx.user.id } },
    },
  });

  return NextResponse.json({ ok: true });
}
