import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { z } from "zod";
import { parseJson, jsonOk, jsonError } from "@/lib/api-helpers";
import { getClientIp } from "@/lib/ip";
import { rateLimit } from "@/lib/rate-limit";
import { auditLog } from "@/lib/audit";

function normalizeSlug(input: string) {
  return input.trim().toLowerCase();
}

function isValidSlug(slug: string) {
  return /^[a-z0-9](?:[a-z0-9-]{0,30}[a-z0-9])?$/.test(slug);
}

const RESERVED = new Set([
  "api",
  "app",
  "t",
  "login",
  "logout",
  "auth",
  "admin",
  "www",
  "support",
]);

export async function GET() {
  const session = await getServerSession(authOptions);
  if (!session?.user?.email) return jsonError("unauthorized", 401);

  const user = await prisma.user.findUnique({ where: { email: session.user.email }, select: { id: true } });
  if (!user) return jsonError("unauthorized", 401);

  const memberships = await prisma.userTenant.findMany({
    where: { userId: user.id },
    select: { role: true, tenant: { select: { slug: true, name: true, status: true } } },
    orderBy: { createdAt: "asc" },
  });

  return jsonOk({
    tenants: memberships.map((m) => ({
      slug: m.tenant.slug,
      name: m.tenant.name,
      status: m.tenant.status,
      role: m.role,
    })),
  });
}

const CreateTenantSchema = z.object({
  slug: z.string().min(1),
  name: z.string().min(1).max(120),
});

export async function POST(req: Request) {
const session = await getServerSession(authOptions);
if (!session?.user?.email) return jsonError("unauthorized", 401);

const user = await prisma.user.findUnique({
  where: { email: session.user.email },
  select: { id: true, email: true },
});
if (!user) return jsonError("unauthorized", 401);

const ip = getClientIp(req);
const rl = rateLimit({ key: `tenants:create:${user.id}:${ip}`, limit: 10, windowMs: 60_000 });
if (rl.ok === false) {
  return jsonError("rate_limited", 429, { retryAfterSec: rl.retryAfterSec });
}


  const parsed = await parseJson(req, CreateTenantSchema);
  if (parsed.ok === false) {
    return parsed.res;
  }

  const slug = normalizeSlug(parsed.data.slug);
  const name = parsed.data.name.trim();

  if (!isValidSlug(slug) || RESERVED.has(slug)) return jsonError("invalid_slug", 400);

  const existing = await prisma.tenant.findUnique({ where: { slug }, select: { id: true } });
  if (existing) return jsonError("slug_taken", 409);
const count = await prisma.userTenant.count({ where: { userId: user.id } });
if (count >= 20) return jsonError("tenant_limit", 429);

  const tenant = await prisma.tenant.create({
    data: { slug, name, status: "TRIAL", themeJson: {} },
    select: { id: true, slug: true },
  });

  await prisma.userTenant.create({ data: { userId: user.id, tenantId: tenant.id, role: "OWNER" } });

  await auditLog({
    tenantId: tenant.id,
    actorUserId: user.id,
    action: "tenant.create",
    targetType: "tenant",
    targetId: tenant.id,
    metaJson: { slug: tenant.slug, name },
  });

  return jsonOk({ slug: tenant.slug });
}
