import { prisma } from "@/lib/db";
import { requireTenantContextApi, canManageSettings } from "@/lib/tenant-auth";
import { z } from "zod";
import { parseJson, jsonOk, jsonError } from "@/lib/api-helpers";
import { getClientIp } from "@/lib/ip";
import { rateLimit } from "@/lib/rate-limit";
import { auditLog } from "@/lib/audit";
import { CheckType } from "@prisma/client";
import { requireModuleApi } from "@/lib/feature-guard";

const CreateCheckSchema = z.object({
  tenant: z.string().min(1),
  type: z.nativeEnum(CheckType),
  targetUrl: z.string().url().max(2048),
  intervalM: z.number().int().min(1).max(1440).optional(),
  enabled: z.boolean().optional(),
});

const UpdateCheckSchema = z.object({
  tenant: z.string().min(1),
  id: z.string().min(1),
  targetUrl: z.string().url().max(2048).optional(),
  intervalM: z.number().int().min(1).max(1440).optional(),
  enabled: z.boolean().optional(),
});

const DeleteCheckSchema = z.object({
  tenant: z.string().min(1),
  id: z.string().min(1),
});

export async function GET(req: Request) {
  const url = new URL(req.url);
  const tenant = url.searchParams.get("tenant");
  if (!tenant) return jsonError("missing_tenant", 400);

  const auth = await requireTenantContextApi(tenant);
  if (auth.ok === false) {
    return auth.res;
  }

  const gate = requireModuleApi(auth.ctx.features, "monitoring");
  if (gate) return gate;

  const checks = await prisma.monitorCheck.findMany({
    where: { tenantId: auth.ctx.tenantId },
    orderBy: { createdAt: "desc" },
    take: 50,
  });

  return jsonOk({ checks });
}

export async function POST(req: Request) {
  const ip = getClientIp(req);
  const rl = rateLimit({ key: `monitor:checks:create:${ip}`, limit: 30, windowMs: 60_000 });
  if (rl.ok === false) {
    return jsonError("rate_limited", 429, { retryAfterSec: rl.retryAfterSec });
  }

  const parsed = await parseJson(req, CreateCheckSchema);
  if (parsed.ok === false) {
    return parsed.res;
  }

  const { tenant, type, targetUrl, intervalM } = parsed.data;

  const auth = await requireTenantContextApi(tenant);
  if (auth.ok === false) {
    return auth.res;
  }

  const gate = requireModuleApi(auth.ctx.features, "monitoring");
  if (gate) return gate;

  if (!canManageSettings(auth.ctx.role)) return jsonError("forbidden", 403);

  // Idempotency: avoid creating duplicates for the same tenant/type/targetUrl.
  const existing = await prisma.monitorCheck.findFirst({
    where: { tenantId: auth.ctx.tenantId, type, targetUrl },
    select: { id: true },
  });
  if (existing) {
    return jsonOk({ id: existing.id, alreadyExists: true });
  }

  // Plan-based domain limits (P8)
  const plan = String((auth.ctx.features as any)?.plan ?? "").toUpperCase();
  const maxDomains = plan === "CONTROL" ? 1 : plan === "COMPLIANCE" ? 3 : plan === "ASSURED" ? 25 : 3;
  let newHost = "";
  try {
    newHost = new URL(targetUrl).host;
  } catch {
    newHost = targetUrl;
  }
  const existingChecks = await prisma.monitorCheck.findMany({ where: { tenantId: auth.ctx.tenantId }, select: { targetUrl: true } });
  const hosts = new Set<string>();
  for (const c of existingChecks) {
    try { hosts.add(new URL(c.targetUrl).host); } catch { hosts.add(String(c.targetUrl)); }
  }
  if (!hosts.has(newHost) && hosts.size >= maxDomains) {
    return jsonError("domain_limit", 403, { maxDomains, currentDomains: hosts.size });
  }

  const check = await prisma.monitorCheck.create({
    data: {
      tenantId: auth.ctx.tenantId,
      type,
      targetUrl,
      intervalM: intervalM ?? 10,
      enabled: parsed.data.enabled ?? true,
    },
    select: { id: true },
  });

  await auditLog({
    tenantId: auth.ctx.tenantId,
    actorUserId: auth.ctx.user.id,
    action: "monitor.check.create",
    targetType: "monitorCheck",
    targetId: check.id,
  });

  return jsonOk({ id: check.id });
}

export async function PATCH(req: Request) {
  const ip = getClientIp(req);
  const rl = rateLimit({ key: `monitor:checks:update:${ip}`, limit: 60, windowMs: 60_000 });
  if (rl.ok === false) {
    return jsonError("rate_limited", 429, { retryAfterSec: rl.retryAfterSec });
  }

  const parsed = await parseJson(req, UpdateCheckSchema);
  if (parsed.ok === false) {
    return parsed.res;
  }

  const { tenant, id, targetUrl, intervalM, enabled } = parsed.data;
  const auth = await requireTenantContextApi(tenant);
  if (auth.ok === false) {
    return auth.res;
  }

  const gate = requireModuleApi(auth.ctx.features, "monitoring");
  if (gate) return gate;
  if (!canManageSettings(auth.ctx.role)) return jsonError("forbidden", 403);

  const existing = await prisma.monitorCheck.findFirst({
    where: { id, tenantId: auth.ctx.tenantId },
    select: { id: true },
  });
  if (!existing) return jsonError("not_found", 404);

const r = await prisma.monitorCheck.updateMany({
  where: { id, tenantId: auth.ctx.tenantId },
  data: {
    ...(typeof targetUrl === "string" ? { targetUrl } : {}),
    ...(typeof intervalM === "number" ? { intervalM } : {}),
    ...(typeof enabled === "boolean" ? { enabled } : {}),
  },
});
if (r.count === 0) return jsonError("not_found", 404);
  await auditLog({
    tenantId: auth.ctx.tenantId,
    actorUserId: auth.ctx.user.id,
    action: "monitor.check.update",
    targetType: "monitorCheck",
    targetId: id,
    meta: { targetUrl, intervalM, enabled },
  });

  return jsonOk({ ok: true });
}

export async function DELETE(req: Request) {
  const ip = getClientIp(req);
  const rl = rateLimit({ key: `monitor:checks:delete:${ip}`, limit: 30, windowMs: 60_000 });
  if (rl.ok === false) {
    return jsonError("rate_limited", 429, { retryAfterSec: rl.retryAfterSec });
  }

  const parsed = await parseJson(req, DeleteCheckSchema);
  if (parsed.ok === false) {
    return parsed.res;
  }

  const { tenant, id } = parsed.data;
  const auth = await requireTenantContextApi(tenant);
  if (auth.ok === false) {
    return auth.res;
  }

  const gate = requireModuleApi(auth.ctx.features, "monitoring");
  if (gate) return gate;
  if (!canManageSettings(auth.ctx.role)) return jsonError("forbidden", 403);

  const existing = await prisma.monitorCheck.findFirst({
    where: { id, tenantId: auth.ctx.tenantId },
    select: { id: true },
  });
  if (!existing) return jsonError("not_found", 404);

const r = await prisma.monitorCheck.deleteMany({
  where: { id, tenantId: auth.ctx.tenantId },
});
if (r.count === 0) return jsonError("not_found", 404);

  await auditLog({
    tenantId: auth.ctx.tenantId,
    actorUserId: auth.ctx.user.id,
    action: "monitor.check.delete",
    targetType: "monitorCheck",
    targetId: id,
  });

  return jsonOk({ ok: true });
}
