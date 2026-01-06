"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

export function ImpersonationBanner({ tenant }: { tenant: string }) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function exit() {
    try {
      setLoading(true);
      setError(null);
      const res = await fetch("/api/admin/impersonate/clear", { method: "POST" });
      if (!res.ok) throw new Error("Failed to clear impersonation");
      router.push("/app/admin");
      router.refresh();
    } catch (e: any) {
      setError(e?.message ?? "Unexpected error");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="border-b bg-amber-50">
      <div className="mx-auto flex max-w-6xl items-center justify-between gap-3 px-4 py-2 text-sm md:px-6">
        <div className="flex flex-wrap items-center gap-2">
          <span className="font-semibold">Impersonation mode</span>
          <span className="text-muted-foreground">·</span>
          <span className="font-mono">{tenant}</span>
          <span className="text-muted-foreground">(superadmin)</span>
          {error ? <span className="text-red-600">{error}</span> : null}
        </div>
        <button
          onClick={exit}
          disabled={loading}
          className="rounded border bg-white px-3 py-1.5 text-sm hover:bg-muted disabled:opacity-50"
        >
          {loading ? "Exiting…" : "Exit"}
        </button>
      </div>
    </div>
  );
}
