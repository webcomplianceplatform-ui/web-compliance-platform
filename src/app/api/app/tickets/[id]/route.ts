import { prisma } from "@/lib/db";
import { requireTenantContextApi, canManageTickets } from "@/lib/tenant-auth";
import { TicketPriority, TicketStatus, TicketType } from "@prisma/client";
import { sendEmail } from "@/lib/mailer";
import { ticketNotificationEmail } from "@/lib/email-templates/ticket";
import { getTicketRecipientEmails } from "@/lib/notify";
import { z } from "zod";
import { parseJson, jsonOk, jsonError } from "@/lib/api-helpers";
import { getClientIp } from "@/lib/ip";
import { rateLimit } from "@/lib/rate-limit";
import { auditLog } from "@/lib/audit";
import { requireModuleApi } from "@/lib/feature-guard";

const UpdateTicketSchema = z.object({
  tenant: z.string().min(1),
  status: z.nativeEnum(TicketStatus).optional(),
  priority: z.nativeEnum(TicketPriority).optional(),
  type: z.nativeEnum(TicketType).optional(),
});

export async function PATCH(req: Request, routeCtx: any) {
  const params = await routeCtx.params;

  const parsed = await parseJson(req, UpdateTicketSchema);
  if (parsed.ok === false) return parsed.res;

  const { tenant, status, priority, type } = parsed.data;
  if (!status && !priority && !type) return jsonError("missing_fields", 400);

  const auth = await requireTenantContextApi(tenant);
  if (auth.ok === false) return auth.res;
  const { ctx } = auth;

  const gate = requireModuleApi(ctx.features, "tickets");
  if (gate) return gate;

  if (!canManageTickets(ctx.role)) return jsonError("forbidden", 403);

  // ✅ RL key includes tenantId
  const ip = getClientIp(req);
  const rl = rateLimit({ key: `tickets:update:${ctx.tenantId}:${ip}`, limit: 60, windowMs: 60_000 });
  if (rl.ok === false) return jsonError("rate_limited", 429, { retryAfterSec: rl.retryAfterSec });

  const ticket = await prisma.ticket.findFirst({
    where: { id: params.id, tenantId: ctx.tenantId },
    select: { id: true, title: true, status: true, priority: true, type: true },
  });
  if (!ticket) return jsonError("not_found", 404);

  const updates: { status?: TicketStatus; priority?: TicketPriority; type?: TicketType } = {};
  const changes: string[] = [];

  if (status && status !== ticket.status) {
    updates.status = status;
    changes.push(`Status changed from ${ticket.status} to ${status}`);
  }
  if (priority && priority !== ticket.priority) {
    updates.priority = priority;
    changes.push(`Priority changed from ${ticket.priority} to ${priority}`);
  }
  if (type && type !== ticket.type) {
    updates.type = type;
    changes.push(`Type changed from ${ticket.type} to ${type}`);
  }

  if (Object.keys(updates).length === 0) return jsonOk({ noChanges: true });

  await prisma.$transaction([
    prisma.ticket.updateMany({
      where: { id: params.id, tenantId: ctx.tenantId },
      data: updates,
    }),
    ...(changes.length
      ? [
          prisma.ticketComment.create({
            data: {
              ticketId: params.id,
              authorId: ctx.user.id,
              body: `[SYSTEM] ${changes.join(" · ")}`,
            },
          }),
        ]
      : []),
  ]);

  await auditLog({
    tenantId: ctx.tenantId,
    actorUserId: ctx.user.id,
    action: "ticket.update",
    targetType: "ticket",
    targetId: params.id,
    metaJson: { changes, updates },
  });

  // Ticket status/type/priority email notification (best-effort)
  try {
    if (changes.length > 0) {
      const tenantRow = await prisma.tenant.findUnique({
        where: { id: ctx.tenantId },
        select: { slug: true, name: true, themeJson: true },
      });

      const tenantSlug = tenantRow?.slug || tenant;
      const brand = (tenantRow?.themeJson as any)?.brandName || tenantRow?.name || "WebCompliance";

      const url = `${process.env.NEXT_PUBLIC_BASE_URL || "http://localhost:3000"}/app/${tenantSlug}/tickets/${params.id}`;
      const message = `Ticket updated by ${ctx.user.email || "user"}:\n\n${changes.join("\n")}`;

      const mail = ticketNotificationEmail({
        brand,
        tenantSlug,
        ticketId: params.id,
        title: ticket.title,
        message,
        url,
      });

      const to = await getTicketRecipientEmails({
        tenantId: ctx.tenantId,
        ticketId: params.id,
        exclude: [ctx.user.email || ""],
      });

      await sendEmail({
        tenantId: ctx.tenantId,
        actorUserId: ctx.user.id,
        to,
        subject: mail.subject,
        text: mail.text,
        html: mail.html,
        tags: { kind: "ticket_update" },
      });
    }
  } catch (e) {
    console.error("ticket update email failed", e);
  }

  return jsonOk({});
}
