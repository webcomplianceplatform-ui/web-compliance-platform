import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { auditLog } from "@/lib/audit";
import { getClientIp } from "@/lib/ip";
import { logAccessEvent } from "@/lib/access-events";

export async function POST(req: Request) {
  const session = await getServerSession(authOptions);
  const email = session?.user?.email ?? null;
  const actorId = (session?.user as any)?.id as string | undefined;
  const actorSessionId = (session?.user as any)?.sessionId as string | undefined;
  if (!email || !actorId || !actorSessionId) {
    return NextResponse.json({ ok: false, error: "unauthorized" }, { status: 401 });
  }

  const body = (await req.json().catch(() => null)) as { sessionId?: string } | null;
  const sessionId = String(body?.sessionId ?? "").trim();
  if (!sessionId) {
    return NextResponse.json({ ok: false, error: "invalid_request" }, { status: 400 });
  }

  // Ensure the target session belongs to the actor.
  const target = await prisma.userSession.findUnique({
    where: { id: sessionId },
    select: { id: true, userId: true, revokedAt: true },
  });
  if (!target || target.userId !== actorId) {
    return NextResponse.json({ ok: false, error: "forbidden" }, { status: 403 });
  }

  if (!target.revokedAt) {
    await prisma.userSession.update({
      where: { id: sessionId },
      data: {
        revokedAt: new Date(),
        revokedByUserId: actorId,
        revokedReason: sessionId === actorSessionId ? "self_revoke" : "user_revoke",
      },
    });
  }

  await auditLog({
    tenantId: null,
    actorUserId: actorId,
    action: "session.revoke",
    targetType: "UserSession",
    targetId: sessionId,
    metaJson: { category: "SECURITY", self: sessionId === actorSessionId },
  });

  void logAccessEvent({
    kind: "SESSION_REVOKED",
    userId: actorId,
    ip: getClientIp(req),
    userAgent: req.headers.get("user-agent") ?? null,
    metaJson: { scope: "ACCOUNT", sessionId },
  });

  return NextResponse.json({ ok: true, revoked: true, self: sessionId === actorSessionId });
}
