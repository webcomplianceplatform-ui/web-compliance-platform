import { NextResponse } from "next/server";
import { requireTenantContextApi } from "@/lib/tenant-auth";
import { prisma } from "@/lib/db";
import { auditLog } from "@/lib/audit";
import { UserRole } from "@prisma/client";
import { buildPlanPayload } from "@/lib/tenant-plan";

export async function POST(req: Request, { params }: { params: Promise<{ tenant: string }> }) {
  const { tenant } = await params;

  const r = await requireTenantContextApi(tenant);
  if (!r.ok) return r.res;

  // Only OWNER or SUPERADMIN can change MFA policy.
  if (!(r.ctx.isSuperadmin || r.ctx.role === UserRole.OWNER)) {
    return NextResponse.json({ ok: false, error: "forbidden" }, { status: 403 });
  }

  const body = (await req.json().catch(() => ({}))) as { required?: boolean };
  const required = !!body.required;

  const current = await prisma.tenantPlan.findUnique({
    where: { tenantId: r.ctx.tenantId },
    select: { mfaRequired: true, plan: true, features: true },
  });

  if (!current) {
    const payload = buildPlanPayload({ plan: "COMPLIANCE" });
    await prisma.tenantPlan.create({
      data: { tenantId: r.ctx.tenantId, plan: "COMPLIANCE" as any, features: payload as any, mfaRequired: required },
    });
  } else {
    await prisma.tenantPlan.update({
      where: { tenantId: r.ctx.tenantId },
      data: { mfaRequired: required },
    });
  }

  await auditLog({
    tenantId: r.ctx.tenantId,
    actorUserId: r.ctx.user.id,
    action: required ? "mfa.policy.enabled" : "mfa.policy.disabled",
    targetType: "Tenant",
    targetId: r.ctx.tenantId,
    metaJson: {
      category: "SECURITY",
      tenantSlug: tenant,
      from: !!current?.mfaRequired,
      to: required,
    },
  });

  return NextResponse.json({ ok: true, required });
}
