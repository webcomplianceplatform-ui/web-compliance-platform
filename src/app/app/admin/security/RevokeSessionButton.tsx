"use client";

import { useState } from "react";

export function RevokeSessionButton({
  sessionId,
  isCurrent = false,
}: {
  sessionId: string;
  isCurrent?: boolean;
}) {
  const [loading, setLoading] = useState(false);
  const [done, setDone] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function onSignOut() {
    // NextAuth signout (sin dependencias)
    setLoading(true);
    setError(null);
    try {
      // NextAuth espera form-encoded normalmente
      const res = await fetch("/api/auth/signout", {
        method: "POST",
        headers: { "Content-Type": "application/x-www-form-urlencoded" },
        body: new URLSearchParams({ callbackUrl: "/login" }).toString(),
        credentials: "include",
      });

      // si NextAuth devuelve HTML redir, lo más robusto:
      window.location.href = "/login";
    } catch (e: any) {
      setError(e?.message ?? "request_failed");
    } finally {
      setLoading(false);
    }
  }

  async function onRevoke() {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/admin/sessions/revoke", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ sessionId }),
        credentials: "include",
      });

      // Step-up requerido (expected)
      if (res.status === 428) {
        setError("reauth_required");
        return;
      }

      const j = await res.json().catch(() => null);
      if (!res.ok || !j?.ok) {
        setError(j?.error ?? "request_failed");
        return;
      }

      setDone(true);
      window.location.reload();
    } catch (e: any) {
      setError(e?.message ?? "request_failed");
    } finally {
      setLoading(false);
    }
  }

  // ✅ Si es la sesión actual: no “revoke”, sino logout.
  if (isCurrent) {
    return (
      <div className="flex items-center gap-2">
        <span className="rounded-full border border-border bg-bg1 px-2 py-1 text-[10px] font-semibold text-muted-foreground">
          This device
        </span>
        <button
          onClick={onSignOut}
          disabled={loading}
          className="inline-flex items-center rounded-lg border border-border bg-bg1 px-3 py-1.5 text-xs font-semibold hover:bg-bg2 disabled:opacity-50"
          title="Sign out from this session"
        >
          {loading ? "Signing out..." : "Sign out"}
        </button>
        {error && <span className="text-xs text-destructive">{error}</span>}
      </div>
    );
  }

  return (
    <div className="flex items-center gap-2">
      <button
        onClick={onRevoke}
        disabled={loading || done}
        className="inline-flex items-center rounded-lg border border-border bg-bg1 px-3 py-1.5 text-xs font-semibold hover:bg-bg2 disabled:opacity-50"
      >
        {done ? "Revoked" : loading ? "Revoking..." : "Revoke"}
      </button>

      {/* UX: si pide step-up, lo decimos claro */}
      {error === "reauth_required" ? (
        <span className="text-xs text-muted-foreground">
          Re-auth required. <a className="underline" href="/app/account/mfa/verify?callbackUrl=%2Fapp%2Fadmin%2Fsecurity">Verify</a>
        </span>
      ) : error ? (
        <span className="text-xs text-destructive">{error}</span>
      ) : null}
    </div>
  );
}
