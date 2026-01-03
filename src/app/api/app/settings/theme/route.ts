import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { requireTenantContextApi, canManageSettings } from "@/lib/tenant-auth";
import { sanitizeTheme } from "@/lib/theme-merge";

export async function POST(req: Request) {
  const body = await req.json();
  const tenant = body?.tenant as string | undefined;
  const themePatch = body?.theme;

  if (!tenant || !themePatch) {
    return NextResponse.json({ ok: false, error: "missing_fields" }, { status: 400 });
  }

  const auth = await requireTenantContextApi(tenant);
  if (!auth.ok) return auth.res;

  if (!canManageSettings(auth.ctx.role)) {
    return NextResponse.json({ ok: false, error: "forbidden" }, { status: 403 });
  }

  const theme = sanitizeTheme(themePatch);

  await prisma.tenant.update({
    where: { id: auth.ctx.tenantId },
    data: { themeJson: theme as any },
    select: { id: true },
  });

  return NextResponse.json({ ok: true });
}

export async function GET(req: Request) {
  const url = new URL(req.url);
  const tenant = url.searchParams.get("tenant");
  if (!tenant) return NextResponse.json({ ok: false, error: "missing_tenant" }, { status: 400 });

  const auth = await requireTenantContextApi(tenant);
  if (!auth.ok) return auth.res;

  const t = await prisma.tenant.findUnique({
    where: { id: auth.ctx.tenantId },
    select: { themeJson: true },
  });

  return NextResponse.json({ ok: true, theme: t?.themeJson ?? null });
}
