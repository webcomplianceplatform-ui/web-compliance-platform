import { prisma } from "@/lib/db";
import { requireTenantContextApi, canManageSettings } from "@/lib/tenant-auth";
import { CheckType } from "@prisma/client";
import { z } from "zod";
import { parseJson, jsonOk, jsonError } from "@/lib/api-helpers";
import { getClientIp } from "@/lib/ip";
import { rateLimit } from "@/lib/rate-limit";
import { auditLog } from "@/lib/audit";

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

  if (!canManageSettings(auth.ctx.role)) return jsonError("forbidden", 403);

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
  if (!canManageSettings(auth.ctx.role)) return jsonError("forbidden", 403);

  const existing = await prisma.monitorCheck.findFirst({
    where: { id, tenantId: auth.ctx.tenantId },
    select: { id: true },
  });
  if (!existing) return jsonError("not_found", 404);

  await prisma.monitorCheck.update({
    where: { id },
    data: {
      ...(typeof targetUrl === "string" ? { targetUrl } : {}),
      ...(typeof intervalM === "number" ? { intervalM } : {}),
      ...(typeof enabled === "boolean" ? { enabled } : {}),
    },
  });

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
  if (!canManageSettings(auth.ctx.role)) return jsonError("forbidden", 403);

  const existing = await prisma.monitorCheck.findFirst({
    where: { id, tenantId: auth.ctx.tenantId },
    select: { id: true },
  });
  if (!existing) return jsonError("not_found", 404);

  await prisma.monitorCheck.delete({ where: { id } });

  await auditLog({
    tenantId: auth.ctx.tenantId,
    actorUserId: auth.ctx.user.id,
    action: "monitor.check.delete",
    targetType: "monitorCheck",
    targetId: id,
  });

  return jsonOk({ ok: true });
}
