import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { isSuperadminEmail } from "@/lib/superadmin";
import { prisma } from "@/lib/db";
import { auditLog } from "@/lib/audit";

const IMPERSONATE_COOKIE = "wc_impersonate_tenant";

export async function POST(req: Request) {
  const session = await getServerSession(authOptions);
  const email = session?.user?.email ?? null;
  if (!email || !isSuperadminEmail(email)) {
    return NextResponse.json({ ok: false, error: "forbidden" }, { status: 403 });
  }

  const body = await req.json().catch(() => null);
  const tenantSlug = (body?.tenant ?? "").toString().trim();
  if (!tenantSlug) {
    return NextResponse.json({ ok: false, error: "missing_tenant" }, { status: 400 });
  }

  const tenant = await prisma.tenant.findUnique({
    where: { slug: tenantSlug },
    select: { id: true },
  });
  if (!tenant) {
    return NextResponse.json({ ok: false, error: "not_found" }, { status: 404 });
  }

  cookies().set({
    name: IMPERSONATE_COOKIE,
    value: tenantSlug,
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
  });

  // best-effort audit
  const user = await prisma.user.findUnique({ where: { email }, select: { id: true } }).catch(() => null);
  await auditLog({
    tenantId: tenant.id,
    actorUserId: user?.id ?? null,
    action: "superadmin_impersonation_start",
    targetType: "tenant",
    targetId: tenant.id,
    meta: { tenantSlug },
  });

  return NextResponse.json({ ok: true });
}
