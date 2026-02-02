import { prisma } from "@/lib/db";
import { z } from "zod";
import { parseJson, jsonOk, jsonError } from "@/lib/api-helpers";
import { getClientIp } from "@/lib/ip";
import { rateLimit } from "@/lib/rate-limit";
import { TicketType } from "@prisma/client";
import { auditLog } from "@/lib/audit";
import { NextResponse } from "next/server";
import { getTenantFeatures } from "@/lib/tenant-plan";

const ContactSchema = z.object({
  tenant: z.string().min(1),
  name: z.string().max(120).optional(),
  email: z.string().email().transform((e) => e.trim().toLowerCase()),
  message: z.string().min(1).max(8000),
  website: z.string().optional(), // honeypot
});

async function getOrCreateSystemUserId() {
  const email = "system@webcompliance.local";
  const user = await prisma.user.upsert({
    where: { email },
    update: {},
    create: { email, name: "System" },
    select: { id: true },
  });
  return user.id;
}

export async function OPTIONS() {
  return new NextResponse(null, {
    status: 204,
    headers: {
      "access-control-allow-origin": "*",
      "access-control-allow-methods": "POST, OPTIONS",
      "access-control-allow-headers": "content-type",
      "access-control-max-age": "86400",
    },
  });
}

export async function POST(req: Request) {
  const ip = getClientIp(req);
  const rlIp = rateLimit({ key: `public:contact:ip:${ip}`, limit: 10, windowMs: 60_000 });
  if (rlIp.ok === false) {
    return jsonError("rate_limited", 429, { retryAfterSec: rlIp.retryAfterSec });
  }

  const parsed = await parseJson(req, ContactSchema);
  if (parsed.ok === false) {
    return parsed.res;
  }

  const { tenant, name, email, message, website } = parsed.data;

  // Honeypot: if filled -> pretend success but do nothing (anti-bot)
  if (typeof website === "string" && website.trim().length > 0) {
    return jsonOk({ ok: true });
  }

  const rlEmail = rateLimit({ key: `public:contact:email:${email}`, limit: 5, windowMs: 60_000 });
  if (rlEmail.ok === false) {
    return jsonError("rate_limited", 429, { retryAfterSec: rlEmail.retryAfterSec });
  }

  const t = await prisma.tenant.findUnique({ where: { slug: tenant }, select: { id: true } });
  if (!t) return jsonError("tenant_not_found", 404);

  // 🧩 Plan gating: Intake module controls public contact → LEAD creation.
  // If disabled, we still return ok to avoid leaking plan info.
  const feats = await getTenantFeatures(t.id);
  if (!feats.intake) {
    return jsonOk({ ok: true });
  }

  const systemUserId = await getOrCreateSystemUserId();

  const title = `Web contact (${email})`;

  // Dedupe: if same email contacted recently, reuse last ticket (prevents spam floods)
  const recent = await prisma.ticket.findFirst({
    where: {
      tenantId: t.id,
      title,
      createdAt: { gte: new Date(Date.now() - 10 * 60_000) }, // 10 minutes
    },
    select: { id: true },
  });
  if (recent) {
    return jsonOk({ id: recent.id });
  }

  const ticket = await prisma.ticket.create({
    data: {
      tenantId: t.id,
      createdById: systemUserId,
      type: TicketType.LEAD,
      title,
      description: `Name: ${name ?? "-"}\nEmail: ${email}\n\nMessage:\n${message}`,
    },
    select: { id: true },
  });

  await auditLog({
    tenantId: t.id,
    actorUserId: systemUserId,
    action: "public.contact.create_ticket",
    targetType: "ticket",
    targetId: ticket.id,
    metaJson: { email },
  });

  return jsonOk({ id: ticket.id });
}
