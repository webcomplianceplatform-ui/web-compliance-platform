"use client";

import Link from "next/link";
import { useState } from "react";

export function PublicNav({ tenant }: { tenant: string }) {
  const [open, setOpen] = useState(false);

  return (
    <div className="md:hidden">
      <button
        type="button"
        className="rounded border px-3 py-2 text-sm"
        onClick={() => setOpen((v) => !v)}
        aria-expanded={open}
        aria-label="Open menu"
      >
        ☰
      </button>

      {open ? (
        <div className="absolute right-4 top-16 z-50 w-52 rounded-xl border bg-white p-2 shadow">
          <Link
            className="block rounded px-3 py-2 text-sm hover:bg-black/5"
            href={`/t/${tenant}/servicios`}
            onClick={() => setOpen(false)}
          >
            Servicios
          </Link>
          <Link
            className="block rounded px-3 py-2 text-sm hover:bg-black/5"
            href={`/t/${tenant}/sobre`}
            onClick={() => setOpen(false)}
          >
            Sobre
          </Link>
          <Link
            className="block rounded px-3 py-2 text-sm hover:bg-black/5"
            href={`/t/${tenant}/contacto`}
            onClick={() => setOpen(false)}
          >
            Contacto
          </Link>
        </div>
      ) : null}
    </div>
  );
}
