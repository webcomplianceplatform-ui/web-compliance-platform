"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { signOut } from "next-auth/react";
import { useEffect, useMemo, useState } from "react";

function cn(...classes: Array<string | false | null | undefined>) {
  return classes.filter(Boolean).join(" ");
}

function initialsFromUser(name: string | null, email: string) {
  const src = (name && name.trim().length > 0 ? name : email).trim();
  const parts = src.split(/\s+/).filter(Boolean);
  if (parts.length >= 2) return (parts[0][0] + parts[1][0]).toUpperCase();
  return src.slice(0, 2).toUpperCase();
}

function NavItem({
  href,
  label,
  exact = false,
}: {
  href: string;
  label: string;
  exact?: boolean;
}) {
  const pathname = usePathname();

  const active = exact
    ? pathname === href
    : pathname === href || (pathname ? pathname.startsWith(href + "/") : false);

  return (
    <Link
      href={href}
      className={cn(
        "w-full rounded-xl border px-3 py-2 text-left transition",
        "hover:-translate-y-[1px] hover:shadow-sm",
        active
          ? "border-transparent bg-sidebar-accent text-sidebar-accent-foreground"
          : "bg-transparent hover:bg-sidebar-accent/70 hover:text-sidebar-accent-foreground"
      )}
    >
      <div className="text-sm font-medium">{label}</div>
    </Link>
  );
}

function NavSection({ label }: { label: string }) {
  return (
    <div className="mt-3 px-1 text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
      {label}
    </div>
  );
}

export function AppNav({
  tenant,
  role,
  user,
  features,
}: {
  tenant: string;
  role: string;
  user: { name: string | null; email: string };
  features: {
    tickets: boolean;
    intake: boolean;
    legal: boolean;
    monitoring: boolean;
    security: boolean;
    web: boolean;
    plan?: string;
  };
}) {
  const canManageSettings = role === "OWNER" || role === "ADMIN";
  const isAgency = String((features as any).plan ?? "").toUpperCase() === "ASSURED";

  type Item =
    | { type: "section"; label: string; show: boolean }
    | { type: "item"; label: string; href: string; exact?: boolean; show: boolean };

  const items = useMemo<Item[]>(
    () =>
      [
        { type: "item", label: "Overview", href: `/app/${tenant}`, exact: true, show: true },

        // Evidence-first navigation
        { type: "section", label: "Evidence", show: true },
        { type: "item", label: "Legal", href: `/app/${tenant}/evidence/legal`, show: features.legal },
        { type: "item", label: "Security", href: `/app/${tenant}/evidence/security`, show: features.security },
        {
          type: "item",
          label: "Operations",
          href: `/app/${tenant}/evidence/operations`,
          show: features.monitoring || features.tickets || features.intake,
        },
        { type: "item", label: "Evidence Bundles", href: `/app/${tenant}/evidence/bundles`, show: true },

        { type: "section", label: "Manage", show: true },
        { type: "item", label: "Domains", href: `/app/${tenant}/domains`, show: true },
        { type: "item", label: "Clients", href: `/app/${tenant}/clients`, show: isAgency },
        { type: "item", label: "Alerts", href: `/app/${tenant}/alerts`, show: features.security },
        { type: "item", label: "Incidents", href: `/app/${tenant}/incidents`, show: features.tickets || features.intake },

        ...(canManageSettings && features.web
          ? ([{ type: "item", label: "Web", href: `/app/${tenant}/site`, show: true }] as Item[])
          : []),
        ...(canManageSettings
          ? ([{ type: "item", label: "Settings", href: `/app/${tenant}/settings`, show: true }] as Item[])
          : []),
      ]
        .filter((x) => x.show)
        // Hard guard: avoid duplicate href keys (prevents React key warnings)
        .filter((it, idx, arr) => {
          if (it.type !== "item") return true;
          return arr.findIndex((x) => x.type === "item" && x.href === it.href) === idx;
        }),
    [tenant, canManageSettings, features, isAgency]
  );

  const pathname = usePathname();
  const [open, setOpen] = useState(false);

  // Close drawer on route change
  useEffect(() => {
    setOpen(false);
  }, [pathname]);

  const [menuOpen, setMenuOpen] = useState(false);

  useEffect(() => {
    function onDocClick(e: MouseEvent) {
      const t = e.target as HTMLElement | null;
      if (!t) return;
      // Close if clicking outside the menu container
      if (!t.closest?.("[data-user-menu]")) setMenuOpen(false);
    }
    document.addEventListener("click", onDocClick);
    return () => document.removeEventListener("click", onDocClick);
  }, []);

  const NavContent = (
    <div className="glass flex h-full flex-col rounded-2xl p-4">
      <Link href={`/app/${tenant}`} className="flex items-center gap-3">
        <div className="grid h-10 w-10 place-items-center rounded-xl bg-[#dbf676] text-black font-semibold">WC</div>

        <div className="min-w-0">
          <div className="truncate text-sm font-semibold">WebCompliance</div>
          <div className="truncate text-xs text-muted-foreground">
            Tenant: <span className="font-mono">{tenant}</span>
          </div>
        </div>
      </Link>

      <nav className="mt-4 flex flex-col gap-2">
        {items.map((it, idx) => {
          if (it.type === "section") {
            return <NavSection key={`sec-${idx}-${it.label}`} label={it.label} />;
          }
          return <NavItem key={it.href} href={it.href} label={it.label} exact={!!it.exact} />;
        })}
      </nav>

      <div className="mt-auto space-y-2 pt-4">
        <a
          href={`/t/${tenant}`}
          target="_blank"
          className="inline-flex w-full items-center justify-between rounded-xl border px-3 py-2 text-sm transition hover:bg-muted"
          rel="noreferrer"
        >
          <span>Public site</span>
          <span aria-hidden>↗</span>
        </a>

        <div className="relative flex items-center justify-between gap-2" data-user-menu>
          <button
            type="button"
            className="flex items-center gap-2 rounded-xl border bg-bg2 px-2 py-1.5 text-left text-sm transition hover:bg-bg1"
            onClick={() => setMenuOpen((v) => !v)}
            aria-haspopup="menu"
            aria-expanded={menuOpen}
          >
            <span
              className="grid h-9 w-9 place-items-center rounded-lg text-xs font-semibold text-white"
              style={{ background: "hsl(var(--brand-2))" }}
              aria-hidden
            >
              {initialsFromUser(user.name, user.email)}
            </span>
            <span className="hidden sm:inline-flex rounded-full border px-2 py-0.5 text-xs font-medium">{role}</span>
            <span className="text-muted-foreground" aria-hidden>
              ▾
            </span>
          </button>

          {menuOpen ? (
            <div
              className="absolute bottom-12 left-0 z-50 w-[min(300px,92vw)] rounded-2xl border bg-bg1 p-2 text-sm shadow-lg"
              role="menu"
            >
              <div className="px-2 pb-2">
                <div className="truncate text-xs font-medium">{user.name ?? user.email}</div>
                <div className="truncate text-[11px] text-muted-foreground">{user.email}</div>
              </div>

              <a
                href={`/app/account/password?return=${encodeURIComponent(`/app/${tenant}`)}`}
                className="block rounded-xl px-3 py-2 transition hover:bg-muted/40"
                role="menuitem"
              >
                Account → Change password
              </a>

              <a
                href={`/app/${tenant}/tickets/new?type=INCIDENT&title=${encodeURIComponent(
                  "Necesito ayuda"
                )}&description=${encodeURIComponent(
                  "Hola! Necesito ayuda con...\n\n- Qué pasa:\n- Qué esperaba:\n- URL/pantalla afectada:\n- Pasos para reproducir:\n- (Opcional) Capturas / logs:"
                )}`}
                className="block rounded-xl px-3 py-2 transition hover:bg-muted/40"
                role="menuitem"
              >
                Help → Create ticket
              </a>
              <button
                className={cn(
                  "mt-1 w-full rounded-xl px-3 py-2 text-left transition",
                  "text-red-600 hover:bg-red-500/10"
                )}
                role="menuitem"
                onClick={async () => {
                  try {
                    // next-auth client helper
                    await signOut({ callbackUrl: "/login", redirect: true });
                  } catch {
                    // fallback (robust)
                    window.location.href = "/api/auth/signout?callbackUrl=/login";
                  }
                }}
              >
                Logout
              </button>
            </div>
          ) : null}
        </div>
      </div>
    </div>
  );

  return (
    <>
      {/* Mobile top bar */}
      <div className="glass sticky top-0 z-40 flex items-center justify-between gap-3 rounded-2xl p-3 md:hidden">
        <button
          type="button"
          className="inline-flex h-10 items-center justify-center rounded-xl border px-3 text-sm transition hover:bg-muted/40"
          onClick={() => setOpen(true)}
          aria-label="Open navigation"
        >
          ☰
        </button>
        <div className="min-w-0">
          <div className="truncate text-sm font-semibold">WebCompliance</div>
          <div className="truncate text-xs text-muted-foreground">
            <span className="font-mono">{tenant}</span>
          </div>
        </div>
        <a
          href={`/t/${tenant}`}
          target="_blank"
          rel="noreferrer"
          className="inline-flex h-10 items-center justify-center rounded-xl bg-primary px-3 text-sm text-primary-foreground transition hover:opacity-90"
        >
          Site ↗
        </a>
      </div>

      {/* Mobile drawer */}
      {open ? (
        <div className="fixed inset-0 z-50 md:hidden" role="dialog" aria-modal="true">
          <button
            type="button"
            className="absolute inset-0 bg-black/40"
            aria-label="Close navigation"
            onClick={() => setOpen(false)}
          />
          <div className="absolute left-2 top-2 h-[calc(100dvh-16px)] w-[min(86vw,320px)]">
            <div className="relative h-full">{NavContent}</div>
          </div>
        </div>
      ) : null}

      {/* Desktop sidebar */}
      <aside className="hidden w-[270px] shrink-0 md:block">
        <div className="sticky top-0 h-screen p-4">{NavContent}</div>
      </aside>
    </>
  );
}
