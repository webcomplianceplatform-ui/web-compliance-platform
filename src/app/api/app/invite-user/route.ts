import { NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import { prisma } from "@/lib/db";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { UserRole } from "@prisma/client";
import { getClientIp } from "@/lib/ip";
import { rateLimit } from "@/lib/rate-limit";
import { auditLog } from "@/lib/audit";

function normalizeRole(role: unknown): UserRole | null {
  if (role === "OWNER") return UserRole.OWNER;
  if (role === "ADMIN") return UserRole.ADMIN;
  if (role === "CLIENT") return UserRole.CLIENT;
  if (role === "VIEWER") return UserRole.VIEWER;
  return null;
}

export async function POST(req: Request) {
  if (process.env.NODE_ENV === "production") {
  return NextResponse.json({ ok: false, error: "disabled" }, { status: 404 });
}
  const ip = getClientIp(req);
  const rl = rateLimit({ key: `invite-user:${ip}`, limit: 10, windowMs: 60_000 });
  if (rl.ok === false) {
    return NextResponse.json({ ok: false, error: "rate_limited", retryAfterSec: rl.retryAfterSec }, { status: 429 });
  }

  const session = await getServerSession(authOptions);
  if (!session?.user?.email) return NextResponse.json({ ok: false }, { status: 401 });

  const body = (await req.json()) as { tenantSlug?: string; email?: string; name?: string; role?: unknown };
  const tenantSlug = (body.tenantSlug || "").trim();
  const email = (body.email || "").trim().toLowerCase();
  const name = typeof body.name === "string" ? body.name.trim() : undefined;
  const wantedRole = normalizeRole(body.role);

  if (!tenantSlug || !email || !wantedRole) {
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

  const canManage = myMembership.role === UserRole.OWNER || myMembership.role === UserRole.ADMIN;
  if (!canManage) return NextResponse.json({ ok: false }, { status: 403 });

  // ADMIN cannot assign OWNER
  if (myMembership.role === UserRole.ADMIN && wantedRole === UserRole.OWNER) {
    return NextResponse.json({ ok: false, error: "forbidden_role" }, { status: 403 });
  }

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
    update: { role: wantedRole },
    create: { userId: user.id, tenantId: myMembership.tenantId, role: wantedRole },
  });

  await auditLog({
    tenantId: myMembership.tenantId,
    actorUserId: me.id,
    action: "tenant.user.invite",
    targetType: "user",
    targetId: user.id,
    meta: { email, role: wantedRole },
  });

  return NextResponse.json({
    ok: true,
    tempPassword, // MVP: luego lo cambiamos por email obligatorio
  });
}
