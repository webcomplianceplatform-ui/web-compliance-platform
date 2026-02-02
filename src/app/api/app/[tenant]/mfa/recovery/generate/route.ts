import { NextResponse } from "next/server";
import { requireTenantContextApi, requireRecentMfaApi } from "@/lib/tenant-auth";
import { prisma } from "@/lib/db";
import { auditLog } from "@/lib/audit";
import { generateRecoveryCodes, prepareStoredRecoveryCodes } from "@/lib/recovery-codes";

export async function POST(_req: Request, { params }: { params: Promise<{ tenant: string }> }) {
  const { tenant } = await params;

  // Must be logged in + member (or superadmin impersonating)
  const ctxRes = await requireTenantContextApi(tenant);
  if (!ctxRes.ok) return ctxRes.res;

  const { user, tenantId } = ctxRes.ctx;

  // Require very recent MFA to generate/reveal recovery codes
  const recent = await requireRecentMfaApi({ tenantSlug: tenant, tenantId, userId: user.id, maxAgeMs: 5 * 60 * 1000 });
  if (!recent.ok) return recent.res;

  const u = await prisma.user.findUnique({
    where: { id: user.id },
    select: { id: true, mfaEnabled: true },
  });
  if (!u) return NextResponse.json({ ok: false, error: "unauthorized" }, { status: 401 });
  if (!u.mfaEnabled) {
    return NextResponse.json({ ok: false, error: "mfa_not_enrolled" }, { status: 409 });
  }

  const codes = generateRecoveryCodes(10);
  const stored = prepareStoredRecoveryCodes(codes, u.id);

  await prisma.user.update({
    where: { id: u.id },
    data: {
      mfaRecoveryCodes: stored as any,
      mfaRecoveryCodesGeneratedAt: new Date(),
    },
  });

  await auditLog({
    tenantId,
    actorUserId: u.id,
    action: "mfa.recovery.generated",
    targetType: "User",
    targetId: u.id,
    metaJson: { category: "SECURITY" },
  });

  // Return plain codes ONCE.
  return NextResponse.json({ ok: true, codes });
}
