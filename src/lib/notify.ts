import { prisma } from "@/lib/db";
import { getTenantNotificationEmails, getTenantOwnerAdminEmails } from "@/lib/mailer";

function uniq(list: string[]) {
  return Array.from(new Set(list.map((s) => s.trim().toLowerCase()).filter(Boolean)));
}

export async function getTicketRecipientEmails(opts: { tenantId: string; ticketId: string; exclude?: string[] }) {
  const exclude = new Set((opts.exclude || []).map((s) => s.toLowerCase()));

  const ticket = await prisma.ticket.findUnique({
    where: { id: opts.ticketId },
    select: {
      createdBy: { select: { email: true } },
      comments: { select: { author: { select: { email: true } } } },
    },
  });

  const base = [
    ticket?.createdBy.email,
    ...(ticket?.comments.map((c) => c.author.email) || []),
  ].filter(Boolean) as string[];

  const notif = await getTenantNotificationEmails(opts.tenantId);
  const fallbackAdmins = await getTenantOwnerAdminEmails(opts.tenantId);

  const list = uniq([...base, ...(notif.ticketEmails.length ? notif.ticketEmails : fallbackAdmins)]);
  return list.filter((e) => !exclude.has(e));
}

export async function getMonitorRecipientEmails(opts: { tenantId: string }) {
  const notif = await getTenantNotificationEmails(opts.tenantId);
  const fallbackAdmins = await getTenantOwnerAdminEmails(opts.tenantId);
  return uniq(notif.monitorEmails.length ? notif.monitorEmails : fallbackAdmins);
}
