"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

export default function CreateClientForm({ tenant }: { tenant: string }) {
  const router = useRouter();
  const [name, setName] = useState("");
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

  return (
    <form
      className="w-full max-w-xl rounded-2xl border border-border/70 bg-bg1/90 p-4 shadow-sm"
      onSubmit={async (event) => {
        event.preventDefault();
        setSaving(true);
        setMessage(null);

        try {
          const res = await fetch("/api/app/clients", {
            method: "POST",
            headers: { "content-type": "application/json" },
            body: JSON.stringify({ tenant, name }),
          });
          const data = await res.json();

          if (!data.ok) {
            setMessage(
              data.error === "client_exists"
                ? "A client with this name already exists in this workspace."
                : "We could not create the client workspace. Please try again."
            );
            return;
          }

          setName("");
          router.push(`/app/${tenant}/clients/${data.id}`);
          router.refresh();
        } catch {
          setMessage("We could not create the client workspace. Please try again.");
        } finally {
          setSaving(false);
        }
      }}
    >
      <div className="space-y-1">
        <div className="text-xs font-semibold uppercase tracking-[0.18em] text-muted-foreground">
          New client workspace
        </div>
        <div className="text-sm text-muted-foreground">
          Start with a focused checklist across consent and cookies, privacy notice, and form data capture.
        </div>
      </div>

      <div className="mt-4 flex flex-wrap items-start gap-2">
        <input
          className="min-w-[220px] flex-1 rounded-xl border border-border/70 bg-white/70 px-3 py-2.5 text-sm outline-none transition focus:border-foreground/20"
          value={name}
          onChange={(event) => setName(event.target.value)}
          placeholder="Client name"
          disabled={saving}
        />
        <button
          className="inline-flex items-center rounded-xl bg-primary px-4 py-2.5 text-sm font-medium text-primary-foreground transition hover:opacity-90 disabled:opacity-60"
          disabled={saving || !name.trim()}
          type="submit"
        >
          {saving ? "Creating..." : "Add client"}
        </button>
      </div>

      <div className="mt-3 text-xs text-muted-foreground">
        We will create four starter checks so the team can review controls and attach proof immediately.
      </div>

      {message ? <div className="mt-3 text-xs text-muted-foreground">{message}</div> : null}
    </form>
  );
}
