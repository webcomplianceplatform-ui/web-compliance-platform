import { prisma } from "@/lib/db";

export async function auditLog(params: {
  tenantId?: string | null;
  actorUserId?: string | null;
  action: string;
  targetType?: string | null;
  targetId?: string | null;
  meta?: any;
}) {
  try {
    await prisma.auditEvent.create({
      data: {
        tenantId: params.tenantId ?? null,
        actorUserId: params.actorUserId ?? null,
        action: params.action,
        targetType: params.targetType ?? null,
        targetId: params.targetId ?? null,
        metaJson: params.meta ?? undefined,
      },
    });
  } catch {
    // best-effort
  }
}
