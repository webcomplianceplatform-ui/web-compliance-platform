import Link from "next/link";
import { getPublicTenant } from "@/lib/public-tenant";
import { defaultTheme } from "@/lib/theme";

export default async function TenantLegalLayout({
  children,
  params,
}: {
  children: React.ReactNode;
  params: Promise<{ tenant: string }>;
}) {
  const { tenant } = await params;
  const data = await getPublicTenant(tenant);

  const theme = data?.theme ?? defaultTheme;
  const brandName = theme?.brandName ?? data?.tenant.name ?? tenant;
  const logoUrl = theme?.logoUrl ?? null;

  const legalLinks = [
    { href: `/t/${tenant}/legal/aviso-legal`, label: "Aviso legal" },
    { href: `/t/${tenant}/legal/privacidad`, label: "Privacidad" },
    { href: `/t/${tenant}/legal/cookies`, label: "Cookies" },
  ];

  return (
    <>
      {/* Legal-only header: no marketing nav */}
      <header
        className="relative border-b"
        style={{ borderColor: "color-mix(in srgb, var(--brand-primary) 18%, transparent)" }}
      >
        <div className="mx-auto flex max-w-5xl flex-col gap-3 p-4 md:flex-row md:items-center md:justify-between">
          <div className="flex items-center justify-between gap-3">
            <Link href={`/t/${tenant}`} className="flex items-center gap-3">
              {logoUrl ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={logoUrl} alt={brandName} className="h-8 w-8 rounded object-cover" />
              ) : (
                <div
                  className="flex h-8 w-8 items-center justify-center rounded text-xs font-semibold text-white"
                  style={{ background: "var(--brand-primary)" }}
                >
                  {brandName.slice(0, 2).toUpperCase()}
                </div>
              )}

              <span className="font-semibold">{brandName}</span>
            </Link>

            <Link
              href={`/t/${tenant}`}
              className="text-sm text-muted-foreground hover:underline"
              aria-label="Volver al sitio"
            >
              Volver al sitio
            </Link>
          </div>

          <nav className="flex flex-wrap gap-4 text-sm">
            {legalLinks.map((it) => (
              <Link key={it.href} className="hover:underline" href={it.href}>
                {it.label}
              </Link>
            ))}
          </nav>
        </div>
      </header>

      <div className="mx-auto max-w-5xl p-6">{children}</div>
    </>
  );
}
