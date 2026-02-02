import { prisma } from "@/lib/db";
import { requireTenantContextApi, canManageSettings } from "@/lib/tenant-auth";
import { sanitizeTheme } from "@/lib/theme-merge";
import { z } from "zod";
import { parseJson, jsonOk, jsonError } from "@/lib/api-helpers";
import { getClientIp } from "@/lib/ip";
import { rateLimit } from "@/lib/rate-limit";
import { auditLog } from "@/lib/audit";

const ThemeUpdateSchema = z.object({
  tenant: z.string().min(1),
  theme: z.any(),
});

export async function POST(req: Request) {
  const parsed = await parseJson(req, ThemeUpdateSchema);
  if (parsed.ok === false) return parsed.res;

  const { tenant, theme: themePatch } = parsed.data;

  const auth = await requireTenantContextApi(tenant);
  if (auth.ok === false) return auth.res;

  const ip = getClientIp(req);
  const rl = rateLimit({ key: `settings:theme:${auth.ctx.tenantId}:${ip}`, limit: 30, windowMs: 60_000 });
  if (rl.ok === false) return jsonError("rate_limited", 429, { retryAfterSec: rl.retryAfterSec });

  if (!canManageSettings(auth.ctx.role, auth.ctx.isSuperadmin)) return jsonError("forbidden", 403);

  // 🔐 Backend hardening: sensitive settings are NOT editable via this endpoint.
  // Use /api/app/settings/legal, /api/app/settings/seo and /api/app/settings/site-builder instead.
  const patch: any = { ...(themePatch ?? {}) };
  delete patch.legal;
  delete patch.legalDocs;
  delete patch.seo;
  delete patch.siteBuilder;


  // ✅ size guard (simple): evita reventar DB con JSON enorme
  try {
    const raw = JSON.stringify(patch ?? {});
    if (raw.length > 250_000) return jsonError("theme_too_large", 413);
  } catch {
    return jsonError("invalid_theme", 400);
  }

  const theme = sanitizeTheme(patch);

  await prisma.tenant.update({
    where: { id: auth.ctx.tenantId },
    data: { themeJson: theme as any },
    select: { id: true },
  });

  await auditLog({
    tenantId: auth.ctx.tenantId,
    actorUserId: auth.ctx.user.id,
    action: "tenant.theme.update",
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

  // ✅ RL for GET too
  const ip = getClientIp(req);
  const rl = rateLimit({ key: `settings:theme:get:${auth.ctx.tenantId}:${ip}`, limit: 120, windowMs: 60_000 });
  if (rl.ok === false) return jsonError("rate_limited", 429, { retryAfterSec: rl.retryAfterSec });

  const t = await prisma.tenant.findUnique({
    where: { id: auth.ctx.tenantId },
    select: { themeJson: true },
  });

  const rawTheme: any = t?.themeJson ?? null;
  if (!auth.ctx.isSuperadmin && rawTheme) {
    // 🔐 Do not leak sensitive settings to non-superadmins
    delete rawTheme.legal;
    delete rawTheme.legalDocs;
    delete rawTheme.seo;
  }

  return jsonOk({ theme: rawTheme });
}
