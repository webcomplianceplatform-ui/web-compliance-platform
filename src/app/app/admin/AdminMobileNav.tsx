"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { Menu, X } from "lucide-react";

type NavItem = { href: string; label: string };

export function AdminMobileNav({ email }: { email: string }) {
  const [open, setOpen] = useState(false);

  const items = useMemo<NavItem[]>(
    () => [
      { href: "/app/admin", label: "Tenants" },
      { href: "/app/admin/security", label: "Security" },
      { href: "/app/admin/ops", label: "Ops" },
      { href: "/app/admin/kpis", label: "KPIs" },
      { href: "/app/admin/users", label: "Users" },
      { href: "/app/admin/provision", label: "Provision" },
    ],
    [],
  );

  return (
    <div className="md:hidden">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="inline-flex items-center gap-2 rounded-xl border border-border bg-bg1/60 px-3 py-2 text-sm hover:bg-bg2"
        aria-expanded={open}
        aria-label="Open admin menu"
      >
        {open ? <X className="h-4 w-4" /> : <Menu className="h-4 w-4" />}
        <span>Menu</span>
      </button>

      {open ? (
        <div className="fixed inset-0 z-[60] bg-black/50" onClick={() => setOpen(false)}>
          <div
            className="absolute right-3 top-3 w-[86%] max-w-sm rounded-2xl border border-border bg-background/90 p-3 backdrop-blur"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between">
              <div>
                <div className="text-sm font-semibold">Superadmin</div>
                <div className="text-xs text-muted-foreground">{email}</div>
              </div>
              <button
                type="button"
                onClick={() => setOpen(false)}
                className="rounded-xl border border-border bg-bg1/60 p-2 hover:bg-bg2"
                aria-label="Close"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            <div className="mt-3 grid gap-2">
              {items.map((it) => (
                <Link
                  key={it.href}
                  href={it.href}
                  onClick={() => setOpen(false)}
                  className="rounded-xl border border-border bg-bg1/60 px-3 py-2 text-sm hover:bg-bg2"
                >
                  {it.label}
                </Link>
              ))}
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
}
