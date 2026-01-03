"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { signOut } from "next-auth/react";
import { useState } from "react";

function Item({ href, label }: { href: string; label: string }) {
  const pathname = usePathname();
  const active = pathname === href || pathname?.startsWith(href + "/");

  return (
    <Link
      href={href}
      className={[
        "rounded px-3 py-2 text-sm transition",
        active ? "bg-black text-white" : "text-muted-foreground hover:bg-muted hover:text-foreground",
      ].join(" ")}
    >
      {label}
    </Link>
  );
}

export function AppNav({ tenant, role }: { tenant: string; role: string }) {
  const [open, setOpen] = useState(false);
  const canManageSettings = role === "OWNER" || role === "ADMIN";

const items = [
  { label: "Overview", href: `/app/${tenant}` },
  { label: "Tickets", href: `/app/${tenant}/tickets` },
  { label: "Monitoring", href: `/app/${tenant}/monitor` },
  { label: "Users", href: `/app/${tenant}/users` },
  ...(canManageSettings ? [{ label: "Settings", href: `/app/${tenant}/settings` }] : []),
];

  return (
    <header className="sticky top-0 z-50 border-b bg-white/80 backdrop-blur">
      <div className="mx-auto flex max-w-6xl items-center justify-between px-4 py-3">
        <div className="flex items-center gap-3">
          <button
            className="md:hidden rounded border px-3 py-2 text-sm"
            onClick={() => setOpen((v) => !v)}
            aria-label="Toggle menu"
          >
            ☰
          </button>

          <Link href={`/app/${tenant}`} className="flex items-center gap-2">
            <div className="grid h-9 w-9 place-items-center rounded-lg border bg-white font-semibold">WC</div>
            <div className="leading-tight">
              <div className="text-sm font-semibold">Web Compliance</div>
              <div className="text-xs text-muted-foreground">
                Tenant: <span className="font-mono">{tenant}</span>
              </div>
            </div>
          </Link>

          <nav className="hidden md:flex items-center gap-1">
            {items.map((it) => <Item key={it.href} href={it.href} label={it.label} />)}
          </nav>
        </div>

        <div className="flex items-center gap-2">
          <a
            href={`/t/${tenant}`}
            target="_blank"
            className="hidden md:inline-flex rounded border px-3 py-2 text-sm hover:bg-muted"
          >
            Public site ↗
          </a>

          <span className="rounded-full border px-3 py-1 text-xs font-medium">{role}</span>

          <button
            className="rounded bg-black px-3 py-2 text-sm text-white hover:opacity-90"
            onClick={() => signOut({ callbackUrl: "/login" })}
          >
            Logout
          </button>
        </div>
      </div>

      {open && (
        <div className="mx-auto max-w-6xl px-4 pb-3 md:hidden">
          <div className="flex flex-col gap-1 rounded-xl border bg-white p-2">
            {items.map((it) => (
              <Link
                key={it.href}
                href={it.href}
                onClick={() => setOpen(false)}
                className="rounded px-3 py-2 text-sm hover:bg-muted"
              >
                {it.label}
              </Link>
            ))}
            <a
              href={`/t/${tenant}`}
              target="_blank"
              className="rounded px-3 py-2 text-sm text-muted-foreground hover:bg-muted hover:text-foreground"
            >
              Public site ↗
            </a>
          </div>
        </div>
      )}
    </header>
  );
}
