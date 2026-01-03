import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { requireTenantContextApi } from "@/lib/tenant-auth";
import { CheckType } from "@prisma/client";

export async function GET(req: Request) {
  const url = new URL(req.url);
  const tenant = url.searchParams.get("tenant");
  if (!tenant) return NextResponse.json({ ok: false, error: "missing_tenant" }, { status: 400 });

  const auth = await requireTenantContextApi(tenant);
  if (!auth.ok) return auth.res;

  const checks = await prisma.monitorCheck.findMany({
    where: { tenantId: auth.ctx.tenantId },
    orderBy: { createdAt: "desc" },
    take: 50,
  });

  return NextResponse.json({ ok: true, checks });
}

export async function POST(req: Request) {
  const body = (await req.json()) as { tenant?: string; type?: CheckType; targetUrl?: string; intervalM?: number };
  const { tenant, type, targetUrl, intervalM } = body ?? {};
  if (!tenant || !type || !targetUrl) {
    return NextResponse.json({ ok: false, error: "missing_fields" }, { status: 400 });
  }

  const auth = await requireTenantContextApi(tenant);
  if (!auth.ok) return auth.res;

  const check = await prisma.monitorCheck.create({
    data: {
      tenantId: auth.ctx.tenantId,
      type,
      targetUrl,
      intervalM: intervalM ?? 10,
    },
    select: { id: true },
  });

  return NextResponse.json({ ok: true, id: check.id });
}
