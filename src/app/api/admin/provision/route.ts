import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { isSuperadminEmail } from "@/lib/superadmin";
import { z } from "zod";
import bcrypt from "bcryptjs";
import { rateLimit } from "@/lib/rate-limit";
import { getClientIp } from "@/lib/ip";
import { auditLog } from "@/lib/audit";
import { buildPlanPayload } from "@/lib/tenant-plan";
import { requireRecentGlobalMfaApi } from "@/lib/tenant-auth";

const RESERVED = new Set(["api", "app", "t", "login", "logout", "auth", "admin", "www", "support"]);
const SlugSchema = z
  .string()
  .min(1)
  .transform((s) => s.trim().toLowerCase())
  .refine((s) => /^[a-z0-9](?:[a-z0-9-]{0,30}[a-z0-9])?$/.test(s), "invalid_slug")
  .refine((s) => !RESERVED.has(s), "reserved_slug");

const BodySchema = z.object({
  tenantSlug: SlugSchema,
  tenantName: z.string().min(1).max(120).transform((s) => s.trim()),
  userEmail: z.string().email().transform((e) => e.trim().toLowerCase()),
  userName: z.string().max(120).optional(),
  role: z.enum(["OWNER", "ADMIN", "CLIENT", "VIEWER"]).default("OWNER"),
});

function unauthorized() {
  return NextResponse.json({ ok: false, error: "unauthorized" }, { status: 401 });
}
function forbidden() {
  return NextResponse.json({ ok: false, error: "forbidden" }, { status: 403 });
}

export async function POST(req: Request) {
  const session = await getServerSession(authOptions);
  const actorEmail = session?.user?.email ?? null;
  if (!actorEmail) return unauthorized();
  if (!isSuperadminEmail(actorEmail)) return forbidden();

  // Require a recent GLOBAL MFA verification for sensitive control-plane actions.
  const actor = await prisma.user.findUnique({ where: { email: actorEmail }, select: { id: true } }).catch(() => null);
  if (!actor?.id) return unauthorized();
  const reauth = await requireRecentGlobalMfaApi({ userId: actor.id });
  if (!reauth.ok) return reauth.res;

  // ✅ Rate limit AFTER superadmin check
  const ip = getClientIp(req);
  const rl = rateLimit({ key: `admin:provision:${ip}`, limit: 10, windowMs: 60_000 });
  if (rl.ok === false) {
    return NextResponse.json(
      { ok: false, error: "rate_limited", retryAfterSec: rl.retryAfterSec },
      { status: 429 }
    );
  }

  const json = await req.json().catch(() => null);
  const parsed = BodySchema.safeParse(json);
  if (!parsed.success) {
    return NextResponse.json({ ok: false, error: "invalid_input", issues: parsed.error.issues }, { status: 400 });
  }

  // ✅ Rate limit by userEmail too
  const rlEmail = rateLimit({
    key: `admin:provision:email:${parsed.data.userEmail}`,
    limit: 20,
    windowMs: 60_000,
  });
  if (rlEmail.ok === false) {
    return NextResponse.json(
      { ok: false, error: "rate_limited", retryAfterSec: rlEmail.retryAfterSec },
      { status: 429 }
    );
  }

  const { tenantSlug, tenantName, userEmail, userName, role } = parsed.data;

  // Generate temp password only if needed
  const tempPassword = "Temp-" + Math.random().toString(36).slice(2, 10);
  const tempHash = await bcrypt.hash(tempPassword, 10);

  const result = await prisma.$transaction(async (tx) => {
    const tenant = await tx.tenant.upsert({
      where: { slug: tenantSlug },
      update: { name: tenantName },
      create: { slug: tenantSlug, name: tenantName, status: "TRIAL", themeJson: {} },
      select: { id: true, slug: true, name: true },
    });

    const existingUser = await tx.user.findUnique({
      where: { email: userEmail },
      select: { id: true, passwordHash: true },
    });

    let createdOrResetPassword = false;

    const user = await tx.user.upsert({
      where: { email: userEmail },
      update: {
        ...(userName ? { name: userName } : {}),
        ...(existingUser?.passwordHash ? {} : { passwordHash: tempHash }),
      },
      create: {
        email: userEmail,
        name: userName ?? null,
        passwordHash: tempHash,
      },
      select: { id: true, email: true },
    });

    if (!existingUser || !existingUser.passwordHash) createdOrResetPassword = true;

    await tx.userTenant.upsert({
      where: { userId_tenantId: { userId: user.id, tenantId: tenant.id } },
      update: { role },
      create: { userId: user.id, tenantId: tenant.id, role },
    });

    // Default plan/features for new tenants (can be customized later in Admin → Plan)
    await tx.tenantPlan.upsert({
      where: { tenantId: tenant.id },
      update: {},
      create: {
        tenantId: tenant.id,
        plan: "COMPLIANCE",
        features: {
          tier: "COMPLIANCE",
          addons: { webSimple: false, security: false },
          overrides: {},
          features: buildPlanPayload({ plan: "COMPLIANCE" }),
        },
      },
    });

    return { tenant, user, createdOrResetPassword };
  });

  // ✅ best-effort audit
  await auditLog({
    tenantId: result.tenant.id,
    actorUserId: actor?.id ?? null,
    action: "admin.provision",
    targetType: "tenant",
    targetId: result.tenant.id,
    metaJson: {
      tenantSlug: result.tenant.slug,
      userEmail: result.user.email,
      role,
      tempPasswordGenerated: result.createdOrResetPassword,
      actorEmail,
    },
  });

  return NextResponse.json({
    ok: true,
    tenant: { slug: result.tenant.slug, name: result.tenant.name },
    user: { email: result.user.email, role },
    tempPassword: result.createdOrResetPassword ? tempPassword : null,
  });
}
