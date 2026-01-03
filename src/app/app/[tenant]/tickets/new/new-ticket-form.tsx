"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

export default function NewTicketForm({ tenant }: { tenant: string }) {
  const router = useRouter();

  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [priority, setPriority] = useState("MEDIUM");
  const [err, setErr] = useState<string | null>(null);

  return (
    <main className="max-w-xl">
      <h1 className="text-2xl font-semibold">New ticket</h1>

      <div className="mt-4 space-y-3">
        <input
          className="w-full rounded border p-2"
          placeholder="Title"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
        />

        <textarea
          className="w-full rounded border p-2"
          rows={6}
          placeholder="Describe the change you want"
          value={description}
          onChange={(e) => setDescription(e.target.value)}
        />

        <select
          className="w-full rounded border p-2"
          value={priority}
          onChange={(e) => setPriority(e.target.value)}
        >
          <option value="LOW">LOW</option>
          <option value="MEDIUM">MEDIUM</option>
          <option value="HIGH">HIGH</option>
          <option value="URGENT">URGENT</option>
        </select>

        <button
          className="rounded bg-black px-3 py-2 text-white"
          onClick={async () => {
            setErr(null);

            const res = await fetch("/api/app/tickets", {
              method: "POST",
              headers: { "content-type": "application/json" },
              body: JSON.stringify({ tenant, title, description, priority }),
            });

            const data = await res.json();
            if (!data.ok) return setErr(data.error ?? "error");

            router.push(`/app/${tenant}/tickets/${data.id}`);
          }}
        >
          Create ticket
        </button>

        {err && <div className="rounded border p-3 text-sm">Error: {err}</div>}
      </div>
    </main>
  );
}
