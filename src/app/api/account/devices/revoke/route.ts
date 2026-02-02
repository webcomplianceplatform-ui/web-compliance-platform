import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { auditLog } from "@/lib/audit";
import { logAccessEvent } from "@/lib/access-events";
import { getClientIp } from "@/lib/ip";

export async function POST(req: Request) {
  const session = await getServerSession(authOptions);
  const uid = (session?.user as any)?.id as string | undefined;
  if (!uid) return NextResponse.json({ ok: false, error: "unauthorized" }, { status: 401 });

  const body = (await req.json().catch(() => null)) as { deviceId?: string } | null;
  const deviceId = String(body?.deviceId ?? "").trim();
  if (!deviceId) return NextResponse.json({ ok: false, error: "invalid_device" }, { status: 400 });

  const td = await prisma.trustedDevice.findUnique({ where: { id: deviceId }, select: { id: true, userId: true, revokedAt: true } });
  if (!td || td.userId !== uid) return NextResponse.json({ ok: false, error: "not_found" }, { status: 404 });
  if (td.revokedAt) return NextResponse.json({ ok: true });

  await prisma.trustedDevice.update({ where: { id: deviceId }, data: { revokedAt: new Date() } });

  await auditLog({
    tenantId: null,
    actorUserId: uid,
    action: "device.revoke",
    targetType: "TrustedDevice",
    targetId: deviceId,
    metaJson: { category: "SECURITY", scope: "GLOBAL" },
  });

  void logAccessEvent({
    kind: "DEVICE_REVOKED",
    userId: uid,
    ip: getClientIp(req),
    userAgent: req.headers.get("user-agent") ?? null,
    metaJson: { deviceId },
  });

  return NextResponse.json({ ok: true });
}
