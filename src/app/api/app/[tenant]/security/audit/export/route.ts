import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { requireTenantContextApi } from "@/lib/tenant-auth";

function first(v: string | string[] | undefined) {
  return Array.isArray(v) ? v[0] : v;
}

function csvEscape(v: unknown) {
  const s = v == null ? "" : String(v);
  if (/[\n\r",]/.test(s)) return `"${s.replaceAll('"', '""')}"`;
  return s;
}

export async function GET(req: Request, { params }: { params: Promise<{ tenant: string }> }) {
  const { tenant } = await params;
  const r = await requireTenantContextApi(tenant);
  if (!r.ok) return r.res;
  const ctx = r.ctx;

  const advancedAudit = !!(ctx.features as any)?.raw?.security?.audit;
  if (!ctx.features?.security || !advancedAudit) {
    return NextResponse.json({ ok: false, error: "forbidden" }, { status: 403 });
  }

  const url = new URL(req.url);
  const actionQ = (first(url.searchParams.get("action") ?? undefined) ?? "").trim();
  const actorQ = (first(url.searchParams.get("actor") ?? undefined) ?? "").trim();
  const includeAccess = (url.searchParams.get("access") ?? "").toString() === "1";
  const days = Math.min(365, Math.max(1, Number(url.searchParams.get("days") ?? 30) || 30));
  const since = new Date(Date.now() - days * 24 * 60 * 60 * 1000);

  const where: any = {
    tenantId: ctx.tenantId,
    createdAt: { gte: since },
  };

  if (!includeAccess) {
    where.NOT = [{ metaJson: { path: ["category"], equals: "ACCESS" } }];
  }
  if (actionQ) where.action = { contains: actionQ, mode: "insensitive" };
  if (actorQ) {
    where.OR = [
      { actor: { email: { contains: actorQ, mode: "insensitive" } } },
      { actor: { name: { contains: actorQ, mode: "insensitive" } } },
    ];
  }

  const events = await prisma.auditEvent.findMany({
    where,
    orderBy: { createdAt: "desc" },
    take: 5000,
    select: {
      id: true,
      createdAt: true,
      action: true,
      targetType: true,
      targetId: true,
      metaJson: true,
      actor: { select: { email: true, name: true } },
    },
  });

  const header = ["time", "action", "actor", "targetType", "targetId", "meta"].join(",");
  const rows = events.map((e) => {
    const actor = e.actor?.email ?? e.actor?.name ?? "";
    const meta = e.metaJson ? JSON.stringify(e.metaJson) : "";
    return [
      csvEscape(new Date(e.createdAt).toISOString()),
      csvEscape(e.action),
      csvEscape(actor),
      csvEscape(e.targetType ?? ""),
      csvEscape(e.targetId ?? ""),
      csvEscape(meta),
    ].join(",");
  });

  const csv = [header, ...rows].join("\n");
  return new NextResponse(csv, {
    status: 200,
    headers: {
      "content-type": "text/csv; charset=utf-8",
      "content-disposition": `attachment; filename="audit_${tenant}_${days}d.csv"`,
      "cache-control": "no-store",
    },
  });
}
