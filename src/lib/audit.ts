import { prisma } from "@/lib/db";

/**
 * Centralized audit logging.
 *
 * NOTE: Prisma schema uses `metaJson` (NOT `meta`).
 * We keep the public function param as `meta` for convenience/backwards-compat,
 * but also accept `metaJson` to match some newer call sites.
 */
export async function auditLog(params: {
  tenantId?: string | null;
  actorUserId?: string | null;
  action: string;
  targetType?: string | null;
  targetId?: string | null;
  ip?: string | null;
  userAgent?: string | null;
  meta?: any;
  metaJson?: any;
}) {

  try {
    const metaJson = params.metaJson ?? params.meta ?? undefined;

    const audit = await prisma.auditEvent.create({
  data: {
    tenantId: params.tenantId ?? null,
    actorUserId: params.actorUserId ?? null,
    action: params.action,
    targetType: params.targetType ?? null,
    targetId: params.targetId ?? null,
    ip: params.ip ?? null,
    userAgent: params.userAgent ?? null,
    metaJson,
  },
  select: { id: true, tenantId: true, action: true, createdAt: true },
});


    // Best-effort: Security alerts (only when tenant has Security add-on enabled)
    if (audit.tenantId) {
      await maybeCreateSecurityAlert({
        tenantId: audit.tenantId,
        auditId: audit.id,
        action: audit.action,
        metaJson,
      });
    }
  } catch {
    // best-effort
  }
}

async function maybeCreateSecurityAlert(args: {
  tenantId: string;
  auditId: string;
  action: string;
  metaJson: any;
}) {
  try {
    const plan = await prisma.tenantPlan.findUnique({
      where: { tenantId: args.tenantId },
      select: { features: true },
    });

    const f: any = plan?.features ?? null;
    const secEnabled = !!f?.modules?.security;
    const alertsEnabled = !!f?.security?.alerts;
    if (!secEnabled || !alertsEnabled) return;

    // Map existing action keys to human alerts.
    const m = buildAlertMessage(args.action, args.metaJson);
    if (!m) return;

    await prisma.securityAlert.create({
      data: {
        tenantId: args.tenantId,
        auditId: args.auditId,
        level: m.level,
        message: m.message,
      },
    });
  } catch {
    // best-effort
  }
}

function buildAlertMessage(action: string, metaJson: any): { level: string; message: string } | null {
  // Plan tiers for downgrade detection
  const tierRank = (p: string | null | undefined) => {
    if (!p) return -1;
    const v = String(p).toUpperCase();
    if (v === "CONTROL") return 0;
    if (v === "COMPLIANCE") return 1;
    if (v === "ASSURED") return 2;
    return -1;
  };

  switch (action) {
    case "mfa.policy.enabled":
      return { level: "WARN", message: "MFA enforcement enabled" };
    case "mfa.policy.disabled":
      return { level: "WARN", message: "MFA enforcement disabled" };
    case "mfa.enrolled":
      return { level: "INFO", message: "MFA enrolled" };
    case "mfa.verify.failed":
      return { level: "WARN", message: "MFA verification failed" };
    case "mfa.recovery.generated":
      return { level: "INFO", message: "Recovery codes generated" };
    case "mfa.recovery.used":
      return { level: "WARN", message: "Recovery code used" };
    case "mfa.user.removed":
      return { level: "HIGH", message: "MFA removed for a user" };
    case "admin.impersonation_start": {
      const slug = metaJson?.tenantSlug;
      return {
        level: "WARN",
        message: slug ? `Superadmin impersonated tenant: ${slug}` : "Superadmin impersonation started",
      };
    }

    case "tenant.plan.update": {
      const from = metaJson?.fromPlan;
      const to = metaJson?.toPlan;
      const fromR = tierRank(from);
      const toR = tierRank(to);
      const downgrade = fromR !== -1 && toR !== -1 && toR < fromR;

      // Module diffs (best-effort). Example:
      // { security: {from:true,to:false}, legal: {from:true,to:false} }
      const md = metaJson?.modulesDiff ?? {};
      const securityDisabled = md?.security?.from === true && md?.security?.to === false;
      const legalDisabled = md?.legal?.from === true && md?.legal?.to === false;

      if (securityDisabled) {
        return { level: "WARN", message: "Security module disabled" };
      }
      if (legalDisabled) {
        return { level: "WARN", message: "Legal module disabled" };
      }

      if (downgrade) {
        return {
          level: "WARN",
          message: from && to ? `Plan downgraded: ${from} → ${to}` : "Plan downgraded",
        };
      }

      return {
        level: "INFO",
        message: from && to ? `Plan updated: ${from} → ${to}` : "Plan updated",
      };
    }
    case "tenant.legal.update":
      return { level: "INFO", message: "Legal settings updated" };
    case "tenant.domain.update":
    case "tenant.domain.verify":
      return { level: "INFO", message: "Domain settings updated" };
    case "tenant.user.add":
    case "tenant.user.invite":
      return { level: "INFO", message: "User added / invited" };
    case "tenant.user.remove":
      return { level: "WARN", message: "User removed" };
    case "tenant.user.role.update":
      return { level: "INFO", message: "User role updated" };
    default:
      return null;
  }
}
