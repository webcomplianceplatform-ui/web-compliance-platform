import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { requireTenantContextApi, canManageSettings } from "@/lib/tenant-auth";
import tls from "tls";
import { sendEmail } from "@/lib/mailer";
import { monitorAlertEmail } from "@/lib/email-templates/monitor";
import { getMonitorRecipientEmails } from "@/lib/notify";
import { getClientIp } from "@/lib/ip";
import { rateLimit } from "@/lib/rate-limit";
import { auditLog } from "@/lib/audit";

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

export async function POST(req: Request) {
  const ip = getClientIp(req);
  const rl = rateLimit({ key: `monitor:run:${ip}`, limit: 10, windowMs: 60_000 });
  if (!rl.ok) {
    const retryAfterSec = rl.retryAfterSec;
    return NextResponse.json({ ok: false, error: "rate_limited", retryAfterSec }, { status: 429 });
  }

  const body = (await req.json()) as { tenant?: string; force?: boolean };
  const tenantSlug = body?.tenant;
  if (!tenantSlug) return NextResponse.json({ ok: false, error: "missing_tenant" }, { status: 400 });

  const auth = await requireTenantContextApi(tenantSlug);
  if (!auth.ok) return auth.res;
  const { tenantId } = auth.ctx;

  if (!canManageSettings(auth.ctx.role)) return NextResponse.json({ ok: false, error: "forbidden" }, { status: 403 });

  const force = Boolean(body?.force);

  const checks = await prisma.monitorCheck.findMany({
    where: { tenantId, enabled: true },
    select: { id: true, type: true, targetUrl: true, intervalM: true, lastRunAt: true },
    take: 50,
  });

  const now = Date.now();
  const due = checks.filter((c) => {
    if (force) return true;
    if (!c.lastRunAt) return true;
    const last = new Date(c.lastRunAt).getTime();
    return now - last >= c.intervalM * 60_000;
  });

  for (const c of due) {
    let status: "OK" | "WARN" | "FAIL" = "OK";
    let message = "OK";
    let severity = 1;
    let metaJson: any = {};

    try {
      if (c.type === "UPTIME") {
        const start = Date.now();
        const r = await fetch(c.targetUrl, { method: "GET", redirect: "follow" });
        const latencyMs = Date.now() - start;
        status = r.ok ? "OK" : "FAIL";
        message = `HTTP ${r.status}`;
        severity = r.ok ? 1 : 3;
        metaJson = { httpStatus: r.status, latencyMs };
      } else {
        const url = new URL(c.targetUrl);
        const port = url.port ? parseInt(url.port, 10) : 443;
        const ssl = await checkSsl(url.hostname, Number.isFinite(port) ? port : 443);

        if (!ssl.ok) {
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

        metaJson = { ...ssl, hostname: url.hostname, port };
      }
    } catch (e: any) {
      status = "FAIL";
      message = `Check error: ${String(e?.message ?? e)}`;
      severity = 3;
    }

    const ev = await prisma.monitorEvent.create({
      data: {
        tenantId,
        checkId: c.id,
        status,
        severity,
        message,
        metaJson,
      },
    });


// Send monitor alert email (best-effort)
try {
  const daysThreshold = Number(process.env.MONITOR_SSL_ALERT_DAYS || 14);
  const isDown = severity >= 3 || status === "FAIL";
  const isSslExpiring =
    c.type === "SSL" &&
    typeof (metaJson as any)?.daysLeft === "number" &&
    (metaJson as any).daysLeft <= daysThreshold;

  if (isDown || isSslExpiring) {
    const tenant = await prisma.tenant.findUnique({ where: { id: tenantId }, select: { slug: true, name: true, themeJson: true } });
    const brand = (tenant?.themeJson as any)?.brandName || tenant?.name || "WebCompliance";
    const url = `${process.env.NEXT_PUBLIC_BASE_URL || "http://localhost:3000"}/app/${tenant?.slug || tenantSlug || ""}/monitor`;
    const checkName = `${c.type} - ${c.targetUrl}`;
    const mail = monitorAlertEmail({
      brand,
      tenantSlug: tenant?.slug || tenantSlug || "",
      checkName,
      status,
      message,
      url,
    });

    const to = await getMonitorRecipientEmails({ tenantId });
    await sendEmail({ tenantId, actorUserId: auth.ctx.user.id, to, subject: mail.subject, text: mail.text, html: mail.html, tags: { kind: "monitor_alert" } });
  }
} catch (e) {
  console.error("monitor alert email failed", e);
}

    await prisma.monitorCheck.update({
      where: { id: c.id },
      data: { lastStatus: status, lastRunAt: new Date() },
    });
  }

  await auditLog({
    tenantId,
    actorUserId: auth.ctx.user.id,
    action: "monitor.run",
    targetType: "tenant",
    targetId: tenantId,
    meta: { checks: due.length, force },
  });

  return NextResponse.json({ ok: true, checked: due.length, skipped: checks.length - due.length });
}
