import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { auditLog } from "@/lib/audit";
import { generateRecoveryCodes, prepareStoredRecoveryCodes } from "@/lib/recovery-codes";
import { requireRecentMfaApi } from "@/lib/tenant-auth";
import { MFA_GLOBAL_TENANT_ID } from "@/lib/mfa";

export async function POST(_req: Request) {
  const session = await getServerSession(authOptions);
  const email = session?.user?.email ?? null;
  if (!session || !email) return NextResponse.json({ ok: false, error: "unauthorized" }, { status: 401 });

  const user = await prisma.user.findUnique({
    where: { email: String(email) },
    select: { id: true, mfaEnabled: true },
  });
  if (!user) return NextResponse.json({ ok: false, error: "unauthorized" }, { status: 401 });

  const recent = await requireRecentMfaApi({
    tenantSlug: "global",
    tenantId: MFA_GLOBAL_TENANT_ID,
    userId: user.id,
    maxAgeMs: 5 * 60 * 1000,
    reauthUrl: "/app/account/mfa/verify",
  });
  if (!recent.ok) return recent.res;

  if (!user.mfaEnabled) {
    return NextResponse.json({ ok: false, error: "mfa_not_enrolled" }, { status: 409 });
  }

  const codes = generateRecoveryCodes(10);
  const stored = prepareStoredRecoveryCodes(codes, user.id);

  await prisma.user.update({
    where: { id: user.id },
    data: {
      mfaRecoveryCodes: stored as any,
      mfaRecoveryCodesGeneratedAt: new Date(),
    },
  });

  await auditLog({
    tenantId: null,
    actorUserId: user.id,
    action: "mfa.recovery.generated",
    targetType: "User",
    targetId: user.id,
    metaJson: { category: "SECURITY", scope: "GLOBAL" },
  });

  return NextResponse.json({ ok: true, codes });
}
