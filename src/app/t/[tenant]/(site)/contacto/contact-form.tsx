"use client";

import { useState } from "react";

export default function ContactForm({ tenant }: { tenant: string }) {
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [msg, setMsg] = useState("");
  const [status, setStatus] = useState<string | null>(null);

  return (
    <form
      className="space-y-3"
      onSubmit={async (e) => {
        e.preventDefault();
        setStatus(null);

        const res = await fetch("/api/public/contact", {
          method: "POST",
          headers: { "content-type": "application/json" },
          body: JSON.stringify({ tenant, name, email, message: msg }),
        });

        const data = await res.json();
        setStatus(data.ok ? "Enviado ✅" : `Error: ${data.error ?? "error"}`);
      }}
    >
      <input className="w-full rounded border p-2" placeholder="Nombre" value={name} onChange={(e) => setName(e.target.value)} />
      <input className="w-full rounded border p-2" placeholder="Email" value={email} onChange={(e) => setEmail(e.target.value)} />
      <textarea className="w-full rounded border p-2" rows={5} placeholder="Mensaje" value={msg} onChange={(e) => setMsg(e.target.value)} />
      <button className="rounded bg-black px-4 py-2 text-white" type="submit">Enviar</button>
      {status && <div className="text-sm text-muted-foreground">{status}</div>}
    </form>
  );
}
