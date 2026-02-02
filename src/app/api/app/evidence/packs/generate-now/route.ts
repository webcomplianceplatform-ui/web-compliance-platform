export const runtime = "nodejs";

import { NextResponse } from "next/server";
import { requireTenantContextApi } from "@/lib/tenant-auth";
import { buildEvidenceBundle } from "@/lib/evidence";
import { buildEvidencePdfReport } from "@/lib/evidence-report";
import { prisma } from "@/lib/db";
import { auditLog } from "@/lib/audit";
import { uploadEvidencePdf } from "@/lib/evidence-storage";

function packLabel(plan: string) {
  const p = String(plan || "").toUpperCase();
  if (p === "ASSURED") return "agency";
  if (p === "COMPLIANCE") return "business";
  return "starter";
}

export async function POST(req: Request) {
  const url = new URL(req.url);
  const tenant = url.searchParams.get("tenant");
  if (!tenant) return NextResponse.json({ ok: false, error: "missing_tenant" }, { status: 400 });

  const auth = await requireTenantContextApi(tenant);
  if (auth.ok === false) return auth.res;

  const plan = String(auth.ctx.features.plan ?? "").toUpperCase();
  if (plan === "CONTROL") {
    return NextResponse.json({ ok: false, error: "pack_locked", reason: "starter_plan" }, { status: 403 });
  }

  const body = await req.json().catch(() => ({}));
  const days = Math.min(Math.max(Number(body.days || 30), 1), 365);
  const clientUserId = body.clientUserId ? String(body.clientUserId) : null;

  // If a client scope is requested, enforce Agency plan
  if (clientUserId && plan !== "ASSURED") {
    return NextResponse.json({ ok: false, error: "client_scope_requires_agency" }, { status: 403 });
  }

  const bundle = await buildEvidenceBundle({ tenantId: auth.ctx.tenantId, rangeDays: days, clientUserId: clientUserId || undefined });

  const bytes = await buildEvidencePdfReport({
    tenantSlug: tenant,
    tenantName: null,
    planLabel: plan,
    reportKind: clientUserId ? "client_pack" : "pack",
    bundle: {
      tenantId: auth.ctx.tenantId,
      generatedAt: (bundle as any)?.manifest?.generatedAt ?? new Date().toISOString(),
      rangeDays: days,
      domains: Array.from(
        new Set(
          (bundle.monitorChecks || []).map((c: any) => {
            try {
              return new URL(c.targetUrl).host;
            } catch {
              return c.targetUrl;
            }
          })
        )
      ),
      monitorChecks: (bundle.monitorChecks || []).map((c: any) => ({ type: c.type, targetUrl: c.targetUrl, enabled: c.enabled })),
      brand: (bundle as any)?.manifest?.brand ?? null,
      integrity: (bundle as any)?.manifest?.integrity ?? null,
      summary: {
        auditCount: bundle.auditEvents.length,
        alertsCount: bundle.securityAlerts.length,
        monitorEventsCount: bundle.monitorEvents.length,
        monitorChecksCount: bundle.monitorChecks.length,
        incidentsCount: (bundle as any)?.incidents?.length ?? 0,
      },
      auditEvents: bundle.auditEvents.map((e: any) => ({
        createdAt: e.createdAt,
        action: e.action,
        actorEmail: (e as any).actorEmail ?? null,
        ip: e.ip ?? null,
      })),
      securityAlerts: bundle.securityAlerts.map((a: any) => ({ createdAt: a.createdAt, level: a.level, message: a.message })),
      monitorEvents: bundle.monitorEvents.map((m: any) => ({ createdAt: m.createdAt, status: m.status, message: m.message, severity: m.severity })),
      incidents: ((bundle as any)?.incidents ?? []).map((t: any) => ({ createdAt: t.createdAt, title: t.title, status: t.status, priority: t.priority })),
      client: (bundle as any)?.manifest?.client ?? null,
    } as any,
  });

  const createdAt = new Date();
  const periodEnd = createdAt;
  const periodStart = new Date(periodEnd.getTime() - days * 24 * 60 * 60 * 1000);

  const path = `${auth.ctx.tenantId}/packs/${createdAt.toISOString().slice(0, 10)}_${packLabel(plan)}_${days}d_${clientUserId ? `client_${clientUserId}_` : ""}${Math.random()
    .toString(36)
    .slice(2, 8)}.pdf`;

  const up = await uploadEvidencePdf({ path, bytes });

  const pack = await prisma.evidencePack.create({
    data: {
      tenantId: auth.ctx.tenantId,
      clientUserId,
      periodStart,
      periodEnd,
      format: "pdf",
      manifestHash: (bundle as any)?.manifest?.integrity?.bundleHash ?? null,
      storageBucket: up.bucket,
      storagePath: up.storagePath,
      sizeBytes: up.sizeBytes,
      sha256: up.sha256,
      finalizedAt: createdAt,
      finalizedByUserId: auth.ctx.user.id,
      metaJson: {
        days,
        domains: (bundle.monitorChecks || []).map((c: any) => c.targetUrl),
        summary: {
          audit: bundle.auditEvents.length,
          alerts: bundle.securityAlerts.length,
          monitorEvents: bundle.monitorEvents.length,
          incidents: (bundle as any)?.incidents?.length ?? 0,
        },
      },
    },
  });

  await auditLog({
    tenantId: auth.ctx.tenantId,
    actorUserId: auth.ctx.user.id,
    action: "evidence.pack.generated",
    targetType: "TENANT",
    targetId: auth.ctx.tenantId,
    meta: { days, evidencePackId: pack.id, clientUserId },
  });

  return NextResponse.json({ ok: true, packId: pack.id });
}
