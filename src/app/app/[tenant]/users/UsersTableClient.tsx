"use client";

import { useMemo, useState } from "react";

import EmptyState from "@/components/app/EmptyState";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/components/ui/toast";

type Role = "OWNER" | "ADMIN" | "CLIENT" | "VIEWER";

type Member = {
  userId: string;
  name: string | null;
  email: string;
  role: Role;
};

type Props = {
  tenant: string;
  members: Member[];
  myRole: Role;
  canManage: boolean;
};

function canEditRole(myRole: Role, targetRole: Role) {
  // OWNER can edit anyone.
  if (myRole === "OWNER") return true;
  // ADMIN cannot edit OWNER.
  if (myRole === "ADMIN" && targetRole !== "OWNER") return true;
  return false;
}

function allowedRoles(myRole: Role, targetRole: Role): Role[] {
  if (myRole === "OWNER") return ["OWNER", "ADMIN", "CLIENT", "VIEWER"];
  if (myRole === "ADMIN") {
    if (targetRole === "OWNER") return ["OWNER"];
    return ["ADMIN", "CLIENT", "VIEWER"];
  }
  return [targetRole];
}

function errorToText(err: any) {
  const code = err?.error ?? err?.message ?? "unknown";
  switch (code) {
    case "last_owner":
      return "You can't remove/demote the last OWNER.";
    case "cannot_modify_owner":
      return "Admins can't modify OWNER users.";
    case "cannot_remove_owner":
      return "Admins can't remove OWNER users.";
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

export default function UsersTableClient({ tenant, members, myRole, canManage }: Props) {
  const toast = useToast();
  const [rows, setRows] = useState<Member[]>(members);
  const [loadingId, setLoadingId] = useState<string | null>(null);

  const apiBase = useMemo(() => `/api/app/tenants/${tenant}/users`, [tenant]);

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
      if (!res.ok || !data.ok) throw data;
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
      if (!res.ok || !data.ok) throw data;
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

      <div className={`overflow-hidden rounded border ${rows.length === 0 ? "hidden" : "block"}`}>
        <table className="w-full text-sm">
          <thead className="border-b bg-muted/50">
            <tr>
              <th className="p-3 text-left">Name</th>
              <th className="p-3 text-left">Email</th>
              <th className="p-3 text-left">Role</th>
              {canManage && <th className="p-3 text-right">Actions</th>}
            </tr>
          </thead>
          <tbody>
            {rows.map((m) => {
              const editable = canManage && canEditRole(myRole, m.role);
              const isBusy = loadingId === m.userId;
              return (
                <tr key={m.userId} className="border-b last:border-b-0">
                  <td className="p-3">{m.name ?? "—"}</td>
                  <td className="p-3 font-mono">{m.email}</td>
                  <td className="p-3">
                    {editable ? (
                      <select
                        className="rounded border px-2 py-1 font-mono"
                        value={m.role}
                        disabled={isBusy}
                        onChange={(e) => changeRole(m.userId, e.target.value as Role)}
                      >
                        {allowedRoles(myRole, m.role).map((r) => (
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
                  {canManage && (
                    <td className="p-3 text-right">
                      <button
                        className="rounded border px-3 py-1 text-xs disabled:opacity-50"
                        disabled={isBusy || !editable}
                        onClick={() => removeUser(m.userId)}
                        title={!editable ? "You can't remove this user" : ""}
                      >
                        Remove
                      </button>
                    </td>
                  )}
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}
