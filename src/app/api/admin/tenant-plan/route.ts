import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { isSuperadminEmail } from "@/lib/superadmin";
import { prisma } from "@/lib/db";
import { buildPlanPayload, type PlanTier } from "@/lib/tenant-plan";
import { auditLog } from "@/lib/audit";
import { requireRecentGlobalMfaApi } from "@/lib/tenant-auth";

function jsonError(status: number, error: string) {
  return NextResponse.json({ ok: false, error }, { status });
}

export async function GET(req: Request) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.email || !isSuperadminEmail(session.user.email)) {
    return jsonError(403, "Forbidden");
  }

  const u = new URL(req.url);
  const tenantId = u.searchParams.get("tenantId");
  if (!tenantId) return jsonError(400, "Missing tenantId");

  const row = await prisma.tenantPlan.findUnique({
    where: { tenantId },
    select: { plan: true, features: true, mfaRequired: true, updatedAt: true },
  });

  return NextResponse.json({
    ok: true,
    plan: (row?.plan as any) ?? "COMPLIANCE",
    features: (row?.features as any) ?? null,
    mfaRequired: !!row?.mfaRequired,
    updatedAt: row?.updatedAt ?? null,
  });
}

export async function POST(req: Request) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.email || !isSuperadminEmail(session.user.email)) {
    return jsonError(403, "Forbidden");
  }

  const actor = await prisma.user.findUnique({ where: { email: session.user.email }, select: { id: true } });
  if (!actor?.id) return jsonError(401, "Unauthorized");
  // Sensitive control-plane change: require recent GLOBAL MFA verification.
  const reauth = await requireRecentGlobalMfaApi({ userId: actor.id });
  if (!reauth.ok) return reauth.res;

  let body: any = null;
  try {
    body = await req.json();
  } catch {
    return jsonError(400, "Invalid JSON");
  }

  const tenantId = String(body?.tenantId ?? "");
  const plan = String(body?.plan ?? "") as PlanTier;
  const addons = body?.addons ?? {};
  const overrides = body?.overrides ?? null;
  const mfaRequired = body?.mfaRequired;

  if (!tenantId) return jsonError(400, "Missing tenantId");
  if (!["CONTROL", "COMPLIANCE", "ASSURED"].includes(plan)) return jsonError(400, "Invalid plan");

  const payload = buildPlanPayload({
    plan,
    addons: { webSimple: !!addons.webSimple, security: !!addons.security },
    overrides: overrides ?? undefined,
  });

  const before = await prisma.tenantPlan.findUnique({
    where: { tenantId },
    select: { plan: true, features: true, mfaRequired: true },
  });

  const saved = await prisma.tenantPlan.upsert({
    where: { tenantId },
    create: { tenantId, plan: plan as any, features: payload as any, mfaRequired: !!mfaRequired },
    update: { plan: plan as any, features: payload as any, ...(mfaRequired !== undefined ? { mfaRequired: !!mfaRequired } : {}) },
    select: { plan: true, features: true, mfaRequired: true, updatedAt: true },
  });

  // Advanced audit (best-effort): record plan / module changes
  try {
    const prevPlan = (before?.plan as any) ?? null;
    const nextPlan = saved.plan as any;
    const prevModules = (before?.features as any)?.modules ?? null;
    const nextModules = (payload as any)?.modules ?? null;

    const prevMfa = !!before?.mfaRequired;
    const nextMfa = !!saved?.mfaRequired;

    const modulesDiff: any = {};
    if (prevModules && nextModules) {
      for (const k of Object.keys(nextModules)) {
        if (prevModules[k] !== nextModules[k]) {
          modulesDiff[k] = { from: prevModules[k], to: nextModules[k] };
        }
      }
    }

    await auditLog({
      tenantId,
      actorUserId: actor?.id ?? null,
      action: "tenant.plan.update",
      targetType: "TenantPlan",
      targetId: tenantId,
      metaJson: {
        category: "CONFIG",
        fromPlan: prevPlan,
        toPlan: nextPlan,
        mfaRequired: { from: prevMfa, to: nextMfa },
        modulesDiff: Object.keys(modulesDiff).length ? modulesDiff : undefined,
        addons,
        overrides,
      },
    });

    if (prevMfa !== nextMfa) {
      await auditLog({
        tenantId,
        actorUserId: actor?.id ?? null,
        action: nextMfa ? "mfa.policy.enabled" : "mfa.policy.disabled",
        targetType: "TenantPlan",
        targetId: tenantId,
        metaJson: {
          category: "SECURITY",
          from: prevMfa,
          to: nextMfa,
          via: "superadmin",
        },
      });
    }
  } catch {
    // ignore
  }

  return NextResponse.json({ ok: true, plan: saved.plan, features: saved.features, mfaRequired: !!saved.mfaRequired, updatedAt: saved.updatedAt });
}
