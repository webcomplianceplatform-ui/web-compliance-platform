import { prisma } from "@/lib/db";
import { requireSuperadminPage } from "@/lib/superadmin";
import { Badge } from "@/components/ui/badge";
import { AppTable, AppTableHead, AppTableRow } from "@/components/app-ui/AppTable";
import { RevokeSessionsForm } from "@/app/app/admin/security/RevokeSessionsForm";
import { RevokeSessionButton } from "@/app/app/admin/security/RevokeSessionButton";
import { AccessEventsTable } from "@/app/app/admin/security/tables/AccessEventsTable";
import { GlobalAuditTable } from "@/app/app/admin/security/tables/GlobalAuditTable";

export default async function AdminSecurityPage() {
  const { currentSessionId } = await requireSuperadminPage();

  const events = await prisma.auditEvent.findMany({
    where: { tenantId: null },
    orderBy: { createdAt: "desc" },
    take: 50,
    select: {
      id: true,
      action: true,
      targetType: true,
      targetId: true,
      createdAt: true,
      metaJson: true,
      actor: { select: { email: true } },
    },
  });

  const accessEvents = await prisma.accessEvent.findMany({
    orderBy: { createdAt: "desc" },
    take: 50,
    select: {
      id: true,
      userId: true,
      kind: true,
      ip: true,
      userAgent: true,
      metaJson: true,
      createdAt: true,
      user: { select: { email: true, name: true } },
      tenant: { select: { slug: true } },
    },
  });

  const sessions = await prisma.userSession.findMany({
    where: { revokedAt: null },
    orderBy: { lastSeenAt: "desc" },
    take: 50,
    select: {
      id: true,
      createdAt: true,
      lastSeenAt: true,
      ip: true,
      userAgent: true,
      user: { select: { email: true } },
    },
  });

  // Enrich UI with user display names/emails for AccessEvents + Global Audit targets.
  const userIds = new Set<string>();
  for (const a of accessEvents) if (a.userId) userIds.add(a.userId);
  for (const e of events) if (e.targetType === "User" && e.targetId) userIds.add(e.targetId);

  const users = userIds.size
    ? await prisma.user.findMany({
        where: { id: { in: Array.from(userIds) } },
        select: { id: true, name: true, email: true },
      })
    : [];
  const userMap = Object.fromEntries(users.map((u) => [u.id, u] as const));

  return (
    <main className="space-y-4">
      <div>
        <h1 className="text-2xl font-semibold">Admin · Security</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Global security view (superadmin only). This page focuses on access, MFA, and high-signal audit events.
        </p>
      </div>

      <div className="rounded-2xl border border-border bg-bg1/60 p-4">
        <div className="text-sm font-semibold">Active sessions (latest 50)</div>
        <div className="mt-1 text-xs text-muted-foreground">
          These are server-side session records (JWT strategy) used for per-session revocation.
        </div>

        <div className="mt-4 overflow-x-auto">
          <AppTable>
            <AppTableHead>
              <tr>
                <th className="p-3 text-left">User</th>
                <th className="p-3 text-left">Created</th>
                <th className="p-3 text-left">Last seen</th>
                <th className="p-3 text-left">IP</th>
                <th className="p-3 text-left">UA</th>
                <th className="p-3 text-left">Action</th>
              </tr>
            </AppTableHead>
            <tbody>
              {sessions.map((s) => (
                <AppTableRow key={s.id}>
                  <td className="p-3 text-sm">{s.user?.email ?? "—"}</td>
                  <td className="p-3 whitespace-nowrap text-sm">{new Date(s.createdAt).toLocaleString()}</td>
                  <td className="p-3 whitespace-nowrap text-sm">
                    {s.lastSeenAt ? new Date(s.lastSeenAt).toLocaleString() : "—"}
                  </td>
                  <td className="p-3 text-sm font-mono">{s.ip ?? "—"}</td>
                  <td className="p-3 text-xs text-muted-foreground">
                    {s.userAgent ? s.userAgent.slice(0, 70) : "—"}
                  </td>
                  <td className="p-3">
                    <RevokeSessionButton sessionId={s.id} isCurrent={!!currentSessionId && s.id === currentSessionId} />
                  </td>
                </AppTableRow>
              ))}

              {sessions.length === 0 && (
                <tr>
                  <td className="p-6 text-center text-sm text-muted-foreground" colSpan={6}>
                    No active sessions.
                  </td>
                </tr>
              )}
            </tbody>
          </AppTable>
        </div>
      </div>

      <div className="rounded-2xl border border-border bg-bg1/60 p-4">
        <div className="flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <div className="text-sm font-semibold">Access events (latest 50)</div>
            <div className="mt-1 text-xs text-muted-foreground">
              Successful logins, MFA verifications, and session revocations. This is the base for the Security Center.
            </div>
          </div>
          <div className="w-full sm:w-auto">
            <div className="text-xs font-semibold">Revoke a user's sessions</div>
            <div className="mt-2">
              <RevokeSessionsForm />
            </div>
          </div>
        </div>

        <div className="mt-4">
          <AccessEventsTable events={accessEvents as any} userMap={userMap as any} />
        </div>
      </div>

      <div className="rounded-2xl border border-border bg-bg1/60 p-4">
        <div className="text-sm font-semibold">Global audit (latest 50)</div>
        <div className="mt-1 text-xs text-muted-foreground">
          Tip: we will evolve this into a full Security Center (sessions, risk events, device approvals, step-up actions).
        </div>

        <GlobalAuditTable events={events as any} userMap={userMap as any} />
      </div>
    </main>
  );
}
