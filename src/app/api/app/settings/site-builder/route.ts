import { prisma } from "@/lib/db";
import { requireTenantContextApi, canManageSite } from "@/lib/tenant-auth";
import { parseJson, jsonOk, jsonError } from "@/lib/api-helpers";
import { getClientIp } from "@/lib/ip";
import { rateLimit } from "@/lib/rate-limit";
import { auditLog } from "@/lib/audit";
import { storeSiteBuilderVersion } from "@/lib/theme-versioning";
import { requireModuleApi } from "@/lib/feature-guard";
import { z } from "zod";
import type { TenantTheme } from "@/lib/theme";

const SiteBuilderUpdateSchema = z.object({
  tenant: z.string().min(1),
  siteBuilder: z.any(),
});

export async function POST(req: Request) {
  const parsed = await parseJson(req, SiteBuilderUpdateSchema);
  if (parsed.ok === false) return parsed.res;

  const { tenant, siteBuilder } = parsed.data;

  const auth = await requireTenantContextApi(tenant);
  if (auth.ok === false) return auth.res;

  const gate = requireModuleApi(auth.ctx.features, "web");
  if (gate) return gate;

  const ip = getClientIp(req);
  const rl = rateLimit({ key: `settings:site:${auth.ctx.tenantId}:${ip}`, limit: 30, windowMs: 60_000 });
  if (rl.ok === false) return jsonError("rate_limited", 429, { retryAfterSec: rl.retryAfterSec });

  if (!canManageSite(auth.ctx.role) && !auth.ctx.isSuperadmin) return jsonError("forbidden", 403);

  const row = await prisma.tenant.findUnique({ where: { id: auth.ctx.tenantId }, select: { themeJson: true } });
  const current = ((row?.themeJson ?? {}) as TenantTheme) ?? ({} as TenantTheme);
  const prev = (current as any).siteBuilder ?? null;

  const nextBase: TenantTheme = { ...(current as any), siteBuilder } as TenantTheme;
  const versioned = storeSiteBuilderVersion(nextBase, prev, auth.ctx.user.email);

  await prisma.tenant.update({ where: { id: auth.ctx.tenantId }, data: { themeJson: versioned as any } });

  await auditLog({
    tenantId: auth.ctx.tenantId,
    actorUserId: auth.ctx.user.id,
    action: "tenant.siteBuilder.update",
    targetType: "tenant",
    targetId: auth.ctx.tenantId,
    metaJson: { updated: true },
  });

  return jsonOk({});
}

export async function GET(req: Request) {
  const url = new URL(req.url);
  const tenant = url.searchParams.get("tenant");
  if (!tenant) return jsonError("missing_tenant", 400);

  const auth = await requireTenantContextApi(tenant);
  if (auth.ok === false) return auth.res;

  const gate = requireModuleApi(auth.ctx.features, "web");
  if (gate) return gate;

  const ip = getClientIp(req);
  const rl = rateLimit({ key: `settings:site:get:${auth.ctx.tenantId}:${ip}`, limit: 120, windowMs: 60_000 });
  if (rl.ok === false) return jsonError("rate_limited", 429, { retryAfterSec: rl.retryAfterSec });

  if (!canManageSite(auth.ctx.role) && !auth.ctx.isSuperadmin) return jsonError("forbidden", 403);

  const row = await prisma.tenant.findUnique({ where: { id: auth.ctx.tenantId }, select: { themeJson: true } });
  const theme = (row?.themeJson ?? null) as any;

  return jsonOk({ siteBuilder: theme?.siteBuilder ?? null, history: theme?.__history?.siteBuilder ?? [] });
}
