"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

export function ImpersonateButton({ slug }: { slug: string }) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);

  async function onClick() {
    try {
      setLoading(true);
      const res = await fetch("/api/admin/impersonate", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ tenant: slug }),
      });
      if (!res.ok) {
        const j = await res.json().catch(() => ({}));
        throw new Error(j?.error ?? "Failed to impersonate");
      }
      router.push(`/app/${slug}`);
      router.refresh();
    } finally {
      setLoading(false);
    }
  }

  return (
    <button
      type="button"
      onClick={onClick}
      disabled={loading}
      className="rounded border px-3 py-2 text-sm hover:bg-muted disabled:opacity-50"
    >
      {loading ? "Opening…" : "Open as superadmin"}
    </button>
  );
}
