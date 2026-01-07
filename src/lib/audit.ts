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
  meta?: any;
  metaJson?: any;
}) {
  try {
    const metaJson = params.metaJson ?? params.meta ?? undefined;

    await prisma.auditEvent.create({
      data: {
        tenantId: params.tenantId ?? null,
        actorUserId: params.actorUserId ?? null,
        action: params.action,
        targetType: params.targetType ?? null,
        targetId: params.targetId ?? null,
        metaJson,
      },
    });
  } catch {
    // best-effort
  }
}
