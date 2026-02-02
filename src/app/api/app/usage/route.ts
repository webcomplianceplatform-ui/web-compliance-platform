export const runtime = "nodejs";

import { NextResponse } from "next/server";
import { requireTenantContextApi } from "@/lib/tenant-auth";
import { prisma } from "@/lib/db";

function planLimits(plan: string) {
  const p = String(plan || "").toUpperCase();
  if (p === "CONTROL") {
    return { maxDomains: 1, packEnabled: false, retentionDays: 7, maxClients: 0 };
  }
  if (p === "COMPLIANCE") {
    return { maxDomains: 3, packEnabled: true, retentionDays: 90, maxClients: 0 };
  }
  if (p === "ASSURED") {
    return { maxDomains: 25, packEnabled: true, retentionDays: 365, maxClients: 50 };
  }
  return { maxDomains: 3, packEnabled: true, retentionDays: 90, maxClients: 0 };
}

export async function GET(req: Request) {
  const url = new URL(req.url);
  const tenant = url.searchParams.get("tenant");
  if (!tenant) return NextResponse.json({ ok: false, error: "missing_tenant" }, { status: 400 });

  const auth = await requireTenantContextApi(tenant);
  if (auth.ok === false) return auth.res;

  const plan = String(auth.ctx.features.plan || "").toUpperCase();
  const limits = planLimits(plan);

  // Domains: approximate by counting distinct hosts across monitor checks
  const checks = await prisma.monitorCheck.findMany({
    where: { tenantId: auth.ctx.tenantId },
    select: { targetUrl: true },
  });
  const hosts = new Set<string>();
  for (const c of checks) {
    try {
      hosts.add(new URL(c.targetUrl).host);
    } catch {
      hosts.add(String(c.targetUrl));
    }
  }

  const members = await prisma.userTenant.count({ where: { tenantId: auth.ctx.tenantId } });
  const clients = await prisma.userTenant.count({ where: { tenantId: auth.ctx.tenantId, role: "CLIENT" as any } });

  const packAgg = await prisma.evidencePack.aggregate({
    where: { tenantId: auth.ctx.tenantId },
    _count: { id: true },
    _sum: { sizeBytes: true },
  });

  const last24h = new Date(Date.now() - 24 * 60 * 60 * 1000);
  const [audit24h, alerts24h, monitor24h] = await Promise.all([
    prisma.auditEvent.count({ where: { tenantId: auth.ctx.tenantId, createdAt: { gte: last24h } } }),
    prisma.securityAlert.count({ where: { tenantId: auth.ctx.tenantId, createdAt: { gte: last24h } } }),
    prisma.monitorEvent.count({ where: { tenantId: auth.ctx.tenantId, createdAt: { gte: last24h } } }),
  ]);

  return NextResponse.json({
    ok: true,
    plan,
    limits,
    usage: {
      domains: hosts.size,
      members,
      clients,
      evidencePacks: packAgg._count.id,
      evidencePackBytes: packAgg._sum.sizeBytes || 0,
      events24h: { audit: audit24h, alerts: alerts24h, monitor: monitor24h },
    },
  });
}
