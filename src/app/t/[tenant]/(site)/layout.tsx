import Link from "next/link";
import { PublicNav, type PublicNavItem } from "@/components/public/PublicNav";
import { getPublicTenant } from "@/lib/public-tenant";
import { defaultTheme } from "@/lib/theme";

export default async function TenantSiteLayout({
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

  const primaryLinks: PublicNavItem[] = (theme?.navigation?.primary ?? defaultTheme.navigation?.primary ?? []).map(
    (x) => {
      const path = x.href === "/" ? "" : x.href;
      return { href: `/t/${tenant}${path}`, label: x.label };
    }
  );

  return (
    <>
      <header
        className="relative border-b"
        style={{ borderColor: "color-mix(in srgb, var(--brand-primary) 18%, transparent)" }}
      >
        <div className="mx-auto flex max-w-5xl items-center justify-between p-4">
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

          {/* Desktop */}
          <nav className="hidden gap-4 text-sm md:flex">
            {primaryLinks.map((it) => (
              <Link key={it.href} className="hover:underline" href={it.href}>
                {it.label}
              </Link>
            ))}
          </nav>

          {/* Mobile */}
          <PublicNav items={primaryLinks} />
        </div>
      </header>

      <div className="mx-auto max-w-5xl p-6">{children}</div>
    </>
  );
}
