"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

export function RevokeSessionsForm() {
  const [email, setEmail] = useState("");
  const [status, setStatus] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setStatus(null);
    setLoading(true);
    try {
      const res = await fetch("/api/admin/users/revoke-sessions", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ email }),
      });
      const json = await res.json().catch(() => null);
      if (res.ok && json?.ok) {
        setStatus("✅ Sessions revoked (sessionVersion bumped). The user will be logged out on next request.");
        setEmail("");
      } else if (json?.error === "reauth_required") {
        setStatus("⚠️ Re-auth required (global MFA). Open /app/account/mfa/verify and try again.");
      } else {
        setStatus(`❌ Failed: ${json?.error ?? res.status}`);
      }
    } finally {
      setLoading(false);
    }
  }

  return (
    <form onSubmit={onSubmit} className="flex flex-col gap-2 sm:flex-row sm:items-center">
      <Input
        value={email}
        onChange={(e) => setEmail(e.target.value)}
        placeholder="user@email.com"
        className="sm:w-80"
        inputMode="email"
      />
      <Button type="submit" disabled={loading || !email.trim()}>
        {loading ? "Revoking..." : "Revoke sessions"}
      </Button>
      {status && <div className="text-xs text-muted-foreground">{status}</div>}
    </form>
  );
}
