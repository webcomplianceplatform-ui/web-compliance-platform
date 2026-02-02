import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { isSuperadminEmail } from "@/lib/superadmin";
import { prisma } from "@/lib/db";
import { auditLog } from "@/lib/audit";
import { requireRecentGlobalMfaApi } from "@/lib/tenant-auth";
import { getClientIp } from "@/lib/ip";
import { rateLimit } from "@/lib/rate-limit";
import { logAccessEvent } from "@/lib/access-events";

export async function POST(req: Request) {
  const session = await getServerSession(authOptions);
  const actorEmail = session?.user?.email ?? null;
  if (!actorEmail || !isSuperadminEmail(actorEmail)) {
    return NextResponse.json({ ok: false, error: "forbidden" }, { status: 403 });
  }

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

  // Sensitive action: require recent GLOBAL MFA verification.
  const reauth = await requireRecentGlobalMfaApi({ userId: actor.id });
  if (!reauth.ok) return reauth.res;

  const ip = getClientIp(req);
  const rl = rateLimit({ key: `admin:revoke_sessions:${ip}`, limit: 30, windowMs: 60_000 });
  if (rl.ok === false) {
    return NextResponse.json({ ok: false, error: "rate_limited", retryAfterSec: rl.retryAfterSec }, { status: 429 });
  }

  const body = await req.json().catch(() => null);
  const email = (body?.email ?? "").toString().trim().toLowerCase();
  if (!email) return NextResponse.json({ ok: false, error: "missing_email" }, { status: 400 });

  const target = await prisma.user.findUnique({ where: { email }, select: { id: true, sessionVersion: true } });
  if (!target) return NextResponse.json({ ok: false, error: "user_not_found" }, { status: 404 });

  // Revoke all active sessions + bump sessionVersion for belt-and-suspenders.
  await prisma.user.update({ where: { id: target.id }, data: { sessionVersion: { increment: 1 } } });
  await prisma.userSession.updateMany({
    where: { userId: target.id, revokedAt: null },
    data: { revokedAt: new Date(), revokedByUserId: actor.id, revokedReason: "admin_revoke_all_sessions" },
  });

  await auditLog({
    tenantId: null,
    actorUserId: actor.id,
    action: "admin.user_sessions_revoked",
    targetType: "user",
    targetId: target.id,
    metaJson: { category: "ACCESS", targetEmail: email },
  });

  void logAccessEvent({
    kind: "SESSION_REVOKED",
    userId: target.id,
    ip,
    metaJson: { by: actorEmail, reason: "admin_revoke_all_sessions" },
  });

  return NextResponse.json({ ok: true });
}
