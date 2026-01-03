import { NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import { prisma } from "@/lib/db";

export async function POST() {
  const email = "owner@demo.com";
  const password = "Demo12345!";
  const tenantSlug = "demo";

  const passwordHash = await bcrypt.hash(password, 10);

  // 1) asegurar tenant
  const tenant = await prisma.tenant.upsert({
    where: { slug: tenantSlug },
    update: {},
    create: {
      slug: tenantSlug,
      name: "Demo Company",
      status: "TRIAL",
      themeJson: {},
    },
  });

  // 2) asegurar user
  const user = await prisma.user.upsert({
    where: { email },
    update: { passwordHash: passwordHash },
    create: {
      email,
      name: "Demo Owner",
      passwordHash,
    },
  });

  // 3) asignar role OWNER en ese tenant
  // Ajusta nombres si tu tabla pivot se llama distinto
  await prisma.userTenant.upsert({
    where: {
      userId_tenantId: { userId: user.id, tenantId: tenant.id },
    },
    update: { role: "OWNER" },
    create: {
      userId: user.id,
      tenantId: tenant.id,
      role: "OWNER",
    },
  });

  return NextResponse.json({
    ok: true,
    credentials: { email, password },
    tenant: { slug: tenant.slug },
  });
}
