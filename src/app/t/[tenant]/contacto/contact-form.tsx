"use client";

import { useState } from "react";

export default function ContactForm({ tenant }: { tenant: string }) {
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [message, setMessage] = useState("");
  const [website, setWebsite] = useState(""); // honeypot
  const [status, setStatus] = useState<"idle" | "loading" | "ok" | "err">("idle");
  const [err, setErr] = useState<string | null>(null);

  return (
    <form
      className="space-y-3"
      onSubmit={async (e) => {
        e.preventDefault();
        setErr(null);
        setStatus("loading");

        try {
          const res = await fetch("/api/public/contact", {
            method: "POST",
            headers: { "content-type": "application/json" },
            body: JSON.stringify({ tenant, name, email, message, website }),
          });
          const data = await res.json().catch(() => ({}));

          if (!res.ok || !data.ok) {
            setStatus("err");
            setErr(data?.error ?? "error");
            return;
          }

          setStatus("ok");
          setName("");
          setEmail("");
          setMessage("");
        } catch {
          setStatus("err");
          setErr("network_error");
        }
      }}
    >
      {/* Honeypot (oculto) */}
      <input
        value={website}
        onChange={(e) => setWebsite(e.target.value)}
        className="hidden"
        tabIndex={-1}
        autoComplete="off"
        aria-hidden="true"
      />

      <label className="block text-sm">
        Nombre (opcional)
        <input
          className="mt-1 w-full rounded border p-2"
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="Tu nombre"
        />
      </label>

      <label className="block text-sm">
        Email (opcional)
        <input
          className="mt-1 w-full rounded border p-2"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          placeholder="tu@email.com"
          type="email"
        />
      </label>

      <label className="block text-sm">
        Mensaje *
        <textarea
          className="mt-1 w-full rounded border p-2"
          rows={6}
          value={message}
          onChange={(e) => setMessage(e.target.value)}
          placeholder="Cuéntanos qué necesitas…"
          required
        />
      </label>

      <button
        type="submit"
        className="rounded bg-black px-4 py-2 text-sm text-white disabled:opacity-60"
        disabled={status === "loading"}
      >
        {status === "loading" ? "Enviando…" : "Enviar"}
      </button>

      {status === "ok" ? (
        <div className="rounded border p-3 text-sm">¡Enviado! Te contactaremos pronto ✅</div>
      ) : null}

      {status === "err" && err ? (
        <div className="rounded border p-3 text-sm">Error: {err}</div>
      ) : null}

      <p className="text-xs text-muted-foreground">
        Este formulario crea un ticket interno del tenant (MVP).
      </p>
    </form>
  );
}
