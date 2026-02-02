"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { AppButton } from "@/components/app-ui/AppButton";

export function ImpersonationBanner({ tenant }: { tenant: string }) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  async function stop() {
    setErr(null);
    try {
      setLoading(true);
      const res = await fetch("/api/admin/impersonate/stop", { method: "POST" });
      if (!res.ok) {
        const j = await res.json().catch(() => ({}));
        throw new Error(j?.error ?? "Failed to exit impersonation");
      }
      // Back to admin panel
      router.push("/app/admin");
      router.refresh();
    } catch (e: any) {
      setErr(e?.message ?? "Failed to exit impersonation");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="mb-4 flex flex-wrap items-center justify-between gap-2 rounded-2xl border border-red-500/30 bg-red-500/10 px-4 py-3">
      <div className="min-w-0">
        <div className="text-sm font-semibold text-red-200">
          Impersonation active
        </div>
        <div className="text-xs text-red-200/80">
          You are acting as tenant: <span className="font-mono">{tenant}</span>
        </div>
        {err ? <div className="mt-1 text-xs text-red-200">{err}</div> : null}
      </div>

      <AppButton variant="danger" size="sm" onClick={stop} disabled={loading}>
        {loading ? "Exiting…" : "Exit impersonation"}
      </AppButton>
    </div>
  );
}
