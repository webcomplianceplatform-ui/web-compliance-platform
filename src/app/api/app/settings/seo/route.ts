import { prisma } from "@/lib/db";
import { requireTenantContextApi, canManageSensitiveSettings } from "@/lib/tenant-auth";
import { parseJson, jsonOk, jsonError } from "@/lib/api-helpers";
import { getClientIp } from "@/lib/ip";
import { rateLimit } from "@/lib/rate-limit";
import { auditLog } from "@/lib/audit";
import { storeSeoVersion } from "@/lib/theme-versioning";
import { requireModuleApi } from "@/lib/feature-guard";
import { z } from "zod";
import type { TenantTheme } from "@/lib/theme";

const SeoUpdateSchema = z.object({
  tenant: z.string().min(1),
  seo: z.any(),
});

export async function POST(req: Request) {
  const parsed = await parseJson(req, SeoUpdateSchema);
  if (parsed.ok === false) return parsed.res;

  const { tenant, seo } = parsed.data;

  const auth = await requireTenantContextApi(tenant);
  if (auth.ok === false) return auth.res;

  const gate = requireModuleApi(auth.ctx.features, "legal");
  if (gate) return gate;

  const ip = getClientIp(req);
  const rl = rateLimit({ key: `settings:seo:${auth.ctx.tenantId}:${ip}`, limit: 20, windowMs: 60_000 });
  if (rl.ok === false) return jsonError("rate_limited", 429, { retryAfterSec: rl.retryAfterSec });

  if (!canManageSensitiveSettings(auth.ctx.isSuperadmin)) return jsonError("forbidden", 403);

  const row = await prisma.tenant.findUnique({
    where: { id: auth.ctx.tenantId },
    select: { themeJson: true },
  });

  const current = ((row?.themeJson ?? {}) as TenantTheme) ?? ({} as TenantTheme);
  const prev = (current as any).seo ?? null;

  const nextBase: TenantTheme = { ...(current as any), seo } as TenantTheme;
  const versioned = storeSeoVersion(nextBase, prev, auth.ctx.user.email);

  await prisma.tenant.update({
    where: { id: auth.ctx.tenantId },
    data: { themeJson: versioned as any },
    select: { id: true },
  });

  await auditLog({
    tenantId: auth.ctx.tenantId,
    actorUserId: auth.ctx.user.id,
    action: "tenant.seo.update",
    targetType: "tenant",
    targetId: auth.ctx.tenantId,
    metaJson: { updated: true, isSuperadmin: true },
  });

  return jsonOk({});
}

export async function GET(req: Request) {
  const url = new URL(req.url);
  const tenant = url.searchParams.get("tenant");
  if (!tenant) return jsonError("missing_tenant", 400);

  const auth = await requireTenantContextApi(tenant);
  if (auth.ok === false) return auth.res;

  const ip = getClientIp(req);
  const rl = rateLimit({ key: `settings:seo:get:${auth.ctx.tenantId}:${ip}`, limit: 60, windowMs: 60_000 });
  if (rl.ok === false) return jsonError("rate_limited", 429, { retryAfterSec: rl.retryAfterSec });

  if (!canManageSensitiveSettings(auth.ctx.isSuperadmin)) return jsonError("forbidden", 403);

  const row = await prisma.tenant.findUnique({
    where: { id: auth.ctx.tenantId },
    select: { themeJson: true },
  });

  const theme = (row?.themeJson ?? null) as any;
  return jsonOk({ seo: theme?.seo ?? null, history: theme?.__history?.seo ?? [] });
}
