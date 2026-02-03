import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { auditLog } from "@/lib/audit";
import { authenticator } from "otplib";
import { signMfaCookie, MFA_GLOBAL_TENANT_ID, mfaCookieNameGlobal } from "@/lib/mfa";
import { logAccessEvent } from "@/lib/access-events";
import { getClientIp } from "@/lib/ip";

export async function POST(req: Request) {
  const session = await getServerSession(authOptions);
  const email = session?.user?.email ?? null;
  if (!session || !email) return NextResponse.json({ ok: false, error: "unauthorized" }, { status: 401 });

  const body = await req.json().catch(() => null) as { token?: string } | null;
  const token = String(body?.token ?? "").trim().replace(/\s+/g, "");
  if (token.length < 6) return NextResponse.json({ ok: false, error: "invalid_token" }, { status: 400 });

  const user = await prisma.user.findUnique({
    where: { email: String(email) },
    select: { id: true, email: true, mfaSecret: true, mfaEnabled: true },
  });
  if (!user) return NextResponse.json({ ok: false, error: "unauthorized" }, { status: 401 });
  if (!user.mfaSecret) return NextResponse.json({ ok: false, error: "no_secret" }, { status: 409 });

  const ok = authenticator.check(token, user.mfaSecret);
  if (!ok) return NextResponse.json({ ok: false, error: "invalid_code" }, { status: 400 });

  await prisma.user.update({
    where: { id: user.id },
    data: { mfaEnabled: true, mfaEnabledAt: new Date() },
  });

  await auditLog({
    tenantId: null,
    actorUserId: user.id,
    action: "mfa.enabled",
    targetType: "User",
    targetId: user.id,
    metaJson: { category: "SECURITY", scope: "GLOBAL" },
  });

  const cookie = signMfaCookie({ uid: user.id, tenantId: MFA_GLOBAL_TENANT_ID }, { ttlMs: 12 * 60 * 60 * 1000 });
  const res = NextResponse.json({ ok: true });

  // Clear per-session step-up requirement (if any).
  const sid = (session.user as any)?.sessionId as string | undefined;
  if (sid) {
    prisma.userSession
      .update({ where: { id: sid }, data: { requiresStepUp: false } })
      .catch(() => null);
  }

  // Device approval: if this request belongs to a tracked session with a deviceHash,
  // mark the device as trusted for this user (best-effort).
  if (sid) {
    prisma.userSession
      .findUnique({ where: { id: sid }, select: { deviceHash: true, userAgent: true } })
      .then((s) => {
        if (!s?.deviceHash) return null;
        return prisma.trustedDevice.upsert({
          where: { userId_deviceHash: { userId: user.id, deviceHash: s.deviceHash } },
          create: {
            userId: user.id,
            deviceHash: s.deviceHash,
            label: "Approved after MFA",
            approvedAt: new Date(),
            lastSeenAt: new Date(),
            metaJson: { source: "mfa.verify", userAgent: s.userAgent ?? null },
          },
          update: {
            approvedAt: new Date(),
            revokedAt: null,
            lastSeenAt: new Date(),
          },
        });
      })
      .catch(() => null);
  }

  // Best-effort access event
  void logAccessEvent({
    kind: "MFA_SUCCESS",
    userId: user.id,
    ip: getClientIp(req),
    userAgent: req.headers.get("user-agent"),
    metaJson: { scope: "GLOBAL" },
  });

  res.cookies.set(mfaCookieNameGlobal(), cookie, {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: 12 * 60 * 60,
  });
  return res;
}
