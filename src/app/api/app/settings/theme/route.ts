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
  const ip = getClientIp(req);
  const rl = rateLimit({ key: `settings:theme:${ip}`, limit: 30, windowMs: 60_000 });
  if (!rl.ok) return jsonError("rate_limited", 429, { retryAfterSec: rl.retryAfterSec });

  const parsed = await parseJson(req, ThemeUpdateSchema);
  if (!parsed.ok) return parsed.res;

  const { tenant, theme: themePatch } = parsed.data;

  const auth = await requireTenantContextApi(tenant);
  if (!auth.ok) return auth.res;

  if (!canManageSettings(auth.ctx.role)) {
    return jsonError("forbidden", 403);
  }

  const theme = sanitizeTheme(themePatch);

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
  });

  return jsonOk({});
}

export async function GET(req: Request) {
  const url = new URL(req.url);
  const tenant = url.searchParams.get("tenant");
  if (!tenant) return jsonError("missing_tenant", 400);

  const auth = await requireTenantContextApi(tenant);
  if (!auth.ok) return auth.res;

  const t = await prisma.tenant.findUnique({
    where: { id: auth.ctx.tenantId },
    select: { themeJson: true },
  });

  return jsonOk({ theme: t?.themeJson ?? null });
}
