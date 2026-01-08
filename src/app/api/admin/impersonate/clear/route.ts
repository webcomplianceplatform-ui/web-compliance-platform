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

  // ✅ rate limit AFTER auth
  const ip = getClientIp(req);
  const rl = rateLimit({ key: `admin:impersonate:clear:${ip}`, limit: 60, windowMs: 60_000 });
  if (rl.ok === false) {
    return NextResponse.json({ ok: false, error: "rate_limited", retryAfterSec: rl.retryAfterSec }, { status: 429 });
  }

  const current = cookieStore.get(IMPERSONATE_COOKIE)?.value ?? null;

  cookieStore.set({
    name: IMPERSONATE_COOKIE,
    value: "",
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: 0,
  });

  if (current) {
    const tenant = await prisma.tenant.findUnique({ where: { slug: current }, select: { id: true } }).catch(() => null);
    const user = await prisma.user.findUnique({ where: { email }, select: { id: true } }).catch(() => null);

    await auditLog({
      tenantId: tenant?.id ?? null,
      actorUserId: user?.id ?? null,
      action: "superadmin_impersonation_end",
      targetType: "tenant",
      targetId: tenant?.id ?? null,
      metaJson: { tenantSlug: current, actorEmail: email },
    });
  }

  return NextResponse.json({ ok: true });
}
