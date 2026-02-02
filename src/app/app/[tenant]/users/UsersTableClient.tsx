"use client";

import { useMemo, useState } from "react";

import EmptyState from "@/components/app/EmptyState";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/components/ui/toast";
import { AppButton, appButtonClassName } from "@/components/app-ui/AppButton";
import { AppTable, AppTableHead, AppTableRow } from "@/components/app-ui/AppTable";

type Role = "OWNER" | "ADMIN" | "CLIENT" | "VIEWER";

type Member = {
  userId: string;
  name: string | null;
  email: string;
  role: Role;
  mfaEnabled: boolean;
};

type Props = {
  tenant: string;
  members: Member[];
  myRole: Role;
  isSuperadmin: boolean;
  canManage: boolean;
};

function canEditRole(myRole: Role, targetRole: Role, isSuperadmin: boolean) {
  if (isSuperadmin) return true;
  // OWNER can edit anyone.
  if (myRole === "OWNER") {
    // In tenant scope, OWNER cannot change OWNER memberships (reserved for superadmin).
    return targetRole !== "OWNER";
  }
  // ADMIN can only edit CLIENT/VIEWER.
  if (myRole === "ADMIN") return targetRole === "CLIENT" || targetRole === "VIEWER";
  return false;
}

function allowedRoles(myRole: Role, targetRole: Role, isSuperadmin: boolean): Role[] {
  if (isSuperadmin) return ["OWNER", "ADMIN", "CLIENT", "VIEWER"];

  if (myRole === "OWNER") {
    // OWNER can't promote/demote OWNER. Only superadmin can.
    if (targetRole === "OWNER") return ["OWNER"];
    return ["ADMIN", "CLIENT", "VIEWER"];
  }

  if (myRole === "ADMIN") {
    // ADMIN can only set CLIENT/VIEWER and only for CLIENT/VIEWER members.
    if (targetRole === "CLIENT" || targetRole === "VIEWER") return ["CLIENT", "VIEWER"];
    return [targetRole];
  }

  return [targetRole];
}

function errorToText(err: any) {
  const code = err?.error ?? err?.message ?? "unknown";
  switch (code) {
    case "last_owner":
      return "You can't remove/demote the last OWNER.";
    case "cannot_modify_owner":
    case "cannot_modify_role":
      return "You can't modify this user's role.";
    case "cannot_remove_owner":
    case "cannot_remove_role":
      return "You can't remove this user.";
    case "forbidden_role":
      return "You don't have permission to assign that role.";
    case "cannot_change_self":
      return "Admins can't change their own role.";
    case "cannot_remove_self":
      return "Admins can't remove themselves.";
    default:
      return typeof code === "string" ? code : "Unexpected error";
  }
}

export default function UsersTableClient({ tenant, members, myRole, isSuperadmin, canManage }: Props) {
  const toast = useToast();
  const [rows, setRows] = useState<Member[]>(members);
  const [loadingId, setLoadingId] = useState<string | null>(null);

  const apiBase = useMemo(() => `/api/app/tenants/${tenant}/users`, [tenant]);
  const mfaRemoveUrl = useMemo(() => `/api/app/${tenant}/security/mfa-remove-user`, [tenant]);

  async function removeMfa(userId: string) {
    if (!confirm("Remove MFA for this user? This will force them to re-enroll.")) return;
    setLoadingId(userId);
    try {
      const res = await fetch(mfaRemoveUrl, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ userId }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok || !data.ok) {
        if (data?.error === "reauth_required" && data?.reauthUrl) {
          window.location.href = `${data.reauthUrl}?callbackUrl=${encodeURIComponent(window.location.pathname)}`;
          return;
        }
        throw data;
      }
      setRows((r) => r.map((m) => (m.userId === userId ? { ...m, mfaEnabled: false } : m)));
      toast.push({ variant: "success", message: "MFA removed" });
    } catch (e) {
      toast.push({ variant: "error", message: errorToText(e) });
    } finally {
      setLoadingId(null);
    }
  }

  async function changeRole(userId: string, role: Role) {
    setLoadingId(userId);
    const prev = rows;
    setRows((r) => r.map((m) => (m.userId === userId ? { ...m, role } : m)));
    try {
      const res = await fetch(apiBase, {
        method: "PATCH",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ userId, role }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok || !data.ok) {
        if (data?.error === "reauth_required" && data?.reauthUrl) {
          window.location.href = `${data.reauthUrl}?callbackUrl=${encodeURIComponent(window.location.pathname)}`;
          return;
        }
        throw data;
      }
      toast.push({ variant: "success", message: "Role updated" });
    } catch (e) {
      setRows(prev);
      toast.push({ variant: "error", message: errorToText(e) });
    } finally {
      setLoadingId(null);
    }
  }

  async function removeUser(userId: string) {
    if (!confirm("Remove this user from the tenant?")) return;

    setLoadingId(userId);
    const prev = rows;
    setRows((r) => r.filter((m) => m.userId !== userId));
    try {
      const res = await fetch(apiBase, {
        method: "DELETE",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ userId }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok || !data.ok) {
        if (data?.error === "reauth_required" && data?.reauthUrl) {
          window.location.href = `${data.reauthUrl}?callbackUrl=${encodeURIComponent(window.location.pathname)}`;
          return;
        }
        throw data;
      }
      toast.push({ variant: "success", message: "User removed" });
    } catch (e) {
      setRows(prev);
      toast.push({ variant: "error", message: errorToText(e) });
    } finally {
      setLoadingId(null);
    }
  }

  return (
    <div className="mt-4">
      {rows.length === 0 ? (
        <EmptyState
          title="No users yet"
          description="Invite a user to collaborate on this tenant."
          actionLabel={canManage ? "Invite user" : undefined}
          actionHref={canManage ? `/app/${tenant}/users/invite` : undefined}
        />
      ) : null}

      <div className={rows.length === 0 ? "hidden" : "block"}>
        <AppTable>
          <AppTableHead>
            <tr>
              <th className="p-3 text-left">Name</th>
              <th className="p-3 text-left">Email</th>
              <th className="p-3 text-left">Role</th>
              <th className="p-3 text-left">MFA</th>
              {canManage && <th className="p-3 text-right">Actions</th>}
            </tr>
          </AppTableHead>
          <tbody>
            {rows.map((m) => {
              const editable = canManage && canEditRole(myRole, m.role, isSuperadmin);
              const isBusy = loadingId === m.userId;
              return (
                <AppTableRow key={m.userId}>
                  <td className="p-3">{m.name ?? "—"}</td>
                  <td className="p-3 font-mono">{m.email}</td>
                  <td className="p-3">
                    {editable ? (
                      <select
                        className="rounded-xl border border-border bg-bg2/50 px-2 py-1 font-mono transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand/30 focus-visible:border-brand2"
                        value={m.role}
                        disabled={isBusy}
                        onChange={(e) => changeRole(m.userId, e.target.value as Role)}
                      >
                        {allowedRoles(myRole, m.role, isSuperadmin).map((r) => (
                          <option key={r} value={r}>
                            {r}
                          </option>
                        ))}
                      </select>
                    ) : (
                      <Badge variant="outline" className="font-mono">
                        {m.role}
                      </Badge>
                    )}
                  </td>
                  <td className="p-3">
                    <Badge variant={m.mfaEnabled ? "default" : "outline"} className="font-mono">
                      {m.mfaEnabled ? "ENABLED" : "OFF"}
                    </Badge>
                  </td>
                  {canManage && (
                    <td className="p-3 text-right">
                      { (isSuperadmin || myRole === "OWNER") && m.mfaEnabled ? (
                        <button
                          className={appButtonClassName({ variant: "secondary", size: "sm", className: "px-3 py-1 mr-2" })}
                          disabled={isBusy}
                          onClick={() => removeMfa(m.userId)}
                        >
                          Remove MFA
                        </button>
                      ) : null}
                      <button
                        className={appButtonClassName({ variant: "danger", size: "sm", className: "px-3 py-1" })}
                        disabled={isBusy || !editable}
                        onClick={() => removeUser(m.userId)}
                        title={!editable ? "You can't remove this user" : ""}
                      >
                        Remove
                      </button>
                    </td>
                  )}
                </AppTableRow>
              );
            })}
          </tbody>
        </AppTable>
      </div>
    </div>
  );
}
