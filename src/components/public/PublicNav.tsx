"use client";

import Link from "next/link";
import { useState } from "react";

export type PublicNavItem = { href: string; label: string };

export function PublicNav({ items }: { items: PublicNavItem[] }) {
  const [open, setOpen] = useState(false);

  return (
    <div className="md:hidden">
      <button
        type="button"
        className="rounded border px-3 py-2 text-sm"
        onClick={() => setOpen((v) => !v)}
        aria-expanded={open}
        aria-label="Abrir menú"
      >
        ☰
      </button>

      {open ? (
        <div className="absolute right-4 top-14 z-50 w-56 rounded-xl border bg-white p-2 shadow">
          {items.map((it) => (
            <Link
              key={it.href}
              href={it.href}
              className="block rounded px-3 py-2 text-sm hover:bg-black/5"
              onClick={() => setOpen(false)}
            >
              {it.label}
            </Link>
          ))}
        </div>
      ) : null}
    </div>
  );
}
