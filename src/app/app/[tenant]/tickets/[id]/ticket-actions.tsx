"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

export default function TicketActions({
  tenant,
  ticketId,
  canManage,
  currentType,
  currentStatus,
  currentPriority,
}: {
  tenant: string;
  ticketId: string;
  canManage: boolean;
  currentType: string;
  currentStatus: string;
  currentPriority: string;
}) {
  const router = useRouter();
  const [comment, setComment] = useState("");
  const [type, setType] = useState(currentType);
  const [status, setStatus] = useState(currentStatus);
  const [priority, setPriority] = useState(currentPriority);
  const [msg, setMsg] = useState<string | null>(null);

  return (
    <section className="glass space-y-3 rounded-2xl p-4">
      <div className="text-sm font-medium">Actions</div>

      {canManage && (
        <div className="flex flex-wrap gap-2">
          <select className="rounded-2xl border bg-white/60 p-2 text-sm backdrop-blur transition focus:border-[hsl(var(--brand-2))] focus:ring-2 focus:ring-[hsl(var(--brand)/0.35)]" value={type} onChange={(e) => setType(e.target.value)}>
            <option value="LEAD">LEAD</option>
            <option value="CHANGE_REQUEST">CHANGE_REQUEST</option>
            <option value="INCIDENT">INCIDENT</option>
            <option value="LEGAL">LEGAL</option>
            <option value="SEO">SEO</option>
          </select>

          <select className="rounded-2xl border bg-white/60 p-2 text-sm backdrop-blur transition focus:border-[hsl(var(--brand-2))] focus:ring-2 focus:ring-[hsl(var(--brand)/0.35)]" value={status} onChange={(e) => setStatus(e.target.value)}>
            <option value="OPEN">OPEN</option>
            <option value="IN_PROGRESS">IN_PROGRESS</option>
            <option value="WAITING_CLIENT">WAITING_CLIENT</option>
            <option value="RESOLVED">RESOLVED</option>
            <option value="CLOSED">CLOSED</option>
          </select>

          <select className="rounded-2xl border bg-white/60 p-2 text-sm backdrop-blur transition focus:border-[hsl(var(--brand-2))] focus:ring-2 focus:ring-[hsl(var(--brand)/0.35)]" value={priority} onChange={(e) => setPriority(e.target.value)}>
            <option value="LOW">LOW</option>
            <option value="MEDIUM">MEDIUM</option>
            <option value="HIGH">HIGH</option>
            <option value="URGENT">URGENT</option>
          </select>

          <button
            className="rounded-2xl bg-primary px-4 py-2 text-sm font-medium text-primary-foreground transition hover:-translate-y-0.5 hover:shadow-sm"
            onClick={async () => {
              setMsg(null);
              const res = await fetch(`/api/app/tickets/${ticketId}`, {
                method: "PATCH",
                headers: { "content-type": "application/json" },
                body: JSON.stringify({ tenant, type, status, priority }),
              });
              const data = await res.json();
              setMsg(data.ok ? "Updated ✅" : `Error: ${data.error ?? "error"}`);
              router.refresh();
            }}
          >
            Update
          </button>
        </div>
      )}

      <div className="space-y-2">
        <textarea
          className="w-full rounded-2xl border bg-white/60 p-2 text-sm backdrop-blur transition focus:border-[hsl(var(--brand-2))] focus:ring-2 focus:ring-[hsl(var(--brand)/0.35)]"
          rows={4}
          placeholder="Write a comment…"
          value={comment}
          onChange={(e) => setComment(e.target.value)}
        />

        <button
          className="rounded-2xl border bg-white/40 px-4 py-2 text-sm transition hover:bg-muted/40"
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
              setMsg("Comment added ✅");
              router.refresh();
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
