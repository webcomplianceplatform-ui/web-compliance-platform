import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { requireTenantContextApi } from "@/lib/tenant-auth";
import { auditLog } from "@/lib/audit";
import { authenticator } from "otplib";
import { signMfaCookie, mfaCookieName } from "@/lib/mfa";
import { cookies } from "next/headers";
import { consumeRecoveryCode } from "@/lib/recovery-codes";
import { logAccessEvent } from "@/lib/access-events";
import { getClientIp } from "@/lib/ip";

export async function POST(req: Request, { params }: { params: Promise<{ tenant: string }> }) {
  const { tenant } = await params;

  const session = await getServerSession(authOptions);
  if (!session?.user?.email) {
    return NextResponse.json({ ok: false, error: "unauthorized" }, { status: 401 });
  }

  const body = (await req.json().catch(() => ({}))) as { token?: string; recoveryCode?: string };
  const token = body?.token;
  const recoveryCode = body?.recoveryCode;

  if ((!token || typeof token !== "string") && (!recoveryCode || typeof recoveryCode !== "string")) {
    return NextResponse.json({ ok: false, error: "invalid_request" }, { status: 400 });
  }

  const ctxRes = await requireTenantContextApi(tenant, { skipMfaEnforcement: true });
  if (!ctxRes.ok) return ctxRes.res;

  const user = await prisma.user.findUnique({
    where: { email: session.user.email },
    select: { id: true, email: true, mfaSecret: true, mfaEnabled: true, mfaEnabledAt: true, mfaRecoveryCodes: true },
  });
  if (!user) return NextResponse.json({ ok: false, error: "unauthorized" }, { status: 401 });
  if (!user.mfaSecret) {
    return NextResponse.json({ ok: false, error: "not_started" }, { status: 409 });
  }

  let verified = false;
  let usedRecovery = false;

  if (token && user.mfaSecret) {
    verified = authenticator.verify({ token: token.replace(/\s/g, ""), secret: user.mfaSecret });
  }

  if (!verified && recoveryCode) {
    const stored = Array.isArray(user.mfaRecoveryCodes) ? (user.mfaRecoveryCodes as any) : null;
    const consumed = consumeRecoveryCode(stored, user.id, recoveryCode);
    if (consumed.ok) {
      usedRecovery = true;
      verified = true;
      await prisma.user.update({
        where: { id: user.id },
        data: { mfaRecoveryCodes: consumed.updated as any },
      });
    }
  }

  if (!verified) {
    await auditLog({
      tenantId: ctxRes.ctx.tenantId,
      actorUserId: user.id,
      action: "mfa.verify.failed",
      targetType: "User",
      targetId: user.id,
      metaJson: { category: "SECURITY", tenantSlug: tenant, method: recoveryCode ? "recovery" : "totp" },
    });
    return NextResponse.json({ ok: false, error: "invalid_code" }, { status: 400 });
  }

  const now = new Date();
  const wasEnrolled = !!user.mfaEnabled;
  await prisma.user.update({
    where: { id: user.id },
    data: {
      mfaEnabled: true,
      mfaEnabledAt: user.mfaEnabledAt ?? now,
      mfaLastVerifiedAt: now,
    },
  });

  if (!wasEnrolled) {
    await auditLog({
      tenantId: ctxRes.ctx.tenantId,
      actorUserId: user.id,
      action: "mfa.enrolled",
      targetType: "User",
      targetId: user.id,
      metaJson: { category: "SECURITY", tenantSlug: tenant },
    });
  }

  if (usedRecovery) {
    await auditLog({
      tenantId: ctxRes.ctx.tenantId,
      actorUserId: user.id,
      action: "mfa.recovery.used",
      targetType: "User",
      targetId: user.id,
      metaJson: { category: "SECURITY", tenantSlug: tenant },
    });
  }

  // Set signed per-tenant MFA verification cookie (12h)
  const cookieStore = await cookies();
  const iat = Date.now();
  const exp = iat + 12 * 60 * 60 * 1000;
  const value = signMfaCookie({ uid: user.id, tenantId: ctxRes.ctx.tenantId, iat, exp } as any);
  cookieStore.set(mfaCookieName(ctxRes.ctx.tenantId), value, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    expires: new Date(exp),
  });

  // Best-effort access event.
  void logAccessEvent({
    kind: "MFA_SUCCESS",
    userId: user.id,
    tenantId: ctxRes.ctx.tenantId,
    ip: getClientIp(req),
    userAgent: req.headers.get("user-agent") ?? null,
    metaJson: { tenantSlug: tenant, method: usedRecovery ? "recovery" : "totp" },
  });

  // Clear per-session step-up requirement (best-effort).
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
            firstSeenAt: new Date(),
            lastSeenAt: new Date(),
            metaJson: { source: "mfa.verify", tenantId: ctxRes.ctx.tenantId, userAgent: s.userAgent ?? null },
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

  return NextResponse.json({ ok: true });
}
