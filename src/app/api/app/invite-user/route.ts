import { NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import { prisma } from "@/lib/db";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";

export async function POST(req: Request) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.email) return NextResponse.json({ ok: false }, { status: 401 });

  const { tenantSlug, email, name, role } = await req.json();

  if (!tenantSlug || !email || !role) {
    return NextResponse.json({ ok: false, error: "missing_fields" }, { status: 400 });
  }

  const me = await prisma.user.findUnique({
    where: { email: session.user.email },
    select: { id: true },
  });
  if (!me) return NextResponse.json({ ok: false }, { status: 401 });

  const myMembership = await prisma.userTenant.findFirst({
    where: { userId: me.id, tenant: { slug: tenantSlug } },
    select: { role: true, tenantId: true },
  });
  if (!myMembership) return NextResponse.json({ ok: false }, { status: 403 });

  const canManage = myMembership.role === "OWNER" || myMembership.role === "ADMIN";
  if (!canManage) return NextResponse.json({ ok: false }, { status: 403 });

  // password temporal
  const tempPassword = "Temp-" + Math.random().toString(36).slice(2, 10);
  const passwordHash = await bcrypt.hash(tempPassword, 10);

  const user = await prisma.user.upsert({
    where: { email },
    update: { name: name ?? undefined },
    create: { email, name: name ?? null, passwordHash },
  });

  await prisma.userTenant.upsert({
    where: {
      userId_tenantId: { userId: user.id, tenantId: myMembership.tenantId },
    },
    update: { role },
    create: { userId: user.id, tenantId: myMembership.tenantId, role },
  });

  return NextResponse.json({
    ok: true,
    tempPassword, // MVP: se lo dices al cliente por fuera; luego lo cambiamos por email
  });
}
