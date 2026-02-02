import { prisma } from "@/lib/db";
import { requireTenantContextApi } from "@/lib/tenant-auth";
import { TicketPriority, TicketType } from "@prisma/client";
import { z } from "zod";
import { parseJson, jsonOk, jsonError } from "@/lib/api-helpers";
import { getClientIp } from "@/lib/ip";
import { rateLimit } from "@/lib/rate-limit";
import { auditLog } from "@/lib/audit";
import { requireModuleApi } from "@/lib/feature-guard";

const CreateTicketSchema = z.object({
  tenant: z.string().min(1),
  title: z.string().min(1).max(160),
  description: z.string().min(1).max(8000),
  type: z.nativeEnum(TicketType).optional(),
  priority: z.nativeEnum(TicketPriority).optional(),
});

export async function POST(req: Request) {
  const parsed = await parseJson(req, CreateTicketSchema);
  if (parsed.ok === false) return parsed.res;

  const { tenant, title, description, priority, type } = parsed.data;

  const auth = await requireTenantContextApi(tenant);
  if (auth.ok === false) return auth.res;
  const { ctx } = auth;

  // 🧩 Plan gating
  const gate = requireModuleApi(ctx.features, "tickets");
  if (gate) return gate;

  // ✅ RL key includes tenantId
  const ip = getClientIp(req);
  const rl = rateLimit({ key: `tickets:create:${ctx.tenantId}:${ip}`, limit: 30, windowMs: 60_000 });
  if (rl.ok === false) return jsonError("rate_limited", 429, { retryAfterSec: rl.retryAfterSec });

  const ticket = await prisma.ticket.create({
    data: {
      title,
      description,
      type: type ?? TicketType.CHANGE_REQUEST,
      priority: priority ?? TicketPriority.MEDIUM,
      tenant: { connect: { id: ctx.tenantId } },
      createdBy: { connect: { id: ctx.user.id } },
    },
    select: { id: true },
  });

  await auditLog({
    tenantId: ctx.tenantId,
    actorUserId: ctx.user.id,
    action: "ticket.create",
    targetType: "ticket",
    targetId: ticket.id,
    metaJson: { priority: priority ?? TicketPriority.MEDIUM, type: type ?? TicketType.CHANGE_REQUEST },
  });

  return jsonOk({ id: ticket.id });
}
