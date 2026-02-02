"use client";

import { useMemo, useState } from "react";
import { AppButton } from "@/components/app-ui/AppButton";

function genTempPassword(len = 14) {
  // URL-safe-ish random password (no spaces). Example: wc_Ab3k... 
  const bytes = new Uint8Array(len);
  crypto.getRandomValues(bytes);
  const alphabet = "ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz23456789";
  let out = "wc_";
  for (let i = 0; i < bytes.length; i++) out += alphabet[bytes[i] % alphabet.length];
  return out;
}

export function ResetPasswordButton({ email }: { email: string }) {
  const [loading, setLoading] = useState(false);
  const [done, setDone] = useState(false);
  const [temp, setTemp] = useState<string | null>(null);
  const [err, setErr] = useState<string | null>(null);

  const generated = useMemo(() => genTempPassword(), [email]);

  async function copy(text: string) {
    try {
      await navigator.clipboard.writeText(text);
    } catch {
      // ignore
    }
  }

  async function onReset() {
    setLoading(true);
    setErr(null);
    setDone(false);
    try {
      const newPassword = generated;
      const res = await fetch("/api/admin/reset-password", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ email, newPassword }),
      });
      const j = await res.json().catch(() => ({}));
      if (!res.ok || !j?.ok) {
        setErr(j?.error ?? "Failed to reset password");
        return;
      }
      setTemp(newPassword);
      setDone(true);
      await copy(newPassword);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="flex flex-wrap items-center gap-2">
      <AppButton type="button" size="sm" variant="secondary" onClick={onReset} disabled={loading}>
        {loading ? "Resetting…" : "Reset password"}
      </AppButton>

      {done && temp ? (
        <div className="flex items-center gap-2">
          <span className="rounded-xl border bg-bg2/40 px-2 py-1 font-mono text-xs">{temp}</span>
          <button
            type="button"
            className="rounded-xl border px-2 py-1 text-xs transition hover:bg-muted/40"
            onClick={() => copy(temp)}
          >
            Copy
          </button>
          <span className="text-xs text-muted-foreground">(copied)</span>
        </div>
      ) : null}

      {err ? <span className="text-xs text-red-400">{err}</span> : null}
    </div>
  );
}
