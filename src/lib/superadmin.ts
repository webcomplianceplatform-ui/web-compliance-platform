import { getServerSession } from "next-auth";
import { notFound, redirect } from "next/navigation";
import { authOptions } from "@/lib/auth";
import { cookies } from "next/headers";

export async function requireSuperadminPage() {
  const session = await getServerSession(authOptions);
  const email = session?.user?.email ?? null;
  if (!session || !isSuperadminEmail(email)) notFound();

  // Resolve actor id to bind the GLOBAL MFA cookie to the same user.
  const { prisma } = await import("@/lib/db");
  const actor = await prisma.user.findUnique({ where: { email: String(email) }, select: { id: true, sessionVersion: true } }).catch(() => null);

  // Enforce server-side session validity (sessionVersion + per-session revoke).
  if (actor?.id) {
    const { enforceSessionActivePage } = await import("@/lib/session");
    await enforceSessionActivePage({
      sessionUser: session.user as any,
      dbUser: { id: actor.id, sessionVersion: actor.sessionVersion ?? 0 },
      checkStepUp: true,
      stepUpCallbackUrl: "/app/admin",
    });
  }

  // Enforce GLOBAL MFA verification for the control-plane.
  const cookieStore = await cookies();
  const { verifyMfaCookie, mfaCookieNameGlobal, MFA_GLOBAL_TENANT_ID } = await import("@/lib/mfa");
  const raw = cookieStore.get(mfaCookieNameGlobal())?.value ?? null;
  const payload = raw ? verifyMfaCookie(raw) : null;
  const ok = !!payload && payload.tenantId === MFA_GLOBAL_TENANT_ID && (!actor?.id || payload.uid === actor.id);
  if (!ok) {
    redirect(`/app/account/mfa/verify?callbackUrl=${encodeURIComponent(`/app/admin`)}`);
  }
  return {
    email,
    actorUserId: actor?.id ?? null,
    currentSessionId: (session.user as any)?.sessionId ?? null,
  };
}
/**
 * SUPERADMIN is intentionally separate from tenant roles.
 * MVP approach: an env-driven allowlist.
 */
export function getSuperadminEmails(): string[] {
  // dotenv usually strips quotes, but we handle them defensively.
  const raw = (process.env.SUPERADMIN_EMAILS ?? "").replace(/^"|"$/g, "");
  return raw
    .split(",")
    .map((s) => s.trim().toLowerCase())
    .filter(Boolean);
}

export function isSuperadminEmail(email: string | null | undefined): boolean {
  if (!email) return false;
  const allow = getSuperadminEmails();
  if (allow.length === 0) return false;
  return allow.includes(email.trim().toLowerCase());
}
