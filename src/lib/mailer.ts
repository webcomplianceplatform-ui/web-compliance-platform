import { auditLog } from "@/lib/audit";
import { prisma } from "@/lib/db";

type SendEmailArgs = {
  tenantId?: string | null;
  actorUserId?: string | null;
  to: string[]; // deduped
  subject: string;
  text: string;
  html?: string;
  tags?: Record<string, string>;
};

function uniqLower(list: string[]) {
  return Array.from(new Set(list.map((s) => s.trim().toLowerCase()).filter(Boolean)));
}

export async function getTenantNotificationEmails(tenantId: string) {
  const tenant = await prisma.tenant.findUnique({
    where: { id: tenantId },
    select: { themeJson: true },
  });

  const theme: any = tenant?.themeJson || {};
  const ticket = Array.isArray(theme?.notifications?.ticketEmails) ? theme.notifications.ticketEmails : [];
  const monitor = Array.isArray(theme?.notifications?.monitorEmails) ? theme.notifications.monitorEmails : [];

  return {
    ticketEmails: uniqLower(ticket),
    monitorEmails: uniqLower(monitor),
  };
}

export async function getTenantOwnerAdminEmails(tenantId: string) {
  const members = await prisma.userTenant.findMany({
    where: { tenantId, role: { in: ["OWNER", "ADMIN"] } as any },
    select: { user: { select: { email: true } } },
  });
  return uniqLower(members.map((m) => m.user.email));
}

export async function sendEmail(args: SendEmailArgs) {
  const to = uniqLower(args.to);
  if (to.length === 0) return { ok: true as const, skipped: true as const };

  const apiKey = process.env.RESEND_API_KEY;
  const from = process.env.MAIL_FROM || "no-reply@webcompliance.local";

  // Safe default: if no provider configured, just log (MVP-friendly)
  if (!apiKey) {
    console.log("[MAIL:DEV]", { from, to, subject: args.subject, text: args.text });
    if (args.tenantId) {
      await auditLog({
        tenantId: args.tenantId,
        actorUserId: args.actorUserId ?? null,
        action: "email.skipped_no_provider",
        targetType: "Email",
        targetId: null,
        meta: { to, subject: args.subject, tags: args.tags || {} },
      });
    }
    return { ok: true as const, skipped: true as const };
  }

  const payload: any = {
    from,
    to,
    subject: args.subject,
    text: args.text,
  };
  if (args.html) payload.html = args.html;

  const res = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify(payload),
  });

  if (!res.ok) {
    const body = await res.text().catch(() => "");
    console.error("[MAIL:ERROR]", res.status, body);
    return { ok: false as const, status: res.status, body };
  }

  if (args.tenantId) {
    await auditLog({
      tenantId: args.tenantId,
      actorUserId: args.actorUserId ?? null,
      action: "email.sent",
      targetType: "Email",
      targetId: null,
      meta: { to, subject: args.subject, tags: args.tags || {} },
    });
  }

  return { ok: true as const };
}
