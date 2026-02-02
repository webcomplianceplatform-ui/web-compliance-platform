"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { signOut } from "next-auth/react";
import { useMemo, useState } from "react";

function cn(...classes: Array<string | false | null | undefined>) {
  return classes.filter(Boolean).join(" ");
}

function Item({
  href,
  label,
  onClick,
  match,
}: {
  href: string;
  label: string;
  onClick?: () => void;
  match?: "exact" | "prefix";
}) {
  const pathname = usePathname();
  const mode = match ?? "prefix";
  const active =
    mode === "exact" ? pathname === href : pathname === href || pathname?.startsWith(href + "/");

  return (
    <Link
      href={href}
      onClick={onClick}
      className={cn(
        "w-full rounded-xl border px-3 py-2 text-left transition",
        "hover:bg-[#dbf676] hover:text-white hover:border-[#dbf676]",
        active
          ? "bg-[#dbf676] text-white border-[#dbf676]"
          : "bg-transparent text-muted-foreground border-border"
      )}
    >
      <div className="text-sm font-medium">{label}</div>
    </Link>
  );
}

export function TenantSidebar({ tenant, role }: { tenant: string; role: string }) {
  const [open, setOpen] = useState(false);
  const canManageSettings = role === "OWNER" || role === "ADMIN";

  const items = useMemo(
    () => [
      { label: "Overview", href: `/app/${tenant}` },
      { label: "Tickets", href: `/app/${tenant}/tickets` },
      { label: "Monitoring", href: `/app/${tenant}/monitor` },
      { label: "Users", href: `/app/${tenant}/users` },
      ...(canManageSettings
        ? [
            { label: "Settings", href: `/app/${tenant}/settings` },
            { label: "Site", href: `/app/${tenant}/site` },
          ]
        : []),
    ],
    [tenant, canManageSettings]
  );

  const SidebarContent = ({ onNavigate }: { onNavigate?: () => void }) => (
    <div className="flex h-full flex-col gap-4">
      <Link href={`/app/${tenant}`} onClick={onNavigate} className="flex items-center gap-3">
        <div className="grid h-10 w-10 place-items-center rounded-xl border bg-bg2 font-semibold text-foreground">
          WC
        </div>
        <div className="min-w-0">
          <div className="truncate text-sm font-semibold">WebCompliance</div>
          <div className="truncate text-xs text-muted-foreground">
            Tenant: <span className="font-mono">{tenant}</span>
          </div>
        </div>
      </Link>

      <div className="space-y-2">
        {items.map((it) => (
          <Item
            key={it.href}
            href={it.href}
            label={it.label}
            onClick={onNavigate}
            match={it.label === "Overview" ? "exact" : "prefix"}
          />
        ))}
      </div>

      <div className="mt-auto space-y-2">
        <a
          href={`/t/${tenant}`}
          target="_blank"
          rel="noreferrer"
          className="inline-flex w-full items-center justify-between rounded-xl border bg-bg1 px-3 py-2 text-sm text-foreground transition hover:bg-bg2"
        >
          <span>Public site</span>
          <span aria-hidden>↗</span>
        </a>

        <div className="flex items-center justify-between rounded-xl border bg-bg1 px-3 py-2 text-xs">
          <span className="text-muted-foreground">Role</span>
          <span className="rounded-full border px-2 py-0.5 text-[11px] font-medium">{role}</span>
        </div>

        <button
          type="button"
          className="inline-flex w-full items-center justify-center rounded-xl bg-primary px-3 py-2 text-sm font-medium text-primary-foreground shadow-sm transition hover:opacity-90"
          onClick={() => signOut({ callbackUrl: "/login" })}
        >
          Logout
        </button>
      </div>
    </div>
  );

  return (
    <>
      {/* Mobile top bar */}
      <div className="sticky top-0 z-50 flex items-center justify-between border-b bg-bg0 px-4 py-3 md:hidden">
        <button
          type="button"
          className="rounded-lg border bg-bg1 px-3 py-2 text-sm text-foreground hover:bg-bg2"
          onClick={() => setOpen(true)}
          aria-label="Open menu"
        >
          ☰
        </button>
        <div className="text-sm font-semibold text-foreground">{tenant}</div>
        <a className="rounded-lg border bg-bg1 px-3 py-2 text-sm text-foreground hover:bg-bg2" href={`/t/${tenant}`} target="_blank" rel="noreferrer">
          ↗
        </a>
      </div>

      {/* Desktop sidebar */}
      <aside className="hidden h-screen w-64 flex-shrink-0 border-r bg-bg1 p-4 md:block">
        <SidebarContent />
      </aside>

      {/* Mobile drawer */}
      {open ? (
        <div className="fixed inset-0 z-50 md:hidden">
          <div className="absolute inset-0 bg-black/40" onClick={() => setOpen(false)} />
          <div className="absolute left-0 top-0 h-full w-80 max-w-[85%] border-r bg-bg1 p-4">
            <SidebarContent onNavigate={() => setOpen(false)} />
          </div>
        </div>
      ) : null}
    </>
  );
}
