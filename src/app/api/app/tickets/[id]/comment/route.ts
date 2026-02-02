import { prisma } from "@/lib/db";
import { requireTenantContextApi } from "@/lib/tenant-auth";
import { z } from "zod";
import { parseJson, jsonOk, jsonError } from "@/lib/api-helpers";
import { getClientIp } from "@/lib/ip";
import { rateLimit } from "@/lib/rate-limit";
import { auditLog } from "@/lib/audit";
import { requireModuleApi } from "@/lib/feature-guard";

const AddCommentSchema = z.object({
  tenant: z.string().min(1),
  body: z.string().min(1).max(8000),
});

export async function POST(req: Request, routeCtx: any) {
  const params = await routeCtx.params;

  const parsed = await parseJson(req, AddCommentSchema);
  if (parsed.ok === false) return parsed.res;

  const { tenant, body: commentBody } = parsed.data;

  const auth = await requireTenantContextApi(tenant);
  if (auth.ok === false) return auth.res;
  const { ctx } = auth;

  const gate = requireModuleApi(ctx.features, "tickets");
  if (gate) return gate;

  // ✅ RL key includes tenantId
  const ip = getClientIp(req);
  const rl = rateLimit({ key: `tickets:comment:${ctx.tenantId}:${ip}`, limit: 120, windowMs: 60_000 });
  if (rl.ok === false) return jsonError("rate_limited", 429, { retryAfterSec: rl.retryAfterSec });

  const ticket = await prisma.ticket.findFirst({
    where: { id: params.id, tenantId: ctx.tenantId },
    select: { id: true },
  });
  if (!ticket) return jsonError("not_found", 404);

  await prisma.ticketComment.create({
    data: {
      body: commentBody,
      ticket: { connect: { id: params.id } },
      author: { connect: { id: ctx.user.id } },
    },
  });

  await auditLog({
    tenantId: ctx.tenantId,
    actorUserId: ctx.user.id,
    action: "ticket.comment.create",
    targetType: "ticket",
    targetId: params.id,
    metaJson: { length: commentBody.length },
  });

  return jsonOk({});
}
