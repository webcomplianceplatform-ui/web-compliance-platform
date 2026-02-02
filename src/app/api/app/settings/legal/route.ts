import { prisma } from "@/lib/db";
import { requireTenantContextApi, canManageSensitiveSettings } from "@/lib/tenant-auth";
import { parseJson, jsonOk, jsonError } from "@/lib/api-helpers";
import { getClientIp } from "@/lib/ip";
import { rateLimit } from "@/lib/rate-limit";
import { auditLog } from "@/lib/audit";
import { storeLegalVersion } from "@/lib/theme-versioning";
import { ensureLegalEndpointCheck } from "@/lib/monitor-legal";
import { requireModuleApi } from "@/lib/feature-guard";
import { z } from "zod";
import type { TenantTheme } from "@/lib/theme";

const LegalUpdateSchema = z.object({
  tenant: z.string().min(1),
  legal: z.any().optional(),
  legalDocs: z.any().optional(),
});

export async function POST(req: Request) {
  const parsed = await parseJson(req, LegalUpdateSchema);
  if (parsed.ok === false) return parsed.res;

  const { tenant, legal, legalDocs } = parsed.data;

  const auth = await requireTenantContextApi(tenant);
  if (auth.ok === false) return auth.res;

  const gate = requireModuleApi(auth.ctx.features, "legal");
  if (gate) return gate;

  const ip = getClientIp(req);
  const rl = rateLimit({ key: `settings:legal:${auth.ctx.tenantId}:${ip}`, limit: 20, windowMs: 60_000 });
  if (rl.ok === false) return jsonError("rate_limited", 429, { retryAfterSec: rl.retryAfterSec });

  if (!canManageSensitiveSettings(auth.ctx.isSuperadmin)) return jsonError("forbidden", 403);

  const row = await prisma.tenant.findUnique({
    where: { id: auth.ctx.tenantId },
    select: { themeJson: true },
  });

  const current = ((row?.themeJson ?? {}) as TenantTheme) ?? ({} as TenantTheme);
  const prev = {
    legal: (current as any).legal ?? null,
    legalDocs: (current as any).legalDocs ?? null,
  };

  const nextBase: TenantTheme = {
    ...(current as any),
    ...(legal !== undefined ? { legal } : {}),
    ...(legalDocs !== undefined ? { legalDocs } : {}),
  } as TenantTheme;

  // Version: store previous snapshot (max 5)
  const versioned = storeLegalVersion(nextBase, prev, auth.ctx.user.email);

  await prisma.tenant.update({
    where: { id: auth.ctx.tenantId },
    data: { themeJson: versioned as any },
    select: { id: true },
  });

  // Ensure LEGAL endpoint monitoring (best-effort, anti-spam handled in monitor runner)
  try {
    if (auth.ctx.features.monitoring) {
      await ensureLegalEndpointCheck({ tenantId: auth.ctx.tenantId, tenantSlug: tenant });
    }
  } catch {
    // best-effort
  }

  await auditLog({
    tenantId: auth.ctx.tenantId,
    actorUserId: auth.ctx.user.id,
    action: "tenant.legal.update",
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
  const rl = rateLimit({ key: `settings:legal:get:${auth.ctx.tenantId}:${ip}`, limit: 60, windowMs: 60_000 });
  if (rl.ok === false) return jsonError("rate_limited", 429, { retryAfterSec: rl.retryAfterSec });

  if (!canManageSensitiveSettings(auth.ctx.isSuperadmin)) return jsonError("forbidden", 403);

  const row = await prisma.tenant.findUnique({
    where: { id: auth.ctx.tenantId },
    select: { themeJson: true },
  });

  const theme = (row?.themeJson ?? null) as any;
  return jsonOk({
    legal: theme?.legal ?? null,
    legalDocs: theme?.legalDocs ?? null,
    history: theme?.__history?.legal ?? [],
  });
}
