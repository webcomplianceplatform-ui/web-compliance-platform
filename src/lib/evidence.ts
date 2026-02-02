import { prisma } from "@/lib/db";

import crypto from "crypto";

export type EvidenceBundle = {
  manifest: {
    tenantId: string;
    domain?: string | null;
    brand?: {
      name?: string | null;
      primaryColor?: string | null;
      logoText?: string | null;
    };
    rangeDays: number;
    from: string;
    to: string;
    generatedAt: string;
    counts: {
      auditEvents: number;
      securityAlerts: number;
      monitorEvents: number;
      incidents: number;
    };
    integrity: {
      algorithm: "sha256";
      bundleHash: string;
    };
  };
  auditEvents: any[];
  securityAlerts: any[];
  monitorEvents: any[];
  monitorChecks: any[];
  legalHistory: any[];
  incidents: any[];
  digest: any;
};

export async function buildEvidenceBundle(args: {
  tenantId: string;
  rangeDays: number;
}): Promise<EvidenceBundle> {
  const to = new Date();
  const from = new Date(Date.now() - args.rangeDays * 24 * 60 * 60 * 1000);

  const [auditEvents, securityAlerts, monitorEvents, monitorChecks, tenant, incidents] = await Promise.all([
    prisma.auditEvent.findMany({
      where: { tenantId: args.tenantId, createdAt: { gte: from } },
      orderBy: { createdAt: "desc" },
      take: 5000,
    }),
    prisma.securityAlert.findMany({
      where: { tenantId: args.tenantId, createdAt: { gte: from } },
      orderBy: { createdAt: "desc" },
      take: 5000,
    }),
    prisma.monitorEvent.findMany({
      where: { tenantId: args.tenantId, createdAt: { gte: from } },
      orderBy: { createdAt: "desc" },
      take: 5000,
    }),
    prisma.monitorCheck.findMany({
      where: { tenantId: args.tenantId },
      orderBy: { createdAt: "desc" },
      take: 200,
    }),
    prisma.tenant.findUnique({
      where: { id: args.tenantId },
      select: { themeJson: true },
    }),
    prisma.ticket.findMany({
      where: { tenantId: args.tenantId, createdAt: { gte: from }, type: "INCIDENT" as any },
      orderBy: { createdAt: "desc" },
      take: 2000,
    }),
  ]);

  const theme: any = tenant?.themeJson ?? null;
  const legalHistory = theme?.__history?.legal ?? [];
  const brand = {
    name: theme?.brandName ?? theme?.brand?.name ?? null,
    primaryColor: theme?.brandColor ?? theme?.brand?.primaryColor ?? null,
    logoText: theme?.logoText ?? theme?.brand?.logoText ?? null,
  };

  const domain = inferDomainFromChecks(monitorChecks);
  const digest = {
    auditByAction: countBy(auditEvents, (e: any) => e.action),
    auditByActor: countBy(auditEvents, (e: any) => e.actorUserId ?? "unknown"),
    alertsByLevel: countBy(securityAlerts, (a: any) => a.level),
    monitorByStatus: countBy(monitorEvents, (m: any) => m.status),
    legalHistoryEntries: Array.isArray(legalHistory) ? legalHistory.length : 0,
    incidentCount: incidents.length,
  };


  // Compute integrity hash over a normalized representation.
  // Note: this is not a cryptographic notarization; it is a deterministic checksum to detect tampering.
  const normalized = {
    tenantId: args.tenantId,
    domain,
    rangeDays: args.rangeDays,
    from: from.toISOString(),
    to: to.toISOString(),
    auditEvents,
    securityAlerts,
    monitorEvents,
    monitorChecks,
    incidents,
    legalHistory,
  };
  const bundleHash = sha256(stableStringify(normalized));

  return {
    manifest: {
      tenantId: args.tenantId,
      domain,
      brand,
      rangeDays: args.rangeDays,
      from: from.toISOString(),
      to: to.toISOString(),
      generatedAt: new Date().toISOString(),
      counts: {
        auditEvents: auditEvents.length,
        securityAlerts: securityAlerts.length,
        monitorEvents: monitorEvents.length,
        incidents: incidents.length,
      },
      integrity: {
        algorithm: "sha256",
        bundleHash,
      },
    },
    auditEvents,
    securityAlerts,
    monitorEvents,
    monitorChecks,
    legalHistory,
    incidents,
    digest,
  };
}

function inferDomainFromChecks(checks: any[]): string | null {
  for (const c of checks || []) {
    const u = c?.targetUrl;
    if (!u || typeof u !== "string") continue;
    try {
      const url = new URL(u);
      if (url.hostname) return url.hostname;
    } catch {
      // ignore
    }
  }
  return null;
}

function sha256(input: string): string {
  return crypto.createHash("sha256").update(input).digest("hex");
}

function stableStringify(value: any): string {
  return JSON.stringify(sortKeysDeep(value));
}

function sortKeysDeep(value: any): any {
  if (Array.isArray(value)) return value.map(sortKeysDeep);
  if (value && typeof value === "object") {
    const out: any = {};
    for (const k of Object.keys(value).sort()) {
      out[k] = sortKeysDeep(value[k]);
    }
    return out;
  }
  return value;
}

function countBy(items: any[], keyFn: (x: any) => string) {
  const out: Record<string, number> = {};
  for (const it of items) {
    const k = keyFn(it) || "unknown";
    out[k] = (out[k] || 0) + 1;
  }
  return out;
}

function csvEscape(v: any): string {
  if (v === null || v === undefined) return "";
  const s = typeof v === "string" ? v : JSON.stringify(v);
  if (/[\n\r,\"]/g.test(s)) return '"' + s.replace(/"/g, '""') + '"';
  return s;
}

export function toCsv(rows: any[], columns: { key: string; header: string }[]): string {
  const header = columns.map((c) => csvEscape(c.header)).join(",");
  const lines = rows.map((r) => columns.map((c) => csvEscape(r?.[c.key])).join(","));
  return [header, ...lines].join("\n") + "\n";
}

export function auditCsv(auditEvents: any[]): string {
  return toCsv(auditEvents, [
    { key: "createdAt", header: "createdAt" },
    { key: "action", header: "action" },
    { key: "actorUserId", header: "actorUserId" },
    { key: "targetType", header: "targetType" },
    { key: "targetId", header: "targetId" },
    { key: "metaJson", header: "metaJson" },
  ]);
}

export function alertsCsv(alerts: any[]): string {
  return toCsv(alerts, [
    { key: "createdAt", header: "createdAt" },
    { key: "level", header: "level" },
    { key: "message", header: "message" },
    { key: "auditId", header: "auditId" },
  ]);
}
