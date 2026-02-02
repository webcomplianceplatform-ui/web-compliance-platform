import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { requireTenantContextApi } from "@/lib/tenant-auth";
import { auditLog } from "@/lib/audit";
import { authenticator } from "otplib";

export async function POST(req: Request, { params }: { params: Promise<{ tenant: string }> }) {
  const { tenant } = await params;

  const session = await getServerSession(authOptions);
  if (!session?.user?.email) {
    return NextResponse.json({ ok: false, error: "unauthorized" }, { status: 401 });
  }

  const ctxRes = await requireTenantContextApi(tenant, { skipMfaEnforcement: true });
  if (!ctxRes.ok) return ctxRes.res;

  const user = await prisma.user.findUnique({
    where: { email: session.user.email },
    select: { id: true, email: true, mfaEnabled: true },
  });
  if (!user) return NextResponse.json({ ok: false, error: "unauthorized" }, { status: 401 });

  // Always rotate secret when re-enrolling.
  const secret = authenticator.generateSecret();
  const issuer = "WebCompliance";
  const label = session.user.email;
  const otpauth = authenticator.keyuri(label, issuer, secret);

  await prisma.user.update({
    where: { id: user.id },
    data: { mfaSecret: secret, mfaEnabled: false, mfaEnabledAt: null },
  });

  await auditLog({
    tenantId: ctxRes.ctx.tenantId,
    actorUserId: user.id,
    action: "mfa.enroll.start",
    targetType: "User",
    targetId: user.id,
    metaJson: {
      category: "SECURITY",
      tenantSlug: tenant,
    },
  });

  return NextResponse.json({ ok: true, secret, otpauth });
}
