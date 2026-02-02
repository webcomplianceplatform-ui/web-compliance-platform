import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { auditLog } from "@/lib/audit";
import { authenticator } from "otplib";

export async function POST(_req: Request) {
  const session = await getServerSession(authOptions);
  const email = session?.user?.email ?? null;
  if (!session || !email) return NextResponse.json({ ok: false, error: "unauthorized" }, { status: 401 });

  const user = await prisma.user.findUnique({
    where: { email: String(email) },
    select: { id: true, name: true, email: true },
  });
  if (!user) return NextResponse.json({ ok: false, error: "unauthorized" }, { status: 401 });

  const secret = authenticator.generateSecret();
  const issuer = process.env.MFA_ISSUER || "WebCompliance";
  const label = user.email || "account";
  const otpauth = authenticator.keyuri(label, issuer, secret);

  await prisma.user.update({
    where: { id: user.id },
    data: { mfaSecret: secret },
  });

  await auditLog({
    tenantId: null,
    actorUserId: user.id,
    action: "mfa.setup.started",
    targetType: "User",
    targetId: user.id,
    metaJson: { category: "SECURITY", scope: "GLOBAL" },
  });

  return NextResponse.json({ ok: true, secret, otpauth });
}
