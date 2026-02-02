"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { AppButton } from "@/components/app-ui/AppButton";

export function StopImpersonateButton() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);

  async function onClick() {
    try {
      setLoading(true);
      const res = await fetch("/api/admin/impersonate/stop", {
        method: "POST",
      });

      if (!res.ok) {
        throw new Error("Failed to stop impersonation");
      }

      // back to admin root
      router.push("/app/admin");
      router.refresh();
    } finally {
      setLoading(false);
    }
  }

  return (
    <AppButton
      type="button"
      variant="danger"
      onClick={onClick}
      disabled={loading}
    >
      {loading ? "Exiting…" : "Exit impersonation"}
    </AppButton>
  );
}
