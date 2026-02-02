export const runtime = "nodejs";

import { NextResponse } from "next/server";
import { requireTenantContextApi } from "@/lib/tenant-auth";
import { prisma } from "@/lib/db";
import { auditLog } from "@/lib/audit";

function clampInt(n: any, min: number, max: number, fallback: number) {
  const x = Number.parseInt(String(n ?? ""), 10);
  if (Number.isNaN(x)) return fallback;
  return Math.max(min, Math.min(max, x));
}

export async function GET(req: Request) {
  const url = new URL(req.url);
  const tenant = url.searchParams.get("tenant");
  if (!tenant) return NextResponse.json({ ok: false, error: "missing_tenant" }, { status: 400 });

  const auth = await requireTenantContextApi(tenant);
  if (auth.ok === false) return auth.res;

  const sched = await prisma.evidencePackSchedule.findUnique({ where: { tenantId: auth.ctx.tenantId } });
  return NextResponse.json({ ok: true, schedule: sched });
}

export async function POST(req: Request) {
  const url = new URL(req.url);
  const tenant = url.searchParams.get("tenant");
  if (!tenant) return NextResponse.json({ ok: false, error: "missing_tenant" }, { status: 400 });

  const auth = await requireTenantContextApi(tenant);
  if (auth.ok === false) return auth.res;

  const body = await req.json().catch(() => ({}));
  const enabled = !!body.enabled;
  const dayOfMonth = clampInt(body.dayOfMonth, 1, 28, 1);
  const hour = clampInt(body.hour, 0, 23, 9);
  const timezone = String(body.timezone || "Europe/Madrid");

  const schedule = await prisma.evidencePackSchedule.upsert({
    where: { tenantId: auth.ctx.tenantId },
    create: {
      tenantId: auth.ctx.tenantId,
      enabled,
      dayOfMonth,
      hour,
      timezone,
    },
    update: {
      enabled,
      dayOfMonth,
      hour,
      timezone,
      updatedAt: new Date(),
    },
  });

  await auditLog({
    tenantId: auth.ctx.tenantId,
    actorUserId: auth.ctx.user.id,
    action: "evidence.pack.schedule.update",
    targetType: "TENANT",
    targetId: auth.ctx.tenantId,
    meta: { enabled, dayOfMonth, hour, timezone },
  });

  return NextResponse.json({ ok: true, schedule });
}
