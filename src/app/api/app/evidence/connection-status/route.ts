import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { requireTenantContextApi } from "@/lib/tenant-auth";

export async function GET(req: Request) {
  const url = new URL(req.url);
  const tenant = url.searchParams.get("tenant");
  if (!tenant) {
    return NextResponse.json({ ok: false, error: "missing_tenant" }, { status: 400 });
  }

  const auth = await requireTenantContextApi(tenant);
  if (auth.ok === false) return auth.res;

  const last = await prisma.auditEvent.findFirst({
    where: { tenantId: auth.ctx.tenantId, action: "evidence.source.connected" },
    orderBy: { createdAt: "desc" },
    select: { createdAt: true, metaJson: true },
  });

  return NextResponse.json({
    ok: true,
    connected: !!last,
    lastConnectedAt: last?.createdAt ? last.createdAt.toISOString() : null,
    lastMeta: last?.metaJson ?? null,
  });
}
