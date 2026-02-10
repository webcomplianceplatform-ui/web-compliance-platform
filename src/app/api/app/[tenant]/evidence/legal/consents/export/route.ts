import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { requireTenantContextApi } from "@/lib/tenant-auth";

function csvEscape(v: any) {
  const s = v === null || v === undefined ? "" : String(v);
  if (/[",\n\r]/.test(s)) return `"${s.replace(/"/g, '""')}"`;
  return s;
}

export async function GET(req: Request, { params }: { params: Promise<{ tenant: string }> }) {
  const { tenant } = await params;

  const auth = await requireTenantContextApi(tenant);
  if (!auth.ok) return auth.res;

  const ctx = auth.ctx;

  if (!ctx.features?.legal) {
    return NextResponse.json({ ok: false, error: "module_locked" }, { status: 403 });
  }

  const u = new URL(req.url);
  const days = Math.min(365, Math.max(1, Number(u.searchParams.get("days") ?? 30) || 30));
  const state = (u.searchParams.get("state") ?? "").trim();
  const since = new Date(Date.now() - days * 24 * 60 * 60 * 1000);
  const actions = ["legal.consent.accepted", "legal.consent.rejected", "legal.consent.reset", "legal.consent.custom"];

  const where: any = {
    tenantId: ctx.tenantId,
    createdAt: { gte: since },
    action: { in: actions },
  };
  if (state) where.metaJson = { path: ["state"], equals: state };

  const rows = await prisma.auditEvent.findMany({
    where,
    orderBy: { createdAt: "desc" },
    take: 5000,
    select: { createdAt: true, action: true, ip: true, userAgent: true, actorUserId: true, metaJson: true },
  });

  const header = [
    "timestamp",
    "action",
    "state",
    "categories.analytics",
    "categories.marketing",
    "source",
    "scope",
    "path",
    "referrer",
    "actorUserId",
    "ip",
    "userAgent",
  ].join(",");

  const lines = rows.map((r) => {
    const m: any = r.metaJson ?? {};
    const c: any = m.categories ?? {};
    return [
      r.createdAt.toISOString(),
      r.action,
      m.state ?? "",
      c.analytics ? "true" : "false",
      c.marketing ? "true" : "false",
      m.source ?? "",
      m.scope ?? "",
      m.path ?? "",
      m.referrer ?? "",
      r.actorUserId ?? "",
      r.ip ?? "",
      r.userAgent ?? "",
    ]
      .map(csvEscape)
      .join(",");
  });

  const csv = [header, ...lines].join("\n");
  const file = `webcompliance_consents_${tenant}_${days}d.csv`;
  return new NextResponse(csv, {
    status: 200,
    headers: {
      "content-type": "text/csv; charset=utf-8",
      "content-disposition": `attachment; filename=\"${file}\"`,
    },
  });
}
