import { prisma } from "@/lib/db";

export type AccessEventKind =
  | "LOGIN_SUCCESS"
  | "LOGIN_FAIL"
  | "MFA_SUCCESS"
  | "MFA_FAIL"
  | "SESSION_REVOKED"
  | "LOGOUT";

export async function logAccessEvent(input: {
  kind: AccessEventKind | (string & {});
  userId?: string | null;
  tenantId?: string | null;
  ip?: string | null;
  userAgent?: string | null;
  metaJson?: any;
}) {
  try {
    await prisma.accessEvent.create({
      data: {
        kind: input.kind,
        userId: input.userId ?? null,
        tenantId: input.tenantId ?? null,
        ip: input.ip ?? null,
        userAgent: input.userAgent ?? null,
        metaJson: input.metaJson ?? undefined,
      },
    });
  } catch {
    // Never block auth flows on logging.
  }
}
