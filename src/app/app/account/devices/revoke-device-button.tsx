"use client";

import { useState } from "react";

export default function RevokeDeviceButton({ deviceId, disabled }: { deviceId: string; disabled?: boolean }) {
  const [loading, setLoading] = useState(false);
  const onClick = async () => {
    if (disabled) return;
    if (!confirm("Revoke this device approval? It will require step-up MFA next time.")) return;
    setLoading(true);
    try {
      const res = await fetch("/api/account/devices/revoke", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ deviceId }),
      });
      if (!res.ok) {
        const j = await res.json().catch(() => null);
        alert(j?.error ?? "Failed to revoke device");
        return;
      }
      window.location.reload();
    } finally {
      setLoading(false);
    }
  };

  return (
    <button
      onClick={onClick}
      disabled={disabled || loading}
      className="text-xs rounded-md border px-3 py-2 hover:bg-muted disabled:opacity-50"
    >
      {loading ? "Revoking..." : disabled ? "Revoked" : "Revoke"}
    </button>
  );
}
