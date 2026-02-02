import { PDFDocument, StandardFonts, rgb } from "pdf-lib";
import crypto from "crypto";

type Brand = {
  name?: string | null;
  primaryColor?: string | null; // hex
  logoText?: string | null;
  footerNote?: string | null;
};

type MonitorCheckMini = {
  type: string;
  targetUrl: string;
  enabled?: boolean;
};

type Bundle = {
  tenantId: string;
  generatedAt: string;
  rangeDays: number;
  domains: string[];
  integrity?: { algorithm: string; bundleHash: string };
  brand?: Brand;
  summary: {
    auditCount: number;
    alertsCount: number;
    monitorEventsCount: number;
    monitorChecksCount: number;
    incidentsCount: number;
  };
  monitorChecks: MonitorCheckMini[];
  auditEvents: Array<{ createdAt: string; action: string; actorEmail?: string | null; ip?: string | null }>;
  securityAlerts: Array<{ createdAt: string; level: string; message: string }>;
  monitorEvents: Array<{ createdAt: string; status: string; message: string; severity: number }>;
  incidents: Array<{ createdAt: string; title: string; status: string; priority: string }>;
};

function fmtDate(iso: string) {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return iso;
  return d.toISOString().slice(0, 10) + " " + d.toISOString().slice(11, 19) + "Z";
}

function hexToRgb01(hex: string | null | undefined) {
  if (!hex) return null;
  const h = hex.trim().replace(/^#/, "");
  if (!(h.length === 6 || h.length === 3)) return null;
  const full = h.length === 3 ? h.split("").map((c) => c + c).join("") : h;
  const n = Number.parseInt(full, 16);
  if (Number.isNaN(n)) return null;
  const r = (n >> 16) & 255;
  const g = (n >> 8) & 255;
  const b = n & 255;
  return { r: r / 255, g: g / 255, b: b / 255 };
}

function hostOf(url: string) {
  try {
    return new URL(url).host;
  } catch {
    return url;
  }
}

function classifyAction(action: string): "LEGAL" | "SECURITY" | "OPS" {
  const a = (action || "").toLowerCase();
  if (a.startsWith("legal.") || a.includes("consent") || a.includes("cookie")) return "LEGAL";
  if (a.startsWith("security.") || a.startsWith("auth.") || a.startsWith("mfa") || a.startsWith("evidence.")) return "SECURITY";
  if (a.startsWith("monitor.") || a.startsWith("ticket.") || a.startsWith("billing.")) return "OPS";
  return "SECURITY";
}

function buildTimeline(bundle: Bundle) {
  const rows: Array<{ ts: string; cat: "LEGAL" | "SECURITY" | "OPS"; label: string }> = [];
  for (const ev of bundle.auditEvents.slice(0, 400)) {
    rows.push({ ts: ev.createdAt, cat: classifyAction(ev.action), label: ev.action });
  }
  for (const i of bundle.incidents.slice(0, 100)) {
    rows.push({ ts: i.createdAt, cat: "OPS", label: `incident: ${i.title} (${i.status})` });
  }
  rows.sort((a, b) => (a.ts < b.ts ? 1 : -1));
  return rows.slice(0, 60);
}

function sha256Hex(input: string | Buffer) {
  return crypto.createHash("sha256").update(input).digest("hex");
}

export async function buildEvidencePdfReport(opts: {
  tenantSlug: string;
  tenantName?: string | null;
  planLabel: string;
  bundle: Bundle;
  reportKind?: "report" | "pack";
}) {
  const { tenantSlug, tenantName, planLabel, bundle, reportKind = "report" } = opts;

  const pdf = await PDFDocument.create();
  const font = await pdf.embedFont(StandardFonts.Helvetica);
  const fontBold = await pdf.embedFont(StandardFonts.HelveticaBold);

  const pageSize: [number, number] = [595.28, 841.89]; // A4
  const marginX = 50;
  const topY = pageSize[1] - 60;
  const brandColor = hexToRgb01(bundle.brand?.primaryColor ?? null);
  const brandBarColor = brandColor ? rgb(brandColor.r, brandColor.g, brandColor.b) : rgb(0.06, 0.09, 0.16);

  const domains = (bundle.domains || []).length ? bundle.domains : Array.from(new Set(bundle.monitorChecks.map((c) => hostOf(c.targetUrl))));

  // --- Cover page ---
  {
    const page = pdf.addPage(pageSize);
    const { width, height } = page.getSize();
    // Brand bar
    page.drawRectangle({ x: 0, y: height - 24, width, height: 24, color: brandBarColor });
    page.drawText(bundle.brand?.logoText || bundle.brand?.name || "WebCompliance", {
      x: marginX,
      y: height - 17,
      size: 10,
      font: fontBold,
      color: rgb(1, 1, 1),
    });

    page.drawText(reportKind === "pack" ? "Evidence Pack" : "Evidence Report", {
      x: marginX,
      y: height - 100,
      size: 30,
      font: fontBold,
      color: rgb(0.06, 0.09, 0.16),
    });

    const preparedFor = tenantName || tenantSlug;
    page.drawText(`Prepared for: ${preparedFor}`, { x: marginX, y: height - 140, size: 12, font });
    page.drawText(`Plan: ${planLabel}`, { x: marginX, y: height - 160, size: 12, font });
    page.drawText(`Period: last ${bundle.rangeDays} days`, { x: marginX, y: height - 180, size: 12, font });
    page.drawText(`Generated: ${fmtDate(bundle.generatedAt)}`, { x: marginX, y: height - 200, size: 12, font });

    page.drawText("Domains included", { x: marginX, y: height - 245, size: 14, font: fontBold });
    let y = height - 265;
    for (const d of domains.slice(0, 20)) {
      page.drawText(`• ${d}`, { x: marginX + 10, y, size: 11, font });
      y -= 16;
    }

    // Simple tagline / value
    page.drawRectangle({ x: marginX, y: 120, width: width - marginX * 2, height: 70, color: rgb(0.97, 0.97, 0.98) });
    page.drawText("Compliance you can prove.", { x: marginX + 16, y: 170, size: 16, font: fontBold });
    page.drawText("This pack summarizes legal, security and operational evidence for audits and clients.", {
      x: marginX + 16,
      y: 148,
      size: 10,
      font,
      color: rgb(0.25, 0.25, 0.25),
    });
  }

  // Helpers for pages after cover
  let page = pdf.addPage(pageSize);
  let y = topY;

  const drawHeader = () => {
    const { width, height } = page.getSize();
    page.drawRectangle({ x: 0, y: height - 18, width, height: 18, color: brandBarColor });
    page.drawText(bundle.brand?.logoText || bundle.brand?.name || "WebCompliance", {
      x: marginX,
      y: height - 14,
      size: 9,
      font: fontBold,
      color: rgb(1, 1, 1),
    });

    page.drawText(reportKind === "pack" ? "Evidence Pack" : "Evidence Report", {
      x: marginX,
      y: height - 55,
      size: 18,
      font: fontBold,
    });
    page.drawText(`Tenant: ${tenantSlug}  •  Plan: ${planLabel}`, { x: marginX, y: height - 74, size: 10, font });
    page.drawText(`Period: last ${bundle.rangeDays} days  •  Generated: ${fmtDate(bundle.generatedAt)}`, {
      x: marginX,
      y: height - 88,
      size: 10,
      font,
    });

    page.drawLine({ start: { x: marginX, y: height - 104 }, end: { x: width - marginX, y: height - 104 }, thickness: 1, color: rgb(0.85, 0.85, 0.85) });
  };

  const newPage = () => {
    page = pdf.addPage(pageSize);
    y = topY;
    drawHeader();
    y = page.getSize().height - 130;
  };

  const ensureSpace = (need: number) => {
    if (y - need < 90) newPage();
  };

  // First content page header
  drawHeader();
  y = page.getSize().height - 130;

  // Executive summary
  ensureSpace(120);
  page.drawText("Executive summary", { x: marginX, y, size: 12, font: fontBold });
  y -= 16;
  const summaryLines = [
    `Audit events: ${bundle.summary.auditCount}`,
    `Security alerts: ${bundle.summary.alertsCount}`,
    `Monitoring events: ${bundle.summary.monitorEventsCount} (checks: ${bundle.summary.monitorChecksCount})`,
    `Incidents: ${bundle.summary.incidentsCount}`,
    `Domains: ${domains.length}`,
  ];
  for (const line of summaryLines) {
    page.drawText(line, { x: marginX + 10, y, size: 10, font });
    y -= 14;
  }

  // Domain sections (customer-ready)
  ensureSpace(30);
  page.drawText("Domains overview", { x: marginX, y, size: 12, font: fontBold });
  y -= 16;
  const checksByDomain = new Map<string, MonitorCheckMini[]>();
  for (const c of bundle.monitorChecks || []) {
    const h = hostOf(c.targetUrl);
    const arr = checksByDomain.get(h) || [];
    arr.push(c);
    checksByDomain.set(h, arr);
  }

  for (const d of domains) {
    ensureSpace(40);
    page.drawText(d, { x: marginX + 10, y, size: 11, font: fontBold });
    y -= 14;
    const checks = checksByDomain.get(d) || [];
    if (!checks.length) {
      page.drawText("No monitoring checks configured.", { x: marginX + 18, y, size: 9, font, color: rgb(0.35, 0.35, 0.35) });
      y -= 12;
      continue;
    }
    for (const c of checks.slice(0, 6)) {
      ensureSpace(14);
      const label = `${String(c.type).toUpperCase()}  •  ${c.targetUrl}`;
      page.drawText(label.slice(0, 86), { x: marginX + 18, y, size: 9, font, color: rgb(0.25, 0.25, 0.25) });
      y -= 12;
    }
    y -= 4;
  }

  // Incident snapshot
  ensureSpace(70);
  page.drawText("Incident snapshot", { x: marginX, y, size: 12, font: fontBold });
  y -= 16;
  const lastIncident = bundle.incidents[0];
  page.drawText(
    lastIncident
      ? `Last incident: ${fmtDate(lastIncident.createdAt)}  •  ${lastIncident.title}  •  ${lastIncident.status}  •  ${lastIncident.priority}`
      : "No incidents recorded in this period.",
    { x: marginX + 10, y, size: 10, font }
  );
  y -= 18;

  // Timeline by categories
  ensureSpace(260);
  page.drawText("Evidence timeline", { x: marginX, y, size: 12, font: fontBold });
  y -= 16;
  const timeline = buildTimeline(bundle);
  const catColor = {
    LEGAL: rgb(0.1, 0.6, 0.3),
    SECURITY: rgb(0.2, 0.4, 0.8),
    OPS: rgb(0.8, 0.45, 0.1),
  } as const;
  for (const t of timeline) {
    ensureSpace(14);
    page.drawText(fmtDate(t.ts), { x: marginX + 10, y, size: 9, font, color: rgb(0.35, 0.35, 0.35) });
    page.drawText(t.cat, { x: marginX + 120, y, size: 9, font: fontBold, color: catColor[t.cat] });
    page.drawText(t.label.slice(0, 64), { x: marginX + 175, y, size: 9, font });
    y -= 12;
  }

  // Integrity manifest page
  newPage();
  ensureSpace(240);
  page.drawText("Integrity manifest", { x: marginX, y, size: 14, font: fontBold });
  y -= 18;

  const manifestDeterministic = JSON.stringify({
    tenant: tenantSlug,
    generatedAt: bundle.generatedAt,
    rangeDays: bundle.rangeDays,
    counts: bundle.summary,
    domains,
  });

  const computedHash = sha256Hex(manifestDeterministic);
  const integrity = bundle.integrity?.bundleHash ? bundle.integrity : { algorithm: "sha256", bundleHash: computedHash };

  page.drawText(
    "This report includes a deterministic checksum (SHA-256) for tamper detection. Keep the original export alongside this PDF.",
    { x: marginX, y, size: 10, font, color: rgb(0.2, 0.2, 0.2) }
  );
  y -= 22;
  page.drawText(`Algorithm: ${integrity.algorithm}`, { x: marginX + 10, y, size: 10, font });
  y -= 14;
  page.drawText("Manifest hash:", { x: marginX + 10, y, size: 10, font });
  y -= 14;
  page.drawText(integrity.bundleHash.slice(0, 64), { x: marginX + 20, y, size: 9, font });
  y -= 12;
  page.drawText(integrity.bundleHash.slice(64), { x: marginX + 20, y, size: 9, font });
  y -= 18;

  page.drawText("Datasets included", { x: marginX + 10, y, size: 12, font: fontBold });
  y -= 16;
  const datasets = [
    `Audit events (${bundle.summary.auditCount})`,
    `Security alerts (${bundle.summary.alertsCount})`,
    `Monitoring events (${bundle.summary.monitorEventsCount})`,
    `Monitoring checks (${bundle.summary.monitorChecksCount})`,
    `Incidents (${bundle.summary.incidentsCount})`,
  ];
  for (const d of datasets) {
    page.drawText(`• ${d}`, { x: marginX + 14, y, size: 10, font });
    y -= 14;
  }

  // Footer (on every page) - legal / white-label
  const footerText =
    bundle.brand?.footerNote ||
    "Generated by WebCompliance. This report is a high-level evidence summary. Keep the original evidence exports for full datasets.";

  const pages = pdf.getPages();
  for (let i = 0; i < pages.length; i++) {
    const p = pages[i];
    const { width } = p.getSize();
    p.drawLine({ start: { x: marginX, y: 55 }, end: { x: width - marginX, y: 55 }, thickness: 1, color: rgb(0.9, 0.9, 0.9) });
    p.drawText(footerText, { x: marginX, y: 40, size: 8, font, color: rgb(0.4, 0.4, 0.4) });
    p.drawText(`Page ${i + 1} / ${pages.length}`, { x: width - marginX - 70, y: 40, size: 8, font, color: rgb(0.4, 0.4, 0.4) });
  }

  return await pdf.save();
}
