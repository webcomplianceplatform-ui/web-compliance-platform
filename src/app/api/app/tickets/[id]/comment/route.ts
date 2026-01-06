import { prisma } from "@/lib/db";
import { requireTenantContextApi } from "@/lib/tenant-auth";
import { z } from "zod";
import { parseJson, jsonOk, jsonError } from "@/lib/api-helpers";
import { sendEmail } from "@/lib/mailer";
import { ticketNotificationEmail } from "@/lib/email-templates/ticket";
import { getTicketRecipientEmails } from "@/lib/notify";
import { getClientIp } from "@/lib/ip";
import { rateLimit } from "@/lib/rate-limit";
import { auditLog } from "@/lib/audit";

const AddCommentSchema = z.object({
  tenant: z.string().min(1),
  body: z.string().min(1).max(8000),
});

export async function POST(req: Request, { params }: { params: { id: string } }) {
  const ip = getClientIp(req);
  const rl = rateLimit({ key: `tickets:comment:${ip}`, limit: 120, windowMs: 60_000 });
  if (!rl.ok) return jsonError("rate_limited", 429, { retryAfterSec: rl.retryAfterSec });

  const parsed = await parseJson(req, AddCommentSchema);
  if (!parsed.ok) return parsed.res;
  const { tenant, body: commentBody } = parsed.data;

  const auth = await requireTenantContextApi(tenant);
  if (!auth.ok) return auth.res;
  const { ctx } = auth;

  const ticket = await prisma.ticket.findFirst({
    where: { id: params.id, ctx.tenantId: ctx.ctx.tenantId },
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
    ctx.tenantId: ctx.ctx.tenantId,
    actorUserId: ctx.user.id,
    action: "ticket.comment.create",
    targetType: "ticket",
    targetId: params.id,
  });

  return jsonOk({});
}
