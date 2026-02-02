import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { isSuperadminEmail } from "@/lib/superadmin";
import { prisma } from "@/lib/db";
import { auditLog } from "@/lib/audit";
import { getClientIp } from "@/lib/ip";
import { rateLimit } from "@/lib/rate-limit";

const IMPERSONATE_COOKIE = "wc_impersonate_tenant";

export async function POST(req: Request) {
  const cookieStore = await cookies();
  const session = await getServerSession(authOptions);
  const email = session?.user?.email ?? null;

  if (!email || !isSuperadminEmail(email)) {
    return NextResponse.json({ ok: false, error: "forbidden" }, { status: 403 });
  }

  // rate limit after auth
  const ip = getClientIp(req);
  const rl = rateLimit({ key: `admin:impersonate:stop:${ip}`, limit: 60, windowMs: 60_000 });
  if (rl.ok === false) {
    return NextResponse.json(
      { ok: false, error: "rate_limited", retryAfterSec: rl.retryAfterSec },
      { status: 429 }
    );
  }

  // Read current impersonated tenant slug from cookie
  const tenantSlug = cookieStore.get(IMPERSONATE_COOKIE)?.value ?? null;

  // Clear cookie no matter what (stop is idempotent)
  cookieStore.set({
    name: IMPERSONATE_COOKIE,
    value: "",
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: 0,
  });

  // If we don't know the tenant slug, we still return ok (idempotent)
  if (!tenantSlug) {
    return NextResponse.json({ ok: true, cleared: true, tenant: null });
  }

  // best-effort lookup (so we can store tenantId on audit)
  const tenant = await prisma.tenant
    .findUnique({ where: { slug: tenantSlug }, select: { id: true, slug: true } })
    .catch(() => null);

  // best-effort audit
  const user = await prisma.user.findUnique({ where: { email }, select: { id: true } }).catch(() => null);

  if (tenant) {
    await auditLog({
      tenantId: tenant.id,
      actorUserId: user?.id ?? null,
      action: "admin.impersonation_end",
      targetType: "tenant",
      targetId: tenant.id,
      metaJson: { category: "ACCESS", tenantSlug: tenant.slug, actorEmail: email },
    }).catch(() => null);
  }

  return NextResponse.json({ ok: true, cleared: true, tenant: tenantSlug });
}
