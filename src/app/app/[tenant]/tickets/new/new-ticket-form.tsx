"use client";

import { useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";

export default function NewTicketForm({ tenant }: { tenant: string }) {
  const router = useRouter();
  const search = useSearchParams();

  const [title, setTitle] = useState(() => search.get("title") ?? "");
  const [description, setDescription] = useState(() => search.get("description") ?? "");
  const [type, setType] = useState(() => {
    const t = (search.get("type") || "").toUpperCase();
    return t === "LEAD" || t === "INCIDENT" || t === "LEGAL" || t === "SEO" ? t : "CHANGE_REQUEST";
  });
  const [priority, setPriority] = useState("MEDIUM");
  const [err, setErr] = useState<string | null>(null);

  return (
    <main className="max-w-xl">
      <div className="flex items-start justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold">New ticket</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Tell us what you need and we’ll track it here.
          </p>
        </div>
      </div>

      <div className="mt-5 space-y-3">
        <div className="grid gap-3 md:grid-cols-2">
          <div>
            <label className="mb-1 block text-xs font-medium text-muted-foreground">Type</label>
            <select
              className="w-full rounded-2xl border bg-white/60 p-2 text-sm backdrop-blur transition focus:border-[hsl(var(--brand-2))] focus:ring-2 focus:ring-[hsl(var(--brand)/0.35)]"
              value={type}
              onChange={(e) => setType(e.target.value)}
            >
              <option value="LEAD">Lead</option>
              <option value="CHANGE_REQUEST">Change request</option>
              <option value="INCIDENT">Incident</option>
              <option value="LEGAL">Legal</option>
              <option value="SEO">SEO</option>
            </select>
          </div>

          <div>
            <label className="mb-1 block text-xs font-medium text-muted-foreground">Priority</label>
            <select
              className="w-full rounded-2xl border bg-white/60 p-2 text-sm backdrop-blur transition focus:border-[hsl(var(--brand-2))] focus:ring-2 focus:ring-[hsl(var(--brand)/0.35)]"
              value={priority}
              onChange={(e) => setPriority(e.target.value)}
            >
              <option value="LOW">LOW</option>
              <option value="MEDIUM">MEDIUM</option>
              <option value="HIGH">HIGH</option>
              <option value="URGENT">URGENT</option>
            </select>
          </div>
        </div>

        <div>
          <label className="mb-1 block text-xs font-medium text-muted-foreground">Title</label>
        <input
          className="w-full rounded-2xl border bg-white/60 p-2 text-sm backdrop-blur transition focus:border-[hsl(var(--brand-2))] focus:ring-2 focus:ring-[hsl(var(--brand)/0.35)]"
          placeholder="Title"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
        />

        </div>

        <div>
          <label className="mb-1 block text-xs font-medium text-muted-foreground">Description</label>
        <textarea
          className="w-full rounded-2xl border bg-white/60 p-2 text-sm backdrop-blur transition focus:border-[hsl(var(--brand-2))] focus:ring-2 focus:ring-[hsl(var(--brand)/0.35)]"
          rows={6}
          placeholder="Describe the change you want"
          value={description}
          onChange={(e) => setDescription(e.target.value)}
        />

        </div>

        <button
          className="inline-flex items-center justify-center rounded-2xl bg-primary px-4 py-2 text-sm font-medium text-primary-foreground transition hover:-translate-y-0.5 hover:shadow-sm"
          onClick={async () => {
            setErr(null);

            const res = await fetch("/api/app/tickets", {
              method: "POST",
              headers: { "content-type": "application/json" },
              body: JSON.stringify({ tenant, title, description, priority, type }),
            });

            const data = await res.json();
            if (!data.ok) return setErr(data.error ?? "error");

            router.push(`/app/${tenant}/tickets/${data.id}`);
          }}
        >
          Create ticket
        </button>

        {err && <div className="rounded-2xl border bg-white/60 p-3 text-sm backdrop-blur">Error: {err}</div>}
      </div>
    </main>
  );
}
