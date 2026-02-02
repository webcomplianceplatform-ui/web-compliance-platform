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

  // ✅ rate limit AFTER auth (so we don't waste it)
  const ip = getClientIp(req);
  const rl = rateLimit({ key: `admin:impersonate:start:${ip}`, limit: 30, windowMs: 60_000 });
  if (rl.ok === false) {
    return NextResponse.json(
      { ok: false, error: "rate_limited", retryAfterSec: rl.retryAfterSec },
      { status: 429 }
    );
  }

  const body = await req.json().catch(() => null);
  const tenantSlug = (body?.tenant ?? "").toString().trim();
  if (!tenantSlug) {
    return NextResponse.json({ ok: false, error: "missing_tenant" }, { status: 400 });
  }

  const tenant = await prisma.tenant.findUnique({
    where: { slug: tenantSlug },
    select: { id: true, slug: true },
  });

  if (!tenant) {
    return NextResponse.json({ ok: false, error: "not_found" }, { status: 404 });
  }

  cookieStore.set({
    name: IMPERSONATE_COOKIE,
    value: tenant.slug,
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: 60 * 60, // 1h
  });

  // best-effort audit (ACCESS category so UI can hide by default)
  const user = await prisma.user.findUnique({ where: { email }, select: { id: true } }).catch(() => null);
  await auditLog({
    tenantId: tenant.id,
    actorUserId: user?.id ?? null,
    action: "admin.impersonation_start",
    targetType: "tenant",
    targetId: tenant.id,
    metaJson: { category: "ACCESS", tenantSlug: tenant.slug, actorEmail: email },
  }).catch(() => null);

  return NextResponse.json({ ok: true });
}
