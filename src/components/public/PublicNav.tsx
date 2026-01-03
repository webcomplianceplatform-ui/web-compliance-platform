"use client";

import Link from "next/link";
import { useState } from "react";

export function PublicNav({ tenant }: { tenant: string }) {
  const [open, setOpen] = useState(false);

  const Item = ({ href, children }: { href: string; children: React.ReactNode }) => (
    <Link
      href={href}
      className="block rounded px-3 py-2 text-sm hover:bg-muted"
      onClick={() => setOpen(false)}
    >
      {children}
    </Link>
  );

  return (
    <div className="md:hidden">
      <button
        className="rounded border px-3 py-2 text-sm"
        onClick={() => setOpen((v) => !v)}
        aria-label="Open menu"
      >
        ☰
      </button>

      {open ? (
        <div className="absolute right-4 top-16 z-50 w-56 rounded-xl border bg-white p-2 shadow">
          <Item href={`/t/${tenant}`}>Inicio</Item>
          <Item href={`/t/${tenant}/servicios`}>Servicios</Item>
          <Item href={`/t/${tenant}/sobre`}>Sobre</Item>
          <Item href={`/t/${tenant}/contacto`}>Contacto</Item>
        </div>
      ) : null}
    </div>
  );
}
