"use client";

import { useState } from "react";

export default function InviteClient({ tenantSlug }: { tenantSlug: string }) {
  const [email, setEmail] = useState("");
  const [name, setName] = useState("");
  const [role, setRole] = useState("CLIENT");
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
          onChange={(e) => setRole(e.target.value)}
        >
          <option value="ADMIN">ADMIN</option>
          <option value="CLIENT">CLIENT</option>
          <option value="VIEWER">VIEWER</option>
        </select>

        <button
          className="rounded bg-black px-3 py-2 text-white"
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
