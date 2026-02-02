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
  const rl = rateLimit({ key: `admin:revoke_session:${ip}`, limit: 60, windowMs: 60_000 });
  if (rl.ok === false) {
    return NextResponse.json({ ok: false, error: "rate_limited", retryAfterSec: rl.retryAfterSec }, { status: 429 });
  }

  const body = await req.json().catch(() => null);
  const sessionId = (body?.sessionId ?? "").toString().trim();
  if (!sessionId) return NextResponse.json({ ok: false, error: "missing_sessionId" }, { status: 400 });

  // Never allow revoking the session that is currently being used.
  const currentSid = (session.user as any)?.sessionId ?? null;
  if (currentSid && sessionId === currentSid) {
    return NextResponse.json({ ok: false, error: "cannot_revoke_current_session" }, { status: 400 });
  }

  const target = await prisma.userSession.findUnique({
    where: { id: sessionId },
    select: { id: true, userId: true, revokedAt: true },
  });

  if (!target) return NextResponse.json({ ok: false, error: "not_found" }, { status: 404 });
  if (target.revokedAt) return NextResponse.json({ ok: true, alreadyRevoked: true });

  await prisma.userSession.update({
    where: { id: sessionId },
    data: {
      revokedAt: new Date(),
      revokedByUserId: actor.id,
      revokedReason: "admin_revoke_session",
    },
  });

  await auditLog({
    tenantId: null,
    actorUserId: actor.id,
    action: "admin.session_revoked",
    targetType: "session",
    targetId: sessionId,
    metaJson: { category: "ACCESS", targetUserId: target.userId },
  });

  void logAccessEvent({
    kind: "SESSION_REVOKED",
    userId: target.userId,
    ip,
    metaJson: { by: actorEmail, reason: "admin_revoke_session", sessionId },
  });

  return NextResponse.json({ ok: true });
}
