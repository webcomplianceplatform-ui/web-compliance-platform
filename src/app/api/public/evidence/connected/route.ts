import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { getClientIp } from "@/lib/ip";
import { rateLimit } from "@/lib/rate-limit";
import { auditLog } from "@/lib/audit";

export async function POST(req: Request) {
  const ip = getClientIp(req);
  const rl = rateLimit({ key: `public:connected:${ip}`, limit: 120, windowMs: 60_000 });
  if (rl.ok === false) {
    return NextResponse.json({ ok: false, error: "rate_limited", retryAfterSec: rl.retryAfterSec }, { status: 429 });
  }

  let body: any = null;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ ok: false, error: "invalid_json" }, { status: 400 });
  }

  const tenantSlug = String(body?.tenant ?? "").trim();
  if (!tenantSlug) return NextResponse.json({ ok: false, error: "missing_tenant" }, { status: 400 });

  const host = String(body?.host ?? "").trim().toLowerCase();
  const href = String(body?.href ?? "").trim();
  const referrer = body?.referrer ? String(body.referrer).slice(0, 500) : null;
  const ua = body?.ua ? String(body.ua).slice(0, 300) : null;

  const tenant = await prisma.tenant.findUnique({ where: { slug: tenantSlug }, select: { id: true } });
  if (!tenant) {
    // Deliberately vague; public endpoint
    return NextResponse.json({ ok: false, error: "not_found" }, { status: 404 });
  }

  // De-dupe: one connected event per (tenant, host) per 24h.
  const since = new Date(Date.now() - 24 * 60 * 60 * 1000);
  const existing = await prisma.auditEvent.findFirst({
    where: {
      tenantId: tenant.id,
      action: "evidence.source.connected",
      createdAt: { gte: since },
      // best-effort filter (metaJson is JSON)
      metaJson: { path: ["host"], equals: host || undefined },
    } as any,
    select: { id: true },
  }).catch(() => null);

  if (!existing) {
    await auditLog({
      tenantId: tenant.id,
      actorUserId: null,
      action: "evidence.source.connected",
      targetType: "DOMAIN",
      targetId: host || null,
      meta: {
        host: host || null,
        href: href ? href.slice(0, 800) : null,
        referrer,
        ip,
        ua,
      },
    });
  }

  return NextResponse.json(
    { ok: true, deduped: !!existing },
    {
      headers: {
        "access-control-allow-origin": "*",
      },
    }
  );
}

export async function OPTIONS() {
  // Basic CORS for embedded script usage.
  return new NextResponse(null, {
    status: 204,
    headers: {
      "access-control-allow-origin": "*",
      "access-control-allow-methods": "POST, OPTIONS",
      "access-control-allow-headers": "content-type",
      "access-control-max-age": "86400",
    },
  });
}
