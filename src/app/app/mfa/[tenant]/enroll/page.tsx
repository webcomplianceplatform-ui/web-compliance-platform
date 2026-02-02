"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter, useSearchParams } from "next/navigation";
import QRCode from "qrcode";

type SetupResp = { ok: boolean; secret?: string; otpauth?: string; error?: string };
type VerifyResp = { ok: boolean; error?: string };

export default function MfaEnrollPage() {
  const router = useRouter();
  const search = useSearchParams();
  const params = useParams() as { tenant?: string };
  const tenant = String(params.tenant || "");

  const callbackUrl = search.get("callbackUrl") || `/app/${tenant}`;

  const [loading, setLoading] = useState(true);
  const [setup, setSetup] = useState<SetupResp | null>(null);
  const [qr, setQr] = useState<string | null>(null);
  const [code, setCode] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [verifying, setVerifying] = useState(false);

  useEffect(() => {
    let mounted = true;
    (async () => {
      try {
        setLoading(true);
        const r = await fetch(`/api/app/${tenant}/mfa/setup`, { method: "POST" });
        const data = (await r.json()) as SetupResp;
        if (!mounted) return;
        setSetup(data);
        if (data.ok && data.otpauth) {
          const url = await QRCode.toDataURL(data.otpauth, { margin: 1, scale: 6 });
          if (!mounted) return;
          setQr(url);
        }
      } catch {
        if (mounted) setSetup({ ok: false, error: "setup_failed" });
      } finally {
        if (mounted) setLoading(false);
      }
    })();
    return () => {
      mounted = false;
    };
  }, [tenant]);

  async function onVerify() {
    setError(null);
    setVerifying(true);
    try {
      const r = await fetch(`/api/app/${tenant}/mfa/verify`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ token: code }),
      });
      const data = (await r.json()) as VerifyResp;
      if (!data.ok) {
        setError(data.error || "invalid_code");
        return;
      }
      router.replace(callbackUrl);
    } catch {
      setError("verify_failed");
    } finally {
      setVerifying(false);
    }
  }

  return (
    <main className="mx-auto w-full max-w-xl space-y-5 p-6">
      <div>
        <h1 className="text-2xl font-semibold">Set up MFA</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Your tenant requires multi-factor authentication. Scan the QR code with an authenticator app and enter the 6-digit code.
        </p>
      </div>

      <div className="rounded-2xl border bg-bg2/50 p-5">
        {loading ? (
          <div className="text-sm text-muted-foreground">Preparing enrollment…</div>
        ) : !setup?.ok ? (
          <div className="text-sm text-red-600">Could not start MFA enrollment.</div>
        ) : (
          <div className="grid gap-4 md:grid-cols-2">
            <div className="flex items-center justify-center rounded-xl border bg-white p-3">
              {qr ? (
                <img src={qr} alt="MFA QR" className="h-48 w-48" />
              ) : (
                <div className="text-sm text-muted-foreground">QR not available</div>
              )}
            </div>

            <div className="space-y-3">
              <div>
                <div className="text-xs text-muted-foreground">Manual code</div>
                <div className="mt-1 rounded-xl border bg-bg2/50 px-3 py-2 font-mono text-sm">
                  {setup.secret}
                </div>
              </div>

              <div>
                <label className="text-sm font-medium">6-digit code</label>
                <input
                  value={code}
                  onChange={(e) => setCode(e.target.value)}
                  inputMode="numeric"
                  placeholder="123456"
                  className="mt-1 w-full rounded-xl border bg-transparent px-3 py-2 text-sm"
                />
              </div>

              {error ? (
                <div className="text-sm text-red-600">Invalid code. Try again.</div>
              ) : null}

              <button
                onClick={onVerify}
                disabled={verifying || code.trim().length < 6}
                className="inline-flex w-full items-center justify-center rounded-xl border bg-bg2/70 px-4 py-2 text-sm transition hover:bg-bg2/90 disabled:opacity-50"
              >
                {verifying ? "Verifying…" : "Enable MFA"}
              </button>
            </div>
          </div>
        )}
      </div>

      <div className="text-xs text-muted-foreground">
        Tip: use Google Authenticator, Microsoft Authenticator, Authy, or 1Password.
      </div>
    </main>
  );
}
