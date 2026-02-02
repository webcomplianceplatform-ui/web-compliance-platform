import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { isSuperadminEmail } from "@/lib/superadmin";
import { prisma } from "@/lib/db";

export async function GET(req: Request) {
  const session = await getServerSession(authOptions);
  const email = session?.user?.email ?? null;
  if (!email || !isSuperadminEmail(email)) {
    return NextResponse.json({ ok: false, error: "forbidden" }, { status: 403 });
  }

  const u = new URL(req.url);
  const limit = Math.min(200, Math.max(1, Number(u.searchParams.get("limit") ?? 50)));

  const events = await prisma.accessEvent.findMany({
    orderBy: { createdAt: "desc" },
    take: limit,
    select: {
      id: true,
      kind: true,
      ip: true,
      userAgent: true,
      metaJson: true,
      createdAt: true,
      user: { select: { email: true } },
      tenant: { select: { slug: true } },
    },
  });

  return NextResponse.json({ ok: true, events });
}
