"use client";

import { useState } from "react";

export function MfaPolicyCard(props: {
  tenant: string;
  canEdit: boolean;
  required: boolean;
  planSupportsMfa: boolean;
}) {
  const { tenant, canEdit, required, planSupportsMfa } = props;
  const [value, setValue] = useState<boolean>(required);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function toggle(next: boolean) {
    setError(null);
    setSaving(true);
    try {
      const r = await fetch(`/api/app/${tenant}/security/mfa-policy`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ required: next }),
      });
      const data = (await r.json()) as any;
      if (!data?.ok) {
        setError(data?.error || "failed");
        return;
      }
      setValue(!!data.required);
    } catch {
      setError("failed");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="p-4">
      <div className="text-xs text-muted-foreground">MFA policy</div>
      <div className="mt-1 flex items-center justify-between gap-3">
        <div>
          <div className="text-lg font-semibold">
            {planSupportsMfa ? (value ? "Enforced" : "Optional") : "Not available"}
          </div>
          <div className="mt-1 text-sm text-muted-foreground">
            {planSupportsMfa
              ? value
                ? "This tenant requires multi-factor authentication for panel access."
                : "Users may enable MFA, but it is not enforced at tenant level."
              : "Your current plan does not include MFA enforcement."}
          </div>
        </div>

        {planSupportsMfa && canEdit ? (
          <button
            onClick={() => toggle(!value)}
            disabled={saving}
            className="inline-flex items-center rounded-xl border bg-bg2/70 px-4 py-2 text-sm transition hover:bg-bg2/90 disabled:opacity-50"
          >
            {saving ? "Saving…" : value ? "Disable" : "Enforce"}
          </button>
        ) : null}
      </div>

      {error ? <div className="mt-2 text-sm text-red-600">Could not update policy.</div> : null}
    </div>
  );
}
