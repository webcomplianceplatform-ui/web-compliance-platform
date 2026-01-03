import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { UserRole } from "@prisma/client";
import { redirect } from "next/navigation";
import { NextResponse } from "next/server";

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
  if (!membership) redirect("/login");

  return { user, tenantId: membership.tenantId, role: membership.role as UserRole };
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
    return { ok: false as const, res: NextResponse.json({ ok: false, error: "forbidden" }, { status: 403 }) };
  }

  return { ok: true as const, ctx: { user, tenantId: membership.tenantId, role: membership.role as UserRole } };
}

export function canManageTickets(role: UserRole) {
  return role === UserRole.OWNER || role === UserRole.ADMIN;
}
export function canManageSettings(role: string) {
  return role === "OWNER" || role === "ADMIN";
}
