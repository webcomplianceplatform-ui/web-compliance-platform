import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import tls from "tls";

function unauthorized() {
  return NextResponse.json({ ok: false, error: "unauthorized" }, { status: 401 });
}

async function checkSsl(hostname: string, port: number) {
  return await new Promise<{ ok: boolean; daysLeft?: number; error?: string }>((resolve) => {
    const socket = tls.connect(port, hostname, { servername: hostname }, () => {
      const cert = socket.getPeerCertificate();
      socket.end();

      if (!cert?.valid_to) return resolve({ ok: false, error: "no_cert" });
      const validTo = new Date(cert.valid_to).getTime();
      const daysLeft = Math.floor((validTo - Date.now()) / (1000 * 60 * 60 * 24));
      resolve({ ok: daysLeft >= 0, daysLeft });
    });

    socket.on("error", (e) => resolve({ ok: false, error: String((e as any)?.message ?? e) }));
  });
}

async function runChecksForTenant(tenantId: string) {
  const checks = await prisma.monitorCheck.findMany({
    where: { tenantId, enabled: true },
    select: { id: true, type: true, targetUrl: true, intervalM: true, lastRunAt: true },
    take: 200,
  });

  const now = Date.now();
  const due = checks.filter((c) => {
    if (!c.lastRunAt) return true;
    const last = new Date(c.lastRunAt).getTime();
    return now - last >= c.intervalM * 60_000;
  });

  for (const c of due) {
    let status: "OK" | "WARN" | "FAIL" = "OK";
    let message = "OK";
    let severity = 1;
    let meta: any = {};

    try {
      if (c.type === "UPTIME") {
        const start = Date.now();
        const r = await fetch(c.targetUrl, { method: "GET", redirect: "follow" });
        const latencyMs = Date.now() - start;
        status = r.ok ? "OK" : "FAIL";
        message = `HTTP ${r.status}`;
        severity = r.ok ? 1 : 3;
        meta = { httpStatus: r.status, latencyMs };
      } else {
        const url = new URL(c.targetUrl);
        const port = url.port ? parseInt(url.port, 10) : 443;
        const ssl = await checkSsl(url.hostname, Number.isFinite(port) ? port : 443);

        if (ssl.ok === false) {
          status = "FAIL";
          message = `SSL FAIL: ${ssl.error ?? "unknown"}`;
          severity = 3;
        } else if ((ssl.daysLeft ?? 9999) <= 14) {
          status = "WARN";
          message = `SSL expiring in ${ssl.daysLeft} days`;
          severity = 2;
        } else {
          status = "OK";
          message = `SSL OK (${ssl.daysLeft} days left)`;
          severity = 1;
        }

        meta = { ...ssl, hostname: url.hostname, port };
      }
    } catch (e: any) {
      status = "FAIL";
      message = `Check error: ${String(e?.message ?? e)}`;
      severity = 3;
    }

    await prisma.monitorEvent.create({
      data: { tenantId, checkId: c.id, status, severity, message, metaJson: meta },
    });

    await prisma.monitorCheck.update({
      where: { id: c.id },
      data: { lastStatus: status, lastRunAt: new Date() },
    });
  }

  return { checked: due.length, total: checks.length };
}

export async function GET(req: Request) {
  const secret = process.env.CRON_SECRET;
  if (!secret) {
    return NextResponse.json({ ok: false, error: "missing_cron_secret" }, { status: 500 });
  }

  const url = new URL(req.url);
  const provided = req.headers.get("x-cron-secret") ?? url.searchParams.get("secret") ?? "";
  if (provided !== secret) return unauthorized();

  const tenantSlug = url.searchParams.get("tenant");
  const onlyOne = tenantSlug
    ? await prisma.tenant.findUnique({ where: { slug: tenantSlug }, select: { id: true } })
    : null;

  const tenantIds = onlyOne
    ? [onlyOne.id]
    : (await prisma.tenant.findMany({ select: { id: true } })).map((t) => t.id);

  let checked = 0;
  let totalChecks = 0;

  for (const tenantId of tenantIds) {
    const r = await runChecksForTenant(tenantId);
    checked += r.checked;
    totalChecks += r.total;
  }

  return NextResponse.json({ ok: true, tenants: tenantIds.length, checked, totalChecks });
}

export async function POST(req: Request) {
  return GET(req);
}
