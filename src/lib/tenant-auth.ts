import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { UserRole } from "@prisma/client";
import { redirect } from "next/navigation";
import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { isSuperadminEmail } from "@/lib/superadmin";

const IMPERSONATE_COOKIE = "wc_impersonate_tenant";

/** ✅ Para PAGES/LAYOUTS (puede hacer redirect) */
export async function requireTenantContextPage(tenantSlug: string) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.email) redirect("/login");

  const user = await prisma.user.findUnique({
    where: { email: session.user.email },
    select: { id: true, email: true, name: true },
  });
  if (!user) redirect("/login");

  const membership = await prisma.userTenant.findFirst({
    where: { userId: user.id, tenant: { slug: tenantSlug } },
    select: { role: true, tenantId: true },
  });

  // ✅ Clean impersonation: superadmin can access a tenant ONLY if an explicit cookie is set.
  if (!membership) {
    const email = session.user.email;
    const cookieTenant = cookies().get(IMPERSONATE_COOKIE)?.value ?? null;
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
        isImpersonating: true as const,
      };
    }

    redirect("/login");
  }

  return {
    user,
    tenantId: membership.tenantId,
    role: membership.role as UserRole,
    isImpersonating: false as const,
  };
}

/** ✅ Para API (NUNCA redirect; devuelve errores JSON) */
export async function requireTenantContextApi(tenantSlug: string) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.email) {
    return { ok: false as const, res: NextResponse.json({ ok: false, error: "unauthorized" }, { status: 401 }) };
  }

  const user = await prisma.user.findUnique({
    where: { email: session.user.email },
    select: { id: true, email: true, name: true },
  });
  if (!user) {
    return { ok: false as const, res: NextResponse.json({ ok: false, error: "unauthorized" }, { status: 401 }) };
  }

  const membership = await prisma.userTenant.findFirst({
    where: { userId: user.id, tenant: { slug: tenantSlug } },
    select: { role: true, tenantId: true },
  });

  if (!membership) {
    const email = session.user.email;
    const cookieTenant = cookies().get(IMPERSONATE_COOKIE)?.value ?? null;
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
        ctx: { user, tenantId: tenant.id, role: UserRole.OWNER, isImpersonating: true as const },
      };
    }

    return { ok: false as const, res: NextResponse.json({ ok: false, error: "forbidden" }, { status: 403 }) };
  }

  return {
    ok: true as const,
    ctx: { user, tenantId: membership.tenantId, role: membership.role as UserRole, isImpersonating: false as const },
  };
}

export function canManageTickets(role: UserRole) {
  return role === UserRole.OWNER || role === UserRole.ADMIN;
}
export function canManageSettings(role: string) {
  return role === "OWNER" || role === "ADMIN";
}

export function canManageUsers(role: UserRole) {
  return role === UserRole.OWNER || role === UserRole.ADMIN;
}
