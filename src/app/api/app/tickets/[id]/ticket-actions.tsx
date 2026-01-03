"use client";

import { useState } from "react";

export default function TicketActions({
  tenant,
  ticketId,
  canManage,
  currentStatus,
  currentPriority,
}: {
  tenant: string;
  ticketId: string;
  canManage: boolean;
  currentStatus: string;
  currentPriority: string;
}) {
  const [comment, setComment] = useState("");
  const [status, setStatus] = useState(currentStatus);
  const [priority, setPriority] = useState(currentPriority);
  const [msg, setMsg] = useState<string | null>(null);

  return (
    <section className="space-y-3 rounded border p-4">
      <div className="text-sm font-medium">Actions</div>

      {canManage && (
        <div className="flex flex-wrap gap-2">
          <select className="rounded border p-2 text-sm" value={status} onChange={(e) => setStatus(e.target.value)}>
            <option value="OPEN">OPEN</option>
            <option value="IN_PROGRESS">IN_PROGRESS</option>
            <option value="WAITING_CLIENT">WAITING_CLIENT</option>
            <option value="RESOLVED">RESOLVED</option>
            <option value="CLOSED">CLOSED</option>
          </select>

          <select className="rounded border p-2 text-sm" value={priority} onChange={(e) => setPriority(e.target.value)}>
            <option value="LOW">LOW</option>
            <option value="MEDIUM">MEDIUM</option>
            <option value="HIGH">HIGH</option>
            <option value="URGENT">URGENT</option>
          </select>

          <button
            className="rounded bg-black px-3 py-2 text-sm text-white"
            onClick={async () => {
              setMsg(null);
              const res = await fetch(`/api/app/tickets/${ticketId}`, {
                method: "PATCH",
                headers: { "content-type": "application/json" },
                body: JSON.stringify({ tenant, status, priority }),
              });
              const data = await res.json();
              setMsg(data.ok ? "Updated ✅ (refresh page if needed)" : `Error: ${data.error ?? "error"}`);
            }}
          >
            Update
          </button>
        </div>
      )}

      <div className="space-y-2">
        <textarea
          className="w-full rounded border p-2 text-sm"
          rows={4}
          placeholder="Write a comment…"
          value={comment}
          onChange={(e) => setComment(e.target.value)}
        />
        <button
          className="rounded border px-3 py-2 text-sm"
          onClick={async () => {
            setMsg(null);
            const res = await fetch(`/api/app/tickets/${ticketId}/comment`, {
              method: "POST",
              headers: { "content-type": "application/json" },
              body: JSON.stringify({ tenant, body: comment }),
            });
            const data = await res.json();
            if (data.ok) {
              setComment("");
              setMsg("Comment added ✅ (refresh page to see it)");
            } else {
              setMsg(`Error: ${data.error ?? "error"}`);
            }
          }}
        >
          Add comment
        </button>

        {msg && <div className="text-xs text-muted-foreground">{msg}</div>}
      </div>
    </section>
  );
}
