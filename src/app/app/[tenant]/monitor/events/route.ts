import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { requireTenantContextApi } from "@/lib/tenant-auth";

export async function GET(req: Request) {
  const url = new URL(req.url);
  const tenant = url.searchParams.get("tenant");
  if (!tenant) return NextResponse.json({ ok: false, error: "missing_tenant" }, { status: 400 });

  const auth = await requireTenantContextApi(tenant);
  if (auth.ok === false) {
    return auth.res;
  }

  const events = await prisma.monitorEvent.findMany({
    where: { tenantId: auth.ctx.tenantId },
    orderBy: { createdAt: "desc" },
    take: 50,
    select: {
      id: true,
      status: true,
      severity: true,
      message: true,
      metaJson: true,
      createdAt: true,
      checkId: true,
    },
  });

  return NextResponse.json({ ok: true, events });
}
