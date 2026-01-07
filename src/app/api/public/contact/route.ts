import { prisma } from "@/lib/db";
import { z } from "zod";
import { parseJson, jsonOk, jsonError } from "@/lib/api-helpers";
import { getClientIp } from "@/lib/ip";
import { rateLimit } from "@/lib/rate-limit";
import { TicketType } from "@prisma/client";
import { auditLog } from "@/lib/audit";

const ContactSchema = z.object({
  tenant: z.string().min(1),
  name: z.string().max(120).optional(),
  email: z.string().email(),
  message: z.string().min(1).max(8000),
});

async function getOrCreateSystemUserId() {
  const email = "system@webcompliance.local";
  const existing = await prisma.user.findUnique({ where: { email }, select: { id: true } });
  if (existing) return existing.id;
  const created = await prisma.user.create({ data: { email, name: "System" }, select: { id: true } });
  return created.id;
}

export async function POST(req: Request) {
  const ip = getClientIp(req);
  const rl = rateLimit({ key: `public:contact:${ip}`, limit: 10, windowMs: 60_000 });
  if (rl.ok === false) {
    return jsonError("rate_limited", 429, { retryAfterSec: rl.retryAfterSec });
  }

  const parsed = await parseJson(req, ContactSchema);
  if (parsed.ok === false) {
    return parsed.res;
  }

  const { tenant, name, email, message } = parsed.data;

  const t = await prisma.tenant.findUnique({ where: { slug: tenant }, select: { id: true } });
  if (!t) return jsonError("tenant_not_found", 404);

  const systemUserId = await getOrCreateSystemUserId();

  const ticket = await prisma.ticket.create({
    data: {
      tenantId: t.id,
      createdById: systemUserId,
      type: TicketType.CHANGE_REQUEST,
      title: `Web contact (${email})`,
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
    meta: { email },
  });

  return jsonOk({ id: ticket.id });
}
