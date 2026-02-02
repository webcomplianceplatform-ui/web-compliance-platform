"use client";

import { useMemo, useState } from "react";
import Link from "next/link";

type Role = "OWNER" | "ADMIN" | "CLIENT" | "VIEWER";

export default function AdminProvisionPage() {
  const [tenantSlug, setTenantSlug] = useState("");
  const [tenantName, setTenantName] = useState("");
  const [userEmail, setUserEmail] = useState("");
  const [userName, setUserName] = useState("");
  const [role, setRole] = useState<Role>("OWNER");

  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  const [result, setResult] = useState<{
    tenant: { slug: string; name: string };
    user: { email: string; role: Role };
    tempPassword: string | null;
  } | null>(null);

  const normalizedSlug = useMemo(
    () => tenantSlug.trim().toLowerCase().replace(/\s+/g, "-"),
    [tenantSlug]
  );

  async function copy(text: string) {
    try {
      await navigator.clipboard.writeText(text);
    } catch {
      // ignore
    }
  }

  async function submit() {
    setErr(null);
    setResult(null);

    const payload = {
      tenantSlug: normalizedSlug,
      tenantName: tenantName.trim(),
      userEmail: userEmail.trim().toLowerCase(),
      userName: userName.trim() || undefined,
      role,
    };

    if (!payload.tenantSlug || !payload.tenantName || !payload.userEmail) {
      setErr("Missing required fields.");
      return;
    }

    setLoading(true);
    try {
      const r = await fetch("/api/admin/provision", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify(payload),
      });

      const j = await r.json().catch(() => null);

      if (!r.ok) {
        const msg =
          j?.error === "invalid_input"
            ? "Invalid input."
            : j?.error
            ? String(j.error)
            : "Request failed.";
        setErr(msg);
        return;
      }

      setResult({
        tenant: j.tenant,
        user: j.user,
        tempPassword: j.tempPassword ?? null,
      });
    } catch (e: any) {
      setErr(String(e?.message ?? e));
    } finally {
      setLoading(false);
    }
  }

  return (
    <main className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold">Provision</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Create (or update) a tenant, create (or attach) a user, and assign a role.
        </p>
      </div>

      <div className="rounded border p-4 space-y-4">
        <div className="grid gap-3 md:grid-cols-2">
          <div>
            <label className="text-sm font-medium">Tenant slug *</label>
            <input
              className="mt-1 w-full rounded border px-3 py-2 text-sm"
              placeholder="acme"
              value={tenantSlug}
              onChange={(e) => setTenantSlug(e.target.value)}
            />
            <div className="mt-1 text-xs text-muted-foreground">
              Normalized: <span className="font-mono">{normalizedSlug || "-"}</span>
            </div>
          </div>

          <div>
            <label className="text-sm font-medium">Tenant name *</label>
            <input
              className="mt-1 w-full rounded border px-3 py-2 text-sm"
              placeholder="ACME Corp"
              value={tenantName}
              onChange={(e) => setTenantName(e.target.value)}
            />
          </div>

          <div>
            <label className="text-sm font-medium">User email *</label>
            <input
              className="mt-1 w-full rounded border px-3 py-2 text-sm"
              placeholder="owner@acme.com"
              value={userEmail}
              onChange={(e) => setUserEmail(e.target.value)}
              type="email"
            />
          </div>

          <div>
            <label className="text-sm font-medium">User name</label>
            <input
              className="mt-1 w-full rounded border px-3 py-2 text-sm"
              placeholder="Alice"
              value={userName}
              onChange={(e) => setUserName(e.target.value)}
            />
          </div>

          <div>
            <label className="text-sm font-medium">Role *</label>
            <select
              className="mt-1 w-full rounded border px-3 py-2 text-sm"
              value={role}
              onChange={(e) => setRole(e.target.value as Role)}
            >
              <option value="OWNER">OWNER</option>
              <option value="ADMIN">ADMIN</option>
              <option value="CLIENT">CLIENT</option>
              <option value="VIEWER">VIEWER</option>
            </select>
            <div className="mt-1 text-xs text-muted-foreground">
              Tip: OWNER is the only role that should be able to manage everything.
            </div>
          </div>
        </div>

        {err && (
          <div className="rounded border border-red-300 bg-red-50 p-3 text-sm text-red-700">
            {err}
          </div>
        )}

        <div className="flex flex-wrap items-center gap-2">
          <button
            className="rounded-xl bg-primary px-3 py-2 text-sm text-primary-foreground transition hover:-translate-y-0.5 hover:shadow-sm disabled:opacity-60"
            onClick={submit}
            disabled={loading}
          >
            {loading ? "Provisioning..." : "Provision"}
          </button>

          <Link className="rounded border px-3 py-2 text-sm" href="/app/admin">
            Cancel
          </Link>
        </div>
      </div>

      {result && (
        <div className="rounded border p-4 space-y-3">
          <div className="text-sm">
            <div>
              <span className="font-medium">Tenant:</span>{" "}
              <span className="font-mono">{result.tenant.slug}</span> — {result.tenant.name}
            </div>
            <div>
              <span className="font-medium">User:</span> {result.user.email} —{" "}
              <span className="font-mono">{result.user.role}</span>
            </div>
          </div>

          <div className="rounded bg-muted/40 p-3">
            <div className="text-sm font-medium">Temp password</div>
            {result.tempPassword ? (
              <div className="mt-2 flex flex-wrap items-center gap-2">
                <code className="rounded border bg-white px-2 py-1 text-sm">{result.tempPassword}</code>
                <button
                  className="rounded border px-3 py-1.5 text-sm"
                  onClick={() => copy(result.tempPassword!)}
                >
                  Copy
                </button>
                <span className="text-xs text-muted-foreground">
                  (Only shown when user is created or had no password.)
                </span>
              </div>
            ) : (
              <div className="mt-1 text-sm text-muted-foreground">
                Not generated (user already had a password).
              </div>
            )}
          </div>

          <div className="flex flex-wrap gap-2">
            <Link className="rounded border px-3 py-2 text-sm" href={`/app/${result.tenant.slug}`}>
              Open tenant app
            </Link>
            <Link className="rounded border px-3 py-2 text-sm" href={`/t/${result.tenant.slug}`}>
              Open public site
            </Link>
          </div>
        </div>
      )}
    </main>
  );
}
