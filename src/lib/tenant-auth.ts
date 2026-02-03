import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { UserRole } from "@prisma/client";
import { redirect } from "next/navigation";
import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { isSuperadminEmail } from "@/lib/superadmin";
import { getTenantFeatures, type TenantFeatures } from "@/lib/tenant-plan";

const IMPERSONATE_COOKIE = "wc_impersonate_tenant";

/** ✅ Para PAGES/LAYOUTS (puede hacer redirect) */
export async function requireTenantContextPage(
  tenantSlug: string,
  opts?: { skipMfaEnforcement?: boolean }
) {
  const cookieStore = await cookies();

  const session = await getServerSession(authOptions);
  if (!session?.user?.email) redirect("/login");

  const user = await prisma.user.findUnique({
    where: { email: session.user.email },
    select: { id: true, email: true, name: true, mfaEnabled: true, sessionVersion: true },
  });
  if (!user) redirect("/login");

  // Enforce server-side session validity (sessionVersion + per-session revoke).
  const { enforceSessionActivePage } = await import("@/lib/session");
  await enforceSessionActivePage({ sessionUser: session.user as any, dbUser: { id: user.id, sessionVersion: user.sessionVersion ?? 0 } });

  const membership = await prisma.userTenant.findFirst({
    where: { userId: user.id, tenant: { slug: tenantSlug } },
    select: { role: true, tenantId: true },
  });

  // ✅ Clean impersonation: superadmin can access a tenant ONLY if an explicit cookie is set.
  if (!membership) {
    const email = session.user.email;
    const cookieTenant = cookieStore.get(IMPERSONATE_COOKIE)?.value ?? null;
    if (isSuperadminEmail(email) && cookieTenant && cookieTenant === tenantSlug) {
      const tenant = await prisma.tenant.findUnique({
        where: { slug: tenantSlug },
        select: { id: true },
      });
      if (!tenant) redirect("/app/admin");
      return {
        user,
        tenantId: tenant.id,
        role: UserRole.OWNER,
        isSuperadmin: true as const,
        isImpersonating: true as const,
    features: await getTenantFeatures(tenant.id),
      };
    }

    redirect("/login");
  }

  const features = await getTenantFeatures(membership.tenantId);
  // --- MFA enforcement (tenant policy) ---
  // Policy is tenant-scoped: if enabled, users must be enrolled + verified.
  // Superadmin impersonation bypasses MFA to avoid lockouts, but is audited elsewhere.
  if (!opts?.skipMfaEnforcement && !!features.mfaRequired && !isSuperadminEmail(session.user.email)) {
    const { verifyMfaCookie, mfaCookieName } = await import("@/lib/mfa");
    const cookie = cookieStore.get(mfaCookieName(membership.tenantId))?.value;
    const ok = cookie ? verifyMfaCookie(cookie) : null;
    const verified = !!ok && ok.uid === user.id && ok.tenantId === membership.tenantId;
    if (!verified) {
      if (!user.mfaEnabled) {
        redirect(`/app/mfa/${tenantSlug}/enroll?callbackUrl=${encodeURIComponent(`/app/${tenantSlug}`)}`);
      }
      redirect(`/app/mfa/${tenantSlug}/verify?callbackUrl=${encodeURIComponent(`/app/${tenantSlug}`)}`);
    }
  }

  return {
    user,
    tenantId: membership.tenantId,
    role: membership.role as UserRole,
    isSuperadmin: isSuperadminEmail(session.user.email),
    features,
    isImpersonating: false as const,
  };
}

/** ✅ Para API (NUNCA redirect; devuelve errores JSON) */
export async function requireTenantContextApi(
  tenantSlug: string,
  opts?: { skipMfaEnforcement?: boolean }
) {
  const cookieStore = await cookies();

  const session = await getServerSession(authOptions);
  if (!session?.user?.email) {
    return { ok: false as const, res: NextResponse.json({ ok: false, error: "unauthorized" }, { status: 401 }) };
  }

  const user = await prisma.user.findUnique({
    where: { email: session.user.email },
    select: { id: true, email: true, name: true, mfaEnabled: true, sessionVersion: true },
  });
  if (!user) {
    return { ok: false as const, res: NextResponse.json({ ok: false, error: "unauthorized" }, { status: 401 }) };
  }

  // Enforce server-side session validity (sessionVersion + per-session revoke).
  const { enforceSessionActiveApi } = await import("@/lib/session");
  const active = await enforceSessionActiveApi({ sessionUser: session.user as any, dbUser: { id: user.id, sessionVersion: user.sessionVersion ?? 0 } });
  if (!active.ok) return { ok: false as const, res: active.res };

  const membership = await prisma.userTenant.findFirst({
    where: { userId: user.id, tenant: { slug: tenantSlug } },
    select: { role: true, tenantId: true },
  });

  if (!membership) {
    const email = session.user.email;
    const cookieTenant = cookieStore.get(IMPERSONATE_COOKIE)?.value ?? null;
    if (isSuperadminEmail(email) && cookieTenant && cookieTenant === tenantSlug) {
      const tenant = await prisma.tenant.findUnique({
        where: { slug: tenantSlug },
        select: { id: true },
      });
      if (!tenant) {
        return {
          ok: false as const,
          res: NextResponse.json({ ok: false, error: "not_found" }, { status: 404 }),
        };
      }
      return {
        ok: true as const,
        ctx: { user, tenantId: tenant.id, role: UserRole.OWNER, isSuperadmin: true as const, isImpersonating: true as const, features: await getTenantFeatures(tenant.id) },
      };
    }

    return { ok: false as const, res: NextResponse.json({ ok: false, error: "forbidden" }, { status: 403 }) };
  }

  const features = await getTenantFeatures(membership.tenantId);

  // MFA enforcement for API: return 428 (Precondition Required)
  if (!opts?.skipMfaEnforcement && !!features.mfaRequired && !isSuperadminEmail(session.user.email)) {
    const { verifyMfaCookie, mfaCookieName } = await import("@/lib/mfa");
    const cookie = cookieStore.get(mfaCookieName(membership.tenantId))?.value;
    const ok = cookie ? verifyMfaCookie(cookie) : null;
    const verified = !!ok && ok.uid === user.id && ok.tenantId === membership.tenantId;
    if (!verified) {
      return {
        ok: false as const,
        res: NextResponse.json(
          { ok: false, error: "mfa_required", enrolled: !!user.mfaEnabled },
          { status: 428 }
        ),
      };
    }
  }

  return {
    ok: true as const,
    ctx: {
      user,
      tenantId: membership.tenantId,
      role: membership.role as UserRole,
      isSuperadmin: isSuperadminEmail(session.user.email),
      features,
      isImpersonating: false as const,
    },
  };
}

export function canManageTickets(role: UserRole) {
  return role === UserRole.OWNER || role === UserRole.ADMIN;
}

// Backwards-compatible alias used across routes.
// "Settings" here means non-sensitive tenant settings (site/monitoring/etc.).
export function canManageSettings(role: UserRole, isSuperadmin = false) {
  return isSuperadmin || canManageSite(role);
}

/**
 * Settings is split into: Site (safe) vs Sensitive (legal/seo/domain).
 * - OWNER/ADMIN can manage site settings.
 * - Only SUPERADMIN can manage sensitive settings.
 */
export function canManageSite(role: UserRole) {
  return role === UserRole.OWNER || role === UserRole.ADMIN;
}

export function canManageSensitiveSettings(isSuperadmin: boolean) {
  return isSuperadmin;
}

export function canManageUsers(role: UserRole, isSuperadmin = false) {
  return isSuperadmin || role === UserRole.OWNER || role === UserRole.ADMIN;
}

export function allowedAssignableRoles(role: UserRole, isSuperadmin = false): UserRole[] {
  if (isSuperadmin) return [UserRole.OWNER, UserRole.ADMIN, UserRole.CLIENT, UserRole.VIEWER];
  if (role === UserRole.OWNER) return [UserRole.ADMIN, UserRole.CLIENT, UserRole.VIEWER];
  if (role === UserRole.ADMIN) return [UserRole.CLIENT, UserRole.VIEWER];
  return [];
}

// --- Re-auth helpers (MFA-based) ---
// Used for sensitive actions (role changes, MFA policy, MFA removal, exports).
export async function requireRecentMfaApi(opts: {
  tenantSlug: string;
  tenantId: string;
  userId: string;
  maxAgeMs?: number;
  reauthUrl?: string;
}) {
  const cookieStore = await cookies();
  const { verifyMfaCookie, mfaCookieName, mfaVerifiedRecently } = await import("@/lib/mfa");
  const cookie = cookieStore.get(mfaCookieName(opts.tenantId))?.value;
  const payload = cookie ? verifyMfaCookie(cookie) : null;
  const maxAgeMs = opts.maxAgeMs ?? 10 * 60 * 1000;
  const ok = !!payload && payload.uid === opts.userId && payload.tenantId === opts.tenantId && mfaVerifiedRecently(payload, maxAgeMs);
  if (!ok) {
    return {
      ok: false as const,
      res: NextResponse.json(
        {
          ok: false,
          error: "reauth_required",
          reauthUrl: opts.reauthUrl ?? `/app/mfa/${encodeURIComponent(String(opts.tenantSlug))}/verify`,
          maxAgeMs,
        },
        { status: 428 }
      ),
    };
  }
  return { ok: true as const };
}

// Global (superadmin) re-auth helper.
// Used for sensitive control-plane actions (provision, reset password, plan/policy changes).
export async function requireRecentGlobalMfaApi(opts: {
  userId: string;
  maxAgeMs?: number;
  reauthUrl?: string;
}) {
  const cookieStore = await cookies();
  const { verifyMfaCookie, mfaCookieNameGlobal, mfaVerifiedRecently, MFA_GLOBAL_TENANT_ID } = await import(
    "@/lib/mfa"
  );
  const cookie = cookieStore.get(mfaCookieNameGlobal())?.value;
  const payload = cookie ? verifyMfaCookie(cookie) : null;
  const maxAgeMs = opts.maxAgeMs ?? 10 * 60 * 1000;
  const ok =
    !!payload &&
    payload.uid === opts.userId &&
    payload.tenantId === MFA_GLOBAL_TENANT_ID &&
    mfaVerifiedRecently(payload, maxAgeMs);

  if (!ok) {
    return {
      ok: false as const,
      res: NextResponse.json(
        {
          ok: false,
          error: "reauth_required",
          reauthUrl: opts.reauthUrl ?? `/app/account/mfa/verify?callbackUrl=${encodeURIComponent(`/app/admin`)}`,
          maxAgeMs,
        },
        { status: 428 }
      ),
    };
  }
  return { ok: true as const };
}
