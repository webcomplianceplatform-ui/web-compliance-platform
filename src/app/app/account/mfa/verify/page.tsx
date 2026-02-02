"use client";

import { useState } from "react";
import { useSearchParams } from "next/navigation";

function classNames(...xs: Array<string | false | null | undefined>) {
  return xs.filter(Boolean).join(" ");
}

export default function VerifyMfaGlobalPage() {
  const sp = useSearchParams();
  const callbackUrl = sp.get("callbackUrl") ?? "/app/admin";
  const [token, setToken] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function onVerify() {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/account/mfa/verify", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        // Make cookie updates reliable across client-side navigations.
        // (Some edge cases can cache a server-rendered route before the new cookie is observed.)
        credentials: "include",
        body: JSON.stringify({ token }),
      });
      const json = await res.json();
      if (!json?.ok) {
        setError(json?.error ?? "Invalid code");
        return;
      }
      // Use a hard navigation so the next request definitely includes the newly set httpOnly MFA cookie.
      window.location.assign(callbackUrl);
    } catch (e: any) {
      setError(e?.message ?? "Unexpected error");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="min-h-screen bg-black text-white">
      <div className="mx-auto max-w-xl px-4 py-16">
        <h1 className="text-3xl font-semibold tracking-tight">Re-authenticate</h1>
        <p className="mt-2 text-sm text-white/70">
          Enter your authenticator code to continue.
        </p>

        <div className="mt-8 rounded-3xl border border-white/10 bg-white/5 p-6">
          <label className="text-sm text-white/70">Code</label>
          <input
            value={token}
            onChange={(e) => setToken(e.target.value)}
            placeholder="123456"
            inputMode="numeric"
            className="mt-2 w-full rounded-2xl border border-white/10 bg-black/30 px-4 py-3 text-sm outline-none focus:border-white/25"
          />

          {error ? <div className="mt-3 text-sm text-rose-200">{error}</div> : null}

          <button
            type="button"
            onClick={onVerify}
            disabled={loading || token.trim().length < 6}
            className={classNames(
              "mt-6 w-full rounded-2xl px-4 py-3 text-sm font-semibold",
              loading || token.trim().length < 6
                ? "bg-white/10 text-white/50"
                : "bg-white text-black hover:opacity-90",
            )}
          >
            {loading ? "Verifying..." : "Verify"}
          </button>
        </div>
      </div>
    </div>
  );
}
