"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";

function classNames(...xs: Array<string | false | null | undefined>) {
  return xs.filter(Boolean).join(" ");
}

export default function EnrollMfaGlobalPage() {
  const router = useRouter();
  const sp = useSearchParams();
  const callbackUrl = sp.get("callbackUrl") || "/app/admin";

  const [loading, setLoading] = useState(true);
  const [secret, setSecret] = useState<string | null>(null);
  const [otpauth, setOtpauth] = useState<string | null>(null);
  const [token, setToken] = useState("");
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let alive = true;
    (async () => {
      try {
        const res = await fetch("/api/account/mfa/setup", { method: "POST" });
        const j = await res.json();
        if (!alive) return;
        if (!res.ok || !j?.ok) {
          setError(j?.error || "setup_failed");
          setLoading(false);
          return;
        }
        setSecret(j.secret);
        setOtpauth(j.otpauth);
        setLoading(false);
      } catch {
        if (!alive) return;
        setError("setup_failed");
        setLoading(false);
      }
    })();
    return () => {
      alive = false;
    };
  }, []);

  const qrSrc = useMemo(() => {
    if (!otpauth) return null;
    return `https://api.qrserver.com/v1/create-qr-code/?size=220x220&data=${encodeURIComponent(otpauth)}`;
  }, [otpauth]);

  async function onVerify() {
    setError(null);
    const clean = token.replace(/\s/g, "");
    if (!clean) return;

    const res = await fetch("/api/account/mfa/verify", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ token: clean }),
    });
    const j = await res.json().catch(() => ({}));
    if (!res.ok || !j?.ok) {
      setError(j?.error || "invalid_code");
      return;
    }
    router.replace(callbackUrl);
  }

  return (
    <div className="mx-auto max-w-2xl p-6">
      <div className="rounded-3xl border border-white/10 bg-white/5 p-6">
        <h1 className="text-2xl font-semibold tracking-tight">Enable MFA (global)</h1>
        <p className="mt-2 text-sm text-white/70">
          Scan the QR with Google Authenticator, Microsoft Authenticator or 1Password, then type the 6-digit code.
        </p>

        {loading ? (
          <div className="mt-6 text-sm text-white/70">Preparing your QR...</div>
        ) : error ? (
          <div className="mt-6 rounded-2xl border border-rose-400/30 bg-rose-400/10 p-4 text-sm text-rose-100">
            {String(error)}
          </div>
        ) : (
          <div className="mt-6 grid gap-6 md:grid-cols-2 md:items-start">
            <div className="rounded-2xl border border-white/10 bg-black/20 p-4">
              <div className="text-sm font-semibold">QR</div>
              {qrSrc ? (
                <img
                  src={qrSrc}
                  alt="MFA QR"
                  className="mt-3 h-[220px] w-[220px] rounded-2xl border border-white/10 bg-white"
                />
              ) : null}
              <div className="mt-3 text-xs text-white/60">Secret (backup):</div>
              <div className="mt-1 select-all rounded-xl border border-white/10 bg-white/5 px-3 py-2 font-mono text-xs text-white/80">
                {secret}
              </div>
            </div>

            <div className="rounded-2xl border border-white/10 bg-black/20 p-4">
              <div className="text-sm font-semibold">Verify</div>
              <div className="mt-3">
                <label className="text-xs text-white/60">6-digit code</label>
                <input
                  value={token}
                  onChange={(e) => setToken(e.target.value)}
                  inputMode="numeric"
                  placeholder="123 456"
                  className="mt-2 w-full rounded-2xl border border-white/10 bg-white/5 px-4 py-3 text-sm outline-none placeholder:text-white/40 focus:border-white/30"
                />
              </div>

              {error ? (
                <div className="mt-3 text-xs text-rose-200">{String(error)}</div>
              ) : null}

              <button
                type="button"
                onClick={onVerify}
                className={classNames(
                  "mt-4 w-full rounded-2xl bg-white px-4 py-3 text-sm font-semibold text-black hover:opacity-90",
                  !token.trim() && "opacity-60",
                )}
              >
                Enable
              </button>

              <button
                type="button"
                onClick={() => router.back()}
                className="mt-3 w-full rounded-2xl border border-white/10 bg-white/5 px-4 py-3 text-sm font-semibold text-white hover:bg-white/10"
              >
                Back
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
