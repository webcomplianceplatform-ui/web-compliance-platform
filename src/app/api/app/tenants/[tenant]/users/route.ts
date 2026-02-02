import bcrypt from "bcryptjs";
import { prisma } from "@/lib/db";
import { UserRole } from "@prisma/client";
import { requireTenantContextApi, requireRecentMfaApi, canManageUsers, allowedAssignableRoles } from "@/lib/tenant-auth";
import { z } from "zod";
import { parseJson, jsonOk, jsonError } from "@/lib/api-helpers";
import { getClientIp } from "@/lib/ip";
import { rateLimit } from "@/lib/rate-limit";
import { auditLog } from "@/lib/audit";
import { sendEmail, getTenantNotificationEmails, getTenantOwnerAdminEmails } from "@/lib/mailer";
import { inviteEmail } from "@/lib/email-templates/invite";

function normalizeRole(role: unknown): UserRole | null {
  if (role === "OWNER") return UserRole.OWNER;
  if (role === "ADMIN") return UserRole.ADMIN;
  if (role === "CLIENT") return UserRole.CLIENT;
  if (role === "VIEWER") return UserRole.VIEWER;
  return null;
}

async function ownersCount(tenantId: string) {
  return prisma.userTenant.count({ where: { tenantId, role: UserRole.OWNER } });
}

export async function GET(_req: Request, routeCtx: any) {
  const params = await routeCtx.params;

  const ctxRes = await requireTenantContextApi(params.tenant);
  if (ctxRes.ok === false) {
    return ctxRes.res;
  }

  const { tenantId, role, isSuperadmin } = ctxRes.ctx;

  const members = await prisma.userTenant.findMany({
    where: { tenantId },
    select: {
      role: true,
      user: { select: { id: true, email: true, name: true } },
    },
    orderBy: [{ role: "asc" }, { user: { email: "asc" } }],
  });

  return jsonOk({
    canManage: canManageUsers(role, isSuperadmin),
    myRole: role,
    members: members.map((m) => ({
      userId: m.user.id,
      email: m.user.email,
      name: m.user.name,
      role: m.role,
    })),
  });
}

const AddUserSchema = z.object({
  email: z.string().email().transform((e) => e.trim().toLowerCase()),
  name: z.string().max(120).optional(),
  role: z.enum(["OWNER", "ADMIN", "CLIENT", "VIEWER"]),
});

export async function POST(req: Request, routeCtx: any) {
  const params = await routeCtx.params;

  const ctxRes = await requireTenantContextApi(params.tenant);
if (ctxRes.ok === false) {
  return ctxRes.res;
}

const { tenantId, role: myRole, user: me, isSuperadmin } = ctxRes.ctx;

// Sensitive action: user management requires recent MFA (5 min) when tenant policy is enabled.
if ((ctxRes.ctx.features as any)?.mfaRequired && !ctxRes.ctx.isImpersonating) {
  const recent = await requireRecentMfaApi({ tenantSlug: params.tenant, tenantId, userId: me.id, maxAgeMs: 5 * 60 * 1000 });
  if (!recent.ok) return recent.res;
}

const ip = getClientIp(req);
const rl = rateLimit({ key: `users:add:${tenantId}:${ip}`, limit: 20, windowMs: 60_000 });
if (rl.ok === false) {
  return jsonError("rate_limited", 429, { retryAfterSec: rl.retryAfterSec });
}

if (!canManageUsers(myRole, isSuperadmin)) {
  return jsonError("forbidden", 403);
}


  const parsed = await parseJson(req, AddUserSchema);
  if (parsed.ok === false) {
    return parsed.res;
  }

  const email = parsed.data.email;
  const name = parsed.data.name?.trim() || null;
  const wantedRole = normalizeRole(parsed.data.role);
  if (!wantedRole) {
    return jsonError("invalid_input", 400);
  }

  // Role assignment policy
  const allowed = allowedAssignableRoles(myRole, isSuperadmin);
  if (!allowed.includes(wantedRole)) {
    return jsonError("forbidden_role", 403, { allowedRoles: allowed });
  }

  let tempPassword: string | null = null;

  const existingUser = await prisma.user.findUnique({
    where: { email },
    select: { id: true, passwordHash: true },
  });

  if (!existingUser) {
    tempPassword = "Temp-" + Math.random().toString(36).slice(2, 10);
    const passwordHash = await bcrypt.hash(tempPassword, 10);
    await prisma.user.create({ data: { email, name, passwordHash } });
  } else if (!existingUser.passwordHash) {
    tempPassword = "Temp-" + Math.random().toString(36).slice(2, 10);
    const passwordHash = await bcrypt.hash(tempPassword, 10);
    await prisma.user.update({
      where: { id: existingUser.id },
      data: { passwordHash, name: name ?? undefined },
    });
  } else if (name) {
    await prisma.user.update({ where: { id: existingUser.id }, data: { name } });
  }

  const user = await prisma.user.findUnique({ where: { email }, select: { id: true } });
  if (!user) return jsonError("unexpected", 500);

  await prisma.userTenant.upsert({
    where: { userId_tenantId: { userId: user.id, tenantId } },
    update: { role: wantedRole },
    create: { userId: user.id, tenantId, role: wantedRole },
  });

  await auditLog({
    tenantId,
    actorUserId: me.id,
    action: "tenant.user.add",
    targetType: "user",
    targetId: user.id,
    metaJson: { category: "SECURITY", role: wantedRole, email },
  });

  // Email invite (best-effort)
  try {
    const tenant = await prisma.tenant.findUnique({
      where: { id: tenantId },
      select: { slug: true, name: true, themeJson: true },
    });

    const brand = (tenant?.themeJson as any)?.brandName || tenant?.name || "WebCompliance";
    const loginUrl = `${process.env.NEXT_PUBLIC_BASE_URL || "http://localhost:3000"}/login`;
    const mail = inviteEmail({
      brand,
      tenantSlug: tenant?.slug || params.tenant,
      tempPassword: !existingUser ? tempPassword : null,
      loginUrl,
    });

    const notif = await getTenantNotificationEmails(tenantId);
    const fallbackAdmins = await getTenantOwnerAdminEmails(tenantId);
    const to = notif.ticketEmails?.length ? notif.ticketEmails : fallbackAdmins;

    await sendEmail({
      tenantId,
      actorUserId: me.id,
      to: [email, ...to],
      subject: mail.subject,
      text: mail.text,
      html: mail.html,
      tags: { kind: "invite" },
    });
  } catch (e) {
    console.error("invite email failed", e);
  }

  return jsonOk({ tempPassword });
}

const UpdateRoleSchema = z.object({
  userId: z.string().min(1),
  role: z.enum(["OWNER", "ADMIN", "CLIENT", "VIEWER"]),
});

export async function PATCH(req: Request, routeCtx: any) {
  const params = await routeCtx.params;

  const ctxRes = await requireTenantContextApi(params.tenant);
if (ctxRes.ok === false) {
  return ctxRes.res;
}

const { user: me, tenantId, role: myRole, isSuperadmin } = ctxRes.ctx;

if ((ctxRes.ctx.features as any)?.mfaRequired && !ctxRes.ctx.isImpersonating) {
  const recent = await requireRecentMfaApi({ tenantSlug: params.tenant, tenantId, userId: me.id, maxAgeMs: 5 * 60 * 1000 });
  if (!recent.ok) return recent.res;
}

if ((ctxRes.ctx.features as any)?.mfaRequired && !ctxRes.ctx.isImpersonating) {
  const recent = await requireRecentMfaApi({ tenantSlug: params.tenant, tenantId, userId: me.id, maxAgeMs: 5 * 60 * 1000 });
  if (!recent.ok) return recent.res;
}

const ip = getClientIp(req);
const rl = rateLimit({ key: `users:update:${tenantId}:${ip}`, limit: 60, windowMs: 60_000 });
if (rl.ok === false) {
  return jsonError("rate_limited", 429, { retryAfterSec: rl.retryAfterSec });
}

if (!canManageUsers(myRole, isSuperadmin)) {
  return jsonError("forbidden", 403);
}


  const parsed = await parseJson(req, UpdateRoleSchema);
  if (parsed.ok === false) {
    return parsed.res;
  }

  const targetUserId = parsed.data.userId;
  const newRole = normalizeRole(parsed.data.role);
  if (!newRole) {
    return jsonError("invalid_input", 400);
  }

  const membership = await prisma.userTenant.findUnique({
    where: { userId_tenantId: { userId: targetUserId, tenantId } },
    select: { role: true, userId: true },
  });
  if (!membership) return jsonError("not_found", 404);

  // Role assignment policy
  const allowed = allowedAssignableRoles(myRole, isSuperadmin);
  if (!allowed.includes(newRole)) {
    return jsonError("forbidden_role", 403, { allowedRoles: allowed });
  }

  // ADMIN cannot modify OWNER/ADMIN memberships at all
  if (!isSuperadmin && myRole === UserRole.ADMIN) {
    if (membership.role === UserRole.OWNER || membership.role === UserRole.ADMIN) {
      return jsonError("cannot_modify_role", 403);
    }
  }

  // Prevent demoting last OWNER
  if (membership.role === UserRole.OWNER && newRole !== UserRole.OWNER) {
    const countOwners = await ownersCount(tenantId);
    if (countOwners <= 1) return jsonError("last_owner", 409);
  }

  // Prevent changing your own role unless OWNER or superadmin
  if (membership.userId === me.id && !isSuperadmin && myRole !== UserRole.OWNER && newRole !== myRole) {
    return jsonError("cannot_change_self", 403);
  }

  await prisma.userTenant.update({
    where: { userId_tenantId: { userId: targetUserId, tenantId } },
    data: { role: newRole },
  });

  await auditLog({
    tenantId,
    actorUserId: me.id,
    action: "tenant.user.role.update",
    targetType: "user",
    targetId: targetUserId,
    metaJson: { category: "SECURITY", fromRole: membership.role, toRole: newRole, elevation: (membership.role !== newRole) && (["OWNER","ADMIN"].includes(String(newRole))) },
  });

  return jsonOk({});
}

const RemoveUserSchema = z.object({
  userId: z.string().min(1),
});

export async function DELETE(req: Request, routeCtx: any) {
  const params = await routeCtx.params;

  const ctxRes = await requireTenantContextApi(params.tenant);
if (ctxRes.ok === false) {
  return ctxRes.res;
}

const { user: me, tenantId, role: myRole, isSuperadmin } = ctxRes.ctx;

const ip = getClientIp(req);
const rl = rateLimit({ key: `users:remove:${tenantId}:${ip}`, limit: 60, windowMs: 60_000 });
if (rl.ok === false) {
  return jsonError("rate_limited", 429, { retryAfterSec: rl.retryAfterSec });
}

if (!canManageUsers(myRole, isSuperadmin)) {
  return jsonError("forbidden", 403);
}


  const parsed = await parseJson(req, RemoveUserSchema);
  if (parsed.ok === false) {
    return parsed.res;
  }

  const targetUserId = parsed.data.userId;

  const membership = await prisma.userTenant.findUnique({
    where: { userId_tenantId: { userId: targetUserId, tenantId } },
    select: { role: true, userId: true },
  });
  if (!membership) return jsonError("not_found", 404);

  if (!isSuperadmin && myRole === UserRole.ADMIN) {
    if (membership.role === UserRole.OWNER || membership.role === UserRole.ADMIN) {
      return jsonError("cannot_remove_role", 403);
    }
  }

  if (membership.role === UserRole.OWNER) {
    const countOwners = await ownersCount(tenantId);
    if (countOwners <= 1) return jsonError("last_owner", 409);
  }

  if (membership.userId === me.id && !isSuperadmin && myRole !== UserRole.OWNER) {
    return jsonError("cannot_remove_self", 403);
  }

  await prisma.userTenant.delete({
    where: { userId_tenantId: { userId: targetUserId, tenantId } },
  });

  await auditLog({
    tenantId,
    actorUserId: me.id,
    action: "tenant.user.remove",
    targetType: "user",
    targetId: targetUserId,
    metaJson: { category: "SECURITY" },
  });

  return jsonOk({});
}
