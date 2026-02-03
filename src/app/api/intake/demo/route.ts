import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { rateLimit } from "@/lib/rate-limit";
import { getClientIp } from "@/lib/ip";
import { auditLog } from "@/lib/audit";

type Payload = {
  name?: string;
  email?: string;
  company?: string;
  notes?: string;
};

export async function POST(req: Request) {
  try {
    // Public intake: keep it safe.
    const ip = getClientIp(req);
    const rl = rateLimit({ key: `intake:demo:${ip}`, windowMs: 15 * 60 * 1000, limit: 10 });
    if (!rl.ok) {
  const retryAfterSec = "retryAfterSec" in rl ? rl.retryAfterSec : 60;

  return NextResponse.json(
    { ok: false, error: "rate_limited", retryAfterSec },
    { status: 429, headers: { "Retry-After": String(retryAfterSec) } },
  );
}


    const body = (await req.json().catch(() => ({}))) as Payload;
    const email = String(body.email ?? "").trim().toLowerCase();
    const name = String(body.name ?? "").trim();
    const company = String(body.company ?? "").trim();
    const notes = String(body.notes ?? "").trim();

    if (!email || !email.includes("@")) {
      return NextResponse.json({ ok: false, error: "invalid_email" }, { status: 400 });
    }

    // Ensure the marketing tenant exists (the landing links to /t/webcompliance/legal/...)
    const tenant = await prisma.tenant.upsert({
      where: { slug: "webcompliance" },
      update: { name: "WebCompliance" },
      create: { id: `tenant_${Date.now()}`, slug: "webcompliance", name: "WebCompliance" },
      select: { id: true, slug: true },
    });

    // Create or attach to a lightweight user identity for intake.
    const user = await prisma.user.upsert({
      where: { email },
      update: { name: name || undefined },
      create: {
        id: `user_${Date.now()}`,
        email,
        name: name || null,
      },
      select: { id: true, email: true },
    });

    // Ensure the user is linked to the tenant as CLIENT (optional, but helpful for later follow-up).
    await prisma.userTenant
      .create({
        data: {
          id: `ut_${Date.now()}`,
          userId: user.id,
          tenantId: tenant.id,
          role: "CLIENT",
        },
      })
      .catch(() => null);

    const title = company ? `Demo request · ${company}` : "Demo request";
    const description = [
      name ? `Name: ${name}` : null,
      `Email: ${email}`,
      company ? `Company: ${company}` : null,
      notes ? `Notes:\n${notes}` : null,
      `IP: ${ip}`,
    ]
      .filter(Boolean)
      .join("\n");

    const ticket = await prisma.ticket.create({
      data: {
        id: `t_${Date.now()}`,
        tenantId: tenant.id,
        createdById: user.id,
        type: "LEAD",
        priority: "MEDIUM",
        status: "OPEN",
        title,
        description,
      },
      select: { id: true },
    });

    await auditLog({
      tenantId: null,
      actorUserId: null,
      action: "intake.demo",
      targetType: "Ticket",
      targetId: ticket.id,
      ip: ip,
      userAgent: req.headers.get("user-agent") ?? "",
      meta: { email, company },
    }).catch(() => null);

    return NextResponse.json({ ok: true });
  } catch {
    return NextResponse.json({ ok: false, error: "server_error" }, { status: 500 });
  }
}
