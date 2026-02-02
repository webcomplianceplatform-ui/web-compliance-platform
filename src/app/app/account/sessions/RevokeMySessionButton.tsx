"use client";

import { useState } from "react";

export function RevokeMySessionButton(props: { sessionId: string; isCurrent?: boolean }) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function onClick() {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/account/sessions/revoke", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ sessionId: props.sessionId }),
      });
      const json = await res.json().catch(() => null);
      if (!res.ok || !json?.ok) {
        throw new Error(json?.error || "request_failed");
      }

      // If the user revoked the current session, force a navigation to refresh auth state.
      if (props.isCurrent) {
        window.location.assign("/login");
        return;
      }
      window.location.reload();
    } catch (e: any) {
      setError(String(e?.message ?? "error"));
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="flex flex-col items-end gap-1">
      <button
        onClick={onClick}
        disabled={loading}
        className="rounded-md border px-3 py-1 text-sm hover:bg-zinc-50 disabled:opacity-50"
      >
        {loading ? "Revoking..." : props.isCurrent ? "Revoke (this session)" : "Revoke"}
      </button>
      {error ? <span className="text-xs text-red-600">{error}</span> : null}
    </div>
  );
}
