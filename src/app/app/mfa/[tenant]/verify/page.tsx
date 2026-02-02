"use client";

import { useState } from "react";
import { useParams, useSearchParams } from "next/navigation";

type VerifyResp = { ok: boolean; error?: string };

export default function MfaVerifyPage() {
  const search = useSearchParams();
  const params = useParams() as { tenant?: string };
  const tenant = String(params.tenant || "");
  const callbackUrl = search.get("callbackUrl") || `/app/${tenant}`;

  const [code, setCode] = useState("");
  const [useRecovery, setUseRecovery] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [verifying, setVerifying] = useState(false);

  async function onVerify() {
    setError(null);
    setVerifying(true);
    try {
      const r = await fetch(`/api/app/${tenant}/mfa/verify`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify(useRecovery ? { recoveryCode: code } : { token: code }),
      });
      const data = (await r.json()) as VerifyResp;
      if (!data.ok) {
        setError(data.error || "invalid_code");
        return;
      }
      window.location.assign(callbackUrl);
    } catch {
      setError("verify_failed");
    } finally {
      setVerifying(false);
    }
  }

  return (
    <main className="mx-auto w-full max-w-md space-y-5 p-6">
      <div>
        <h1 className="text-2xl font-semibold">MFA Verification</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Enter the 6-digit code from your authenticator app to continue.
        </p>
      </div>

      <div className="rounded-2xl border bg-bg2/50 p-5 space-y-3">
        <div>
          <label className="text-sm font-medium">{useRecovery ? "Recovery code" : "6-digit code"}</label>
          <input
            value={code}
            onChange={(e) => setCode(e.target.value)}
            inputMode={useRecovery ? "text" : "numeric"}
            placeholder={useRecovery ? "ABCD-EFGH-IJKL" : "123456"}
            className="mt-1 w-full rounded-xl border bg-transparent px-3 py-2 text-sm"
          />
        </div>

        {error ? <div className="text-sm text-red-600">Invalid code. Try again.</div> : null}

        <button
          onClick={onVerify}
          disabled={verifying || (useRecovery ? code.trim().length < 8 : code.trim().length < 6)}
          className="inline-flex w-full items-center justify-center rounded-xl border bg-bg2/70 px-4 py-2 text-sm transition hover:bg-bg2/90 disabled:opacity-50"
        >
          {verifying ? "Verifying…" : "Verify"}
        </button>

        <button
          type="button"
          onClick={() => {
            setUseRecovery((v) => !v);
            setCode("");
            setError(null);
          }}
          className="w-full text-center text-xs text-muted-foreground underline"
        >
          {useRecovery ? "Use authenticator code" : "Use a recovery code"}
        </button>
      </div>

      <div className="text-xs text-muted-foreground">Security note: we only verify what matters. Routine activity is excluded.</div>
    </main>
  );
}
