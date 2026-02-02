"use client";

import { useState } from "react";
import { AppInput } from "@/components/app-ui/AppInput";
import { AppButton } from "@/components/app-ui/AppButton";

export function ChangePasswordForm({
  mustChangePassword,
}: {
  mustChangePassword?: boolean;
}) {
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [loading, setLoading] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);

  const submit = async () => {
    setMsg(null);
    if (!currentPassword || !newPassword) {
      setMsg("Please fill all fields.");
      return;
    }
    if (newPassword.length < 8) {
      setMsg("New password must be at least 8 characters.");
      return;
    }
    if (newPassword !== confirm) {
      setMsg("Passwords do not match.");
      return;
    }

    setLoading(true);
    try {
      const res = await fetch("/api/account/password", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ currentPassword, newPassword }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok || !data?.ok) {
        const e = data?.error ?? "Error changing password";
        if (e === "invalid_current_password") setMsg("Current password is incorrect.");
        else if (e === "password_too_short") setMsg("New password is too short.");
        else if (e === "rate_limited") setMsg("Too many attempts. Try again in a minute.");
        else setMsg("Could not change password.");
        return;
      }
      setMsg("Saved ✅");
      setCurrentPassword("");
      setNewPassword("");
      setConfirm("");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-4">
      {msg ? <div className="rounded-xl border bg-bg2/40 px-3 py-2 text-sm">{msg}</div> : null}

      <div className="grid gap-3">
        <label className="text-xs">
          Current password
          <AppInput
            className="mt-1"
            type="password"
            value={currentPassword}
            onChange={(e) => setCurrentPassword(e.target.value)}
            autoComplete="current-password"
          />
        </label>

        <label className="text-xs">
          New password
          <AppInput
            className="mt-1"
            type="password"
            value={newPassword}
            onChange={(e) => setNewPassword(e.target.value)}
            autoComplete="new-password"
          />
        </label>

        <label className="text-xs">
          Confirm new password
          <AppInput
            className="mt-1"
            type="password"
            value={confirm}
            onChange={(e) => setConfirm(e.target.value)}
            autoComplete="new-password"
          />
        </label>
      </div>

      <div className="flex items-center gap-2">
        <AppButton onClick={submit} disabled={loading}>
          {loading ? "Saving…" : "Change password"}
        </AppButton>
        <div className="text-xs text-muted-foreground">
          Tip: use a unique password. Minimum 8 characters.
        </div>
      </div>
    </div>
  );
}
