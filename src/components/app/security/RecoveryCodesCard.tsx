"use client";

import { useState } from "react";
import { AppButton } from "@/components/app-ui/AppButton";
import { useToast } from "@/components/ui/toast";

type Props = {
  tenant: string;
  enabled: boolean;
};

export function RecoveryCodesCard({ tenant, enabled }: Props) {
  const toast = useToast();
  const [loading, setLoading] = useState(false);

  async function generate() {
    if (!enabled) {
      toast.push({ variant: "error", message: "Enroll MFA first" });
      return;
    }
    if (!confirm("Generate new recovery codes? This will replace any existing unused codes.")) return;

    setLoading(true);
    try {
      const res = await fetch(`/api/app/${tenant}/mfa/recovery/generate`, { method: "POST" });
      const data = await res.json().catch(() => ({}));
      if (!res.ok || !data.ok) {
        if (data?.error === "reauth_required" && data?.reauthUrl) {
          window.location.href = `${data.reauthUrl}?callbackUrl=${encodeURIComponent(window.location.pathname)}`;
          return;
        }
        throw data;
      }

      const codes: string[] = Array.isArray(data.codes) ? data.codes : [];
      const text = codes.join("\n");

      try {
        await navigator.clipboard.writeText(text);
        toast.push({ variant: "success", message: "Recovery codes copied to clipboard" });
      } catch {
        toast.push({ variant: "success", message: "Recovery codes generated" });
      }

      alert(
        `Recovery codes (save them now)\n\n${text}\n\nThese codes will not be shown again.`
      );
    } catch (e: any) {
      toast.push({ variant: "error", message: e?.error || e?.message || "Unexpected error" });
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="flex items-center justify-between gap-3">
      <div>
        <div className="text-sm font-medium">Recovery codes</div>
        <div className="mt-1 text-xs text-muted-foreground">
          One-time backup codes you can use if you lose access to your authenticator app.
        </div>
      </div>
      <AppButton variant="secondary" size="sm" disabled={loading} onClick={generate}>
        {loading ? "Generating..." : "Generate"}
      </AppButton>
    </div>
  );
}
