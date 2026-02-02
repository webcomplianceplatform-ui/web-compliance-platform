"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { AppButton } from "@/components/app-ui/AppButton";

export function ImpersonateButton({ slug }: { slug: string }) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  async function onClick() {
    try {
      setErr(null);
      setLoading(true);

      const res = await fetch("/api/admin/impersonate", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ tenant: slug }), // (probable mismatch)
      });

      const j = await res.json().catch(() => ({}));

      if (!res.ok) {
        setErr(j?.error ?? `Failed (${res.status})`);
        return;
      }

      router.push(`/app/${slug}`);
      router.refresh();
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="flex flex-col gap-2">
      <AppButton type="button" onClick={onClick} disabled={loading}>
        {loading ? "Opening…" : "Open as superadmin"}
      </AppButton>

      {err ? <div className="text-xs text-red-400">{err}</div> : null}
    </div>
  );
}
