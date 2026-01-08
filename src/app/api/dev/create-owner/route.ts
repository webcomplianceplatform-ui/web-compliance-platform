import { NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import { prisma } from "@/lib/db";
import { requireDevAccess } from "@/lib/dev-guard";

export async function POST(req: Request) {
  const gate = requireDevAccess(req);
  if (gate.ok === false) return gate.res;

  const email = "owner@demo.com";
  const password = "Demo12345!";
  const tenantSlug = "demo";

  const passwordHash = await bcrypt.hash(password, 10);

  const tenant = await prisma.tenant.upsert({
    where: { slug: tenantSlug },
    update: {},
    create: {
      slug: tenantSlug,
      name: "Demo Company",
      status: "TRIAL",
      themeJson: {},
    },
    select: { id: true, slug: true },
  });

  const user = await prisma.user.upsert({
    where: { email },
    update: { passwordHash },
    create: { email, name: "Demo Owner", passwordHash },
    select: { id: true, email: true },
  });

  await prisma.userTenant.upsert({
    where: { userId_tenantId: { userId: user.id, tenantId: tenant.id } },
    update: { role: "OWNER" },
    create: { userId: user.id, tenantId: tenant.id, role: "OWNER" },
  });

  return NextResponse.json({
    ok: true,
    credentials: { email, password },
    tenant: { slug: tenant.slug },
  });
}
