"use client";

import { useState } from "react";

type Role = "OWNER" | "ADMIN" | "CLIENT" | "VIEWER";

function allowedInviteRoles(myRole: Role, isSuperadmin: boolean): Role[] {
  if (isSuperadmin) return ["OWNER", "ADMIN", "CLIENT", "VIEWER"];
  if (myRole === "OWNER") return ["ADMIN", "CLIENT", "VIEWER"];
  if (myRole === "ADMIN") return ["CLIENT", "VIEWER"];
  return [];
}

export default function InviteClient({
  tenantSlug,
  myRole,
  isSuperadmin,
}: {
  tenantSlug: string;
  myRole: Role;
  isSuperadmin: boolean;
}) {
  const [email, setEmail] = useState("");
  const [name, setName] = useState("");
  const roles = allowedInviteRoles(myRole, isSuperadmin);
  const [role, setRole] = useState<Role>(roles.includes("CLIENT") ? "CLIENT" : roles[0] ?? "VIEWER");
  const [result, setResult] = useState<string | null>(null);

  return (
    <main className="max-w-md">
      <h1 className="text-2xl font-semibold">Invite user</h1>

      <div className="mt-4 space-y-3">
        <input
          className="w-full rounded border p-2"
          placeholder="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
        />
        <input
          className="w-full rounded border p-2"
          placeholder="name (optional)"
          value={name}
          onChange={(e) => setName(e.target.value)}
        />

        <select
          className="w-full rounded border p-2"
          value={role}
          onChange={(e) => setRole(e.target.value as Role)}
        >
          {roles.map((r) => (
            <option key={r} value={r}>
              {r}
            </option>
          ))}
        </select>

        <button
          className="rounded-xl bg-primary px-3 py-2 text-primary-foreground transition hover:-translate-y-0.5 hover:shadow-sm"
          onClick={async () => {
            setResult(null);
            const res = await fetch(`/api/app/tenants/${tenantSlug}/users`, {
              method: "POST",
              headers: { "content-type": "application/json" },
              body: JSON.stringify({ email, name, role }),
            });
            const data = await res.json();
            if (!data.ok) {
              setResult("Error: " + (data.error ?? res.status));
              return;
            }
            if (data.tempPassword) {
              setResult("User created. Temp password: " + data.tempPassword);
            } else {
              setResult("User added/updated in tenant.");
            }
          }}
        >
          Create invite
        </button>

        {result && <div className="rounded border p-3 text-sm">{result}</div>}
      </div>
    </main>
  );
}
