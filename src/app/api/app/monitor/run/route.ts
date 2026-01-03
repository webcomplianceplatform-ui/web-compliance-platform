import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { requireTenantContextApi } from "@/lib/tenant-auth";
import tls from "tls";

async function checkSsl(hostname: string) {
  return await new Promise<{ ok: boolean; daysLeft?: number; error?: string }>((resolve) => {
    const socket = tls.connect(443, hostname, { servername: hostname }, () => {
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
  const body = (await req.json()) as { tenant?: string };
  const tenantSlug = body?.tenant;
  if (!tenantSlug) return NextResponse.json({ ok: false, error: "missing_tenant" }, { status: 400 });

  const auth = await requireTenantContextApi(tenantSlug);
  if (!auth.ok) return auth.res;
  const { tenantId } = auth.ctx;

  const checks = await prisma.monitorCheck.findMany({
    where: { tenantId },
    select: { id: true, type: true, targetUrl: true },
    take: 50,
  });

  for (const c of checks) {
    let status: "OK" | "WARN" | "FAIL" = "OK";
    let message = "OK";
    let severity = 1;
    let metaJson: any = {};

    try {
      if (c.type === "UPTIME") {
        const r = await fetch(c.targetUrl, { method: "GET" });
        status = r.ok ? "OK" : "FAIL";
        message = `HTTP ${r.status}`;
        severity = r.ok ? 1 : 3;
        metaJson = { httpStatus: r.status };
      } else {
        const url = new URL(c.targetUrl);
        const ssl = await checkSsl(url.hostname);

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

        metaJson = ssl;
      }
    } catch (e: any) {
      status = "FAIL";
      message = `Check error: ${String(e?.message ?? e)}`;
      severity = 3;
    }

    await prisma.monitorEvent.create({
      data: {
        tenantId,
        checkId: c.id,
        status,
        severity,
        message,
        metaJson,
      },
    });

    await prisma.monitorCheck.update({
      where: { id: c.id },
      data: { lastStatus: status, lastRunAt: new Date() },
    });
  }

  return NextResponse.json({ ok: true, checked: checks.length });
}
