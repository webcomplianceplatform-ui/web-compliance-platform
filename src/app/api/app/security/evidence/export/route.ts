export const runtime = "nodejs";

import { NextResponse } from "next/server";
import { requireTenantContextApi } from "@/lib/tenant-auth";
import { buildEvidenceBundle, auditCsv, alertsCsv } from "@/lib/evidence";
import { buildEvidencePdfReport } from "@/lib/evidence-report";
import { getClientIp } from "@/lib/ip";
import { rateLimit } from "@/lib/rate-limit";
import { auditLog } from "@/lib/audit";

export async function GET(req: Request) {
  const url = new URL(req.url);
  const tenant = url.searchParams.get("tenant");
  if (!tenant) return NextResponse.json({ ok: false, error: "missing_tenant" }, { status: 400 });

  const ip = getClientIp(req);
  const rl = rateLimit({ key: `evidence:export:${tenant}:${ip}`, limit: 20, windowMs: 60_000 });
  if (rl.ok === false) {
    return NextResponse.json({ ok: false, error: "rate_limited", retryAfterSec: rl.retryAfterSec }, { status: 429 });
  }

  const auth = await requireTenantContextApi(tenant);
  if (auth.ok === false) return auth.res;

  // Commercial rule: Evidence export is paywalled on Starter (CONTROL).
  // Keep bundles available on Business (COMPLIANCE) and Agency (ASSURED), even if Security module is disabled.
  const plan = String(auth.ctx.features.plan ?? "").toUpperCase();
  if (plan === "CONTROL") {
    return NextResponse.json(
      { ok: false, error: "export_locked", reason: "starter_plan" },
      { status: 403 }
    );
  }

  const days = Math.min(Math.max(Number(url.searchParams.get("days") || 90), 1), 365);
  const format = (url.searchParams.get("format") || "json").toLowerCase();
  const kind = (url.searchParams.get("kind") || "bundle").toLowerCase();

  const bundle = await buildEvidenceBundle({ tenantId: auth.ctx.tenantId, rangeDays: days });

  // Track exports (for Ops health + auditability)
  await auditLog({
    tenantId: auth.ctx.tenantId,
    actorUserId: auth.ctx.user.id,
    action: "evidence.export",
    targetType: "TENANT",
    targetId: auth.ctx.tenantId,
    meta: { days, format, kind },
  });

  if (format === "pdf") {
    const bytes = await buildEvidencePdfReport({
      tenantSlug: tenant,
      planLabel: plan,
      reportKind: kind === "pack" ? "pack" : "report",
      bundle: {
        tenantId: auth.ctx.tenantId,
        generatedAt: (bundle as any)?.manifest?.generatedAt ?? new Date().toISOString(),
        rangeDays: days,
        domains: Array.from(new Set((bundle.monitorChecks || []).map((c: any) => { try { return new URL(c.targetUrl).host; } catch { return c.targetUrl; } }))),
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
        securityAlerts: bundle.securityAlerts.map((a: any) => ({
          createdAt: a.createdAt,
          level: a.level,
          message: a.message,
        })),
        monitorEvents: bundle.monitorEvents.map((m: any) => ({
          createdAt: m.createdAt,
          status: m.status,
          message: m.message,
          severity: m.severity,
        })),
        incidents: ((bundle as any)?.incidents ?? []).map((t: any) => ({
          createdAt: t.createdAt,
          title: t.title,
          status: t.status,
          priority: t.priority,
        })),
      } as any,
    });

    return new NextResponse(Buffer.from(bytes), {
      status: 200,
      headers: {
        "content-type": "application/pdf",
        "content-disposition": `attachment; filename="evidence_report_${tenant}_${days}d.pdf"`,
      },
    });
  }

  if (format === "csv") {
    if (kind === "audit") {
      const csv = auditCsv(bundle.auditEvents);
      return new NextResponse(csv, {
        status: 200,
        headers: {
          "content-type": "text/csv; charset=utf-8",
          "content-disposition": `attachment; filename="evidence_audit_${tenant}_${days}d.csv"`,
        },
      });
    }
    if (kind === "alerts") {
      const csv = alertsCsv(bundle.securityAlerts);
      return new NextResponse(csv, {
        status: 200,
        headers: {
          "content-type": "text/csv; charset=utf-8",
          "content-disposition": `attachment; filename="evidence_alerts_${tenant}_${days}d.csv"`,
        },
      });
    }

    return NextResponse.json({ ok: false, error: "invalid_kind" }, { status: 400 });
  }

  // JSON bundle (default)
  return NextResponse.json({ ok: true, bundle });
}
