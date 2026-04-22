import crypto from "crypto";
import {
  computeComplianceStatus,
  computeLastActivityAt,
  pendingChecksCount,
  resolvedChecksCount,
} from "@/lib/client-compliance";
import { prisma } from "@/lib/db";

export type AgencyEvidenceReference = {
  id: string;
  clientId: string;
  clientName: string;
  checkId?: string | null;
  checkTitle?: string | null;
  fileName?: string | null;
  createdAt: string;
  referenceType: "workspace_download" | "external_url";
  referenceUrl: string | null;
};

export type AgencyClientEvidenceSummary = {
  id: string;
  name: string;
  createdAt: string;
  complianceStatus: "GREEN" | "YELLOW" | "RED";
  pendingChecks: number;
  resolvedChecks: number;
  totalChecks: number;
  evidenceCount: number;
  lastActivityAt: string | null;
  checklist: Array<{
    id: string;
    title: string;
    status: string;
    createdAt: string;
    updatedAt: string;
    evidenceCount: number;
  }>;
  uploadedEvidence: AgencyEvidenceReference[];
};

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
      agencyClients?: number;
      uploadedEvidence?: number;
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
  agencyClients: AgencyClientEvidenceSummary[];
  digest: any;
};

export async function buildEvidenceBundle(args: {
  tenantId: string;
  rangeDays: number;
  /** Optional agency scope (client). Used for labeling + integrity hashing.
   *  Note: data is still tenant-scoped unless you model client/domain ownership.
   */
  clientUserId?: string;
  /** Optional new agency client scope. */
  clientId?: string;
}): Promise<EvidenceBundle> {
  const to = new Date();
  const from = new Date(Date.now() - args.rangeDays * 24 * 60 * 60 * 1000);

  const [auditEvents, securityAlerts, monitorEvents, monitorChecks, tenant, incidents, agencyClientRows] =
    await Promise.all([
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
        select: { slug: true, themeJson: true },
      }),
      prisma.ticket.findMany({
        where: { tenantId: args.tenantId, createdAt: { gte: from }, type: "INCIDENT" as any },
        orderBy: { createdAt: "desc" },
        take: 2000,
      }),
      prisma.client.findMany({
        where: {
          tenantId: args.tenantId,
          ...(args.clientId ? { id: args.clientId } : {}),
        },
        orderBy: { createdAt: "desc" },
        select: {
          id: true,
          name: true,
          createdAt: true,
          checks: {
            orderBy: { createdAt: "asc" },
            select: {
              id: true,
              title: true,
              status: true,
              createdAt: true,
              updatedAt: true,
            },
          },
          evidence: {
            where: { createdAt: { gte: from } },
            orderBy: { createdAt: "desc" },
            select: {
              id: true,
              checkId: true,
              fileName: true,
              fileUrl: true,
              createdAt: true,
            },
          },
        },
      }),
    ]);

  const theme: any = tenant?.themeJson ?? null;
  const legalHistory = theme?.__history?.legal ?? [];
  const brand = {
    name: theme?.brandName ?? theme?.brand?.name ?? null,
    primaryColor: theme?.brandColor ?? theme?.brand?.primaryColor ?? null,
    logoText: theme?.logoText ?? theme?.brand?.logoText ?? null,
  };

  const agencyClients = agencyClientRows.map((client) => {
    const checkTitleById = new Map(client.checks.map((check) => [check.id, check.title]));
    const uploadedEvidence = client.evidence.map((evidence) => ({
      id: evidence.id,
      clientId: client.id,
      clientName: client.name,
      checkId: evidence.checkId,
      checkTitle: evidence.checkId ? checkTitleById.get(evidence.checkId) ?? null : null,
      fileName: evidence.fileName ?? null,
      createdAt: evidence.createdAt.toISOString(),
      ...buildAgencyEvidenceReference({
        tenantSlug: tenant?.slug ?? null,
        clientId: client.id,
        evidenceId: evidence.id,
        fileUrl: evidence.fileUrl,
      }),
    }));

    const lastActivityAt = computeLastActivityAt({
      clientCreatedAt: client.createdAt,
      checks: client.checks,
      evidence: client.evidence,
    });

    return {
      id: client.id,
      name: client.name,
      createdAt: client.createdAt.toISOString(),
      complianceStatus: computeComplianceStatus(client.checks),
      pendingChecks: pendingChecksCount(client.checks),
      resolvedChecks: resolvedChecksCount(client.checks),
      totalChecks: client.checks.length,
      evidenceCount: uploadedEvidence.length,
      lastActivityAt: lastActivityAt ? lastActivityAt.toISOString() : null,
      checklist: client.checks.map((check) => ({
        id: check.id,
        title: check.title,
        status: String(check.status),
        createdAt: check.createdAt.toISOString(),
        updatedAt: check.updatedAt.toISOString(),
        evidenceCount: uploadedEvidence.filter((evidence) => evidence.checkId === check.id).length,
      })),
      uploadedEvidence,
    } satisfies AgencyClientEvidenceSummary;
  });

  const domain = inferDomainFromChecks(monitorChecks);
  const uploadedEvidenceCount = agencyClients.reduce((sum, client) => sum + client.uploadedEvidence.length, 0);
  const digest = {
    auditByAction: countBy(auditEvents, (e: any) => e.action),
    auditByActor: countBy(auditEvents, (e: any) => e.actorUserId ?? "unknown"),
    alertsByLevel: countBy(securityAlerts, (a: any) => a.level),
    monitorByStatus: countBy(monitorEvents, (m: any) => m.status),
    legalHistoryEntries: Array.isArray(legalHistory) ? legalHistory.length : 0,
    incidentCount: incidents.length,
    agencyClientsCount: agencyClients.length,
    uploadedEvidenceCount,
    agencyByStatus: countBy(agencyClients, (client) => client.complianceStatus),
  };

  const normalized = {
    tenantId: args.tenantId,
    clientUserId: args.clientUserId ?? null,
    clientId: args.clientId ?? null,
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
    agencyClients,
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
        agencyClients: agencyClients.length,
        uploadedEvidence: uploadedEvidenceCount,
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
    agencyClients,
    digest,
  };
}

function buildAgencyEvidenceReference(args: {
  tenantSlug: string | null;
  clientId: string;
  evidenceId: string;
  fileUrl: string;
}) {
  if (args.fileUrl && !String(args.fileUrl).startsWith("data:")) {
    return {
      referenceType: "external_url" as const,
      referenceUrl: String(args.fileUrl),
    };
  }

  if (!args.tenantSlug) {
    return {
      referenceType: "workspace_download" as const,
      referenceUrl: null,
    };
  }

  return {
    referenceType: "workspace_download" as const,
    referenceUrl: `/api/app/clients/${args.clientId}/evidence/${args.evidenceId}?tenant=${encodeURIComponent(
      args.tenantSlug
    )}`,
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
