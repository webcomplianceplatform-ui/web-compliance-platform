import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import bcrypt from "bcryptjs";
import { authOptions } from "@/lib/auth";
import { isSuperadminEmail } from "@/lib/superadmin";
import { prisma } from "@/lib/db";
import { auditLog } from "@/lib/audit";
import { rateLimit } from "@/lib/rate-limit";
import { getClientIp } from "@/lib/ip";
import { requireRecentGlobalMfaApi } from "@/lib/tenant-auth";
import { logAccessEvent } from "@/lib/access-events";

export async function POST(req: Request) {
  const session = await getServerSession(authOptions);
  const actorEmail = session?.user?.email ?? null;

  if (!actorEmail || !isSuperadminEmail(actorEmail)) {
    return NextResponse.json({ ok: false, error: "forbidden" }, { status: 403 });
  }

  // Require a recent GLOBAL MFA verification for sensitive control-plane actions.
  const actor = await prisma.user
    .findUnique({ where: { email: actorEmail }, select: { id: true, sessionVersion: true } })
    .catch(() => null);
  if (!actor?.id) return NextResponse.json({ ok: false, error: "unauthorized" }, { status: 401 });

  // Enforce server-side session validity (sessionVersion + per-session revoke).
  const { enforceSessionActiveApi } = await import("@/lib/session");
  const active = await enforceSessionActiveApi({
    sessionUser: session.user as any,
    dbUser: { id: actor.id, sessionVersion: actor.sessionVersion ?? 0 },
    checkStepUp: true,
  });
  if (!active.ok) return active.res;
  const reauth = await requireRecentGlobalMfaApi({ userId: actor.id });
  if (!reauth.ok) return reauth.res;

  const ip = getClientIp(req);
  const rl = rateLimit({ key: `admin:reset_password:${ip}`, limit: 10, windowMs: 60_000 });
  if (rl.ok === false) {
    return NextResponse.json({ ok: false, error: "rate_limited", retryAfterSec: rl.retryAfterSec }, { status: 429 });
  }

  const body = await req.json().catch(() => null);
  const email = (body?.email ?? "").toString().trim().toLowerCase();
  const newPassword = (body?.newPassword ?? "").toString();

  if (!email) return NextResponse.json({ ok: false, error: "missing_email" }, { status: 400 });
  if (newPassword.length < 8) return NextResponse.json({ ok: false, error: "weak_password" }, { status: 400 });

  const user = await prisma.user.findUnique({ where: { email }, select: { id: true } });
  if (!user) return NextResponse.json({ ok: false, error: "user_not_found" }, { status: 404 });

  const passwordHash = await bcrypt.hash(newPassword, 12);
  // Also bump sessionVersion to force logout on existing sessions.
  await prisma.user.update({
    where: { email },
    data: { passwordHash, mustChangePassword: true, sessionVersion: { increment: 1 } },
  });

  // Best-effort audit (no tenant context)
  await auditLog({
    tenantId: null,
    actorUserId: actor?.id ?? null,
    action: "admin.user_password_reset",
    targetType: "user",
    targetId: user.id,
    metaJson: { category: "ACCESS", targetEmail: email },
  });

  // Best-effort access event (the target user's sessions were invalidated).
  void logAccessEvent({
    kind: "SESSION_REVOKED",
    userId: user.id,
    ip,
    metaJson: { by: actorEmail, reason: "admin_password_reset" },
  });

  return NextResponse.json({ ok: true });
}
