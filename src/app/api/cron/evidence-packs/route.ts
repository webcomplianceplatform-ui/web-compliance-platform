export const runtime = "nodejs";

import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { buildEvidenceBundle } from "@/lib/evidence";
import { buildEvidencePdfReport } from "@/lib/evidence-report";
import { uploadEvidencePdf } from "@/lib/evidence-storage";

function nowInTimezone(tz: string) {
  const f = new Intl.DateTimeFormat("en-US", {
    timeZone: tz,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
    hour12: false,
  });
  const parts = f.formatToParts(new Date());
  const get = (type: string) => parts.find((p) => p.type === type)?.value ?? "00";
  return {
    y: Number(get("year")),
    m: Number(get("month")),
    d: Number(get("day")),
    hh: Number(get("hour")),
  };
}

function sameMonth(a: Date, b: Date) {
  return a.getUTCFullYear() === b.getUTCFullYear() && a.getUTCMonth() === b.getUTCMonth();
}

function packLabel(plan: string) {
  const p = String(plan || "").toUpperCase();
  if (p === "ASSURED") return "agency";
  if (p === "COMPLIANCE") return "business";
  return "starter";
}

export async function GET(req: Request) {
  const url = new URL(req.url);
  const secret = url.searchParams.get("secret") || req.headers.get("x-cron-secret") || "";
  const expected = process.env.CRON_SECRET || "";
  if (!expected || secret !== expected) {
    return NextResponse.json({ ok: false, error: "forbidden" }, { status: 403 });
  }

  const schedules = await prisma.evidencePackSchedule.findMany({ where: { enabled: true } });
  let ran = 0;

  for (const s of schedules) {
    const tz = s.timezone || "Europe/Madrid";
    const local = nowInTimezone(tz);

    // Only run on scheduled day/hour (minute-agnostic) and once per month
    if (local.d !== s.dayOfMonth) continue;
    if (local.hh < s.hour) continue;
    if (s.lastRunAt && sameMonth(s.lastRunAt, new Date())) continue;

    const tenant = await prisma.tenant.findUnique({ where: { id: s.tenantId }, select: { slug: true, name: true } });
    if (!tenant) continue;

    const planRec = await prisma.tenantPlan.findUnique({ where: { tenantId: s.tenantId }, select: { plan: true } });
    const plan = String(planRec?.plan || "").toUpperCase();
    if (!planRec || plan === "CONTROL") continue;

    const days = 30;
    const bundle = await buildEvidenceBundle({ tenantId: s.tenantId, rangeDays: days });
    const bytes = await buildEvidencePdfReport({
      tenantSlug: tenant.slug,
      tenantName: tenant.name,
      planLabel: plan,
      reportKind: "pack",
      bundle: {
        tenantId: s.tenantId,
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
        auditEvents: bundle.auditEvents.map((e: any) => ({ createdAt: e.createdAt, action: e.action, actorEmail: (e as any).actorEmail ?? null, ip: e.ip ?? null })),
        securityAlerts: bundle.securityAlerts.map((a: any) => ({ createdAt: a.createdAt, level: a.level, message: a.message })),
        monitorEvents: bundle.monitorEvents.map((m: any) => ({ createdAt: m.createdAt, status: m.status, message: m.message, severity: m.severity })),
        incidents: ((bundle as any)?.incidents ?? []).map((t: any) => ({ createdAt: t.createdAt, title: t.title, status: t.status, priority: t.priority })),
      } as any,
    });

    const createdAt = new Date();
    const path = `${s.tenantId}/packs/${createdAt.toISOString().slice(0, 10)}_${packLabel(plan)}_${days}d_scheduled.pdf`;
    const up = await uploadEvidencePdf({ path, bytes });

    await prisma.evidencePack.create({
      data: {
        tenantId: s.tenantId,
        periodStart: new Date(createdAt.getTime() - days * 24 * 60 * 60 * 1000),
        periodEnd: createdAt,
        format: "pdf",
        manifestHash: (bundle as any)?.manifest?.integrity?.bundleHash ?? null,
        storageBucket: up.bucket,
        storagePath: up.storagePath,
        sizeBytes: up.sizeBytes,
        sha256: up.sha256,
        finalizedAt: createdAt,
        metaJson: { days, scheduled: true },
      },
    });

    await prisma.evidencePackSchedule.update({ where: { id: s.id }, data: { lastRunAt: createdAt } });
    ran += 1;
  }

  return NextResponse.json({ ok: true, ran });
}
