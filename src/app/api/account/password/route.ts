import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import bcrypt from "bcryptjs";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { rateLimit } from "@/lib/rate-limit";
import { getClientIp } from "@/lib/ip";
import { auditLog } from "@/lib/audit";

export async function POST(req: Request) {
  const session = await getServerSession(authOptions);
  const email = session?.user?.email ?? null;

  if (!email) {
    return NextResponse.json({ ok: false, error: "unauthorized" }, { status: 401 });
  }

  // rate limit after auth
  const ip = getClientIp(req);
  const rl = rateLimit({ key: `acct:pw:${email}:${ip}`, limit: 10, windowMs: 60_000 });
  if (rl.ok === false) {
    return NextResponse.json({ ok: false, error: "rate_limited", retryAfterSec: rl.retryAfterSec }, { status: 429 });
  }

  const body = await req.json().catch(() => null);
  const currentPassword = (body?.currentPassword ?? "").toString();
  const newPassword = (body?.newPassword ?? "").toString();

  if (!currentPassword || !newPassword) {
    return NextResponse.json({ ok: false, error: "missing_fields" }, { status: 400 });
  }
  if (newPassword.length < 8) {
    return NextResponse.json({ ok: false, error: "password_too_short" }, { status: 400 });
  }

  const user = await prisma.user.findUnique({ where: { email }, select: { id: true, passwordHash: true } });
  if (!user || !user.passwordHash) {
    return NextResponse.json({ ok: false, error: "no_password_set" }, { status: 400 });
  }

  const ok = await bcrypt.compare(currentPassword, user.passwordHash);
  if (!ok) {
    return NextResponse.json({ ok: false, error: "invalid_current_password" }, { status: 400 });
  }

  const nextHash = await bcrypt.hash(newPassword, 12);
  // Clear mustChangePassword and invalidate existing sessions.
  await prisma.user.update({
    where: { id: user.id },
    data: { passwordHash: nextHash, mustChangePassword: false, sessionVersion: { increment: 1 } },
  });

  await auditLog({
    tenantId: null,
    actorUserId: user.id,
    action: "user.password_changed",
    targetType: "user",
    targetId: user.id,
    metaJson: { category: "ACCESS" },
  });

  return NextResponse.json({ ok: true });
}
