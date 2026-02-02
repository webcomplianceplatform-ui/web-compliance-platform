import Link from "next/link";
import { PublicNav, type PublicNavItem } from "@/components/public/PublicNav";
import { getPublicTenant } from "@/lib/public-tenant";
import { defaultTheme } from "@/lib/theme";
import CookieBanner from "@/components/public/CookieBanner";
import AnalyticsLoader from "@/components/public/AnalyticsLoader";
import PublicFooter from "@/components/public/PublicFooter";
import type { Metadata } from "next";
import { getBaseUrl } from "@/lib/seo";

export async function generateMetadata({ params }: { params: Promise<{ tenant: string }> }): Promise<Metadata> {
  const { tenant } = await params;
  const data = await getPublicTenant(tenant);
  if (!data) return {};

  const favicon = (data.theme.seo as any)?.faviconUrl?.trim() || `${getBaseUrl()}/favicon.ico`;
  return {
    icons: {
      icon: favicon,
    },
  };
}

function cssVarColor(value: string | null | undefined, fallback: string) {
  if (!value) return fallback;
  const v = value.trim();
  return v ? v : fallback;
}

export default async function TenantPublicLayout({
  children,
  params,
}: {
  children: React.ReactNode;
  params: Promise<{ tenant: string }>;
}) {
  const { tenant } = await params;
  const data = await getPublicTenant(tenant);

  const theme = data?.theme;
  const primary = cssVarColor(theme?.primary, "#111111");
  const accent = cssVarColor(theme?.accent, "#F59E0B");

  const brandName = theme?.brandName ?? data?.tenant.name ?? tenant;
  const logoUrl = theme?.logoUrl ?? null;
  const usesAnalytics = !!theme?.legal?.usesAnalytics;
  const analyticsProvider = theme?.legal?.analyticsProvider ?? null;
  const analyticsId = theme?.legal?.analyticsId ?? null;

  const primaryLinks: PublicNavItem[] = (theme?.navigation?.primary ?? defaultTheme.navigation?.primary ?? []).map(
    (x) => {
      const path = x.href === "/" ? "" : x.href;
      return { href: `/t/${tenant}${path}`, label: x.label };
    }
  );

  return (
    <div
      className="min-h-screen"
      style={
        {
          ["--brand-primary" as any]: primary,
          ["--brand-accent" as any]: accent,
        } as React.CSSProperties
      }
    >
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

      {/* Analítica (solo si hay consentimiento) */}
      <AnalyticsLoader usesAnalytics={usesAnalytics} provider={analyticsProvider} analyticsId={analyticsId} />

      <PublicFooter
        tenant={tenant}
        brandName={brandName}
        aboutText={theme?.footer?.aboutText ?? theme?.tagline ?? ""}
        email={theme?.footer?.email ?? theme?.pages?.contact?.email ?? ""}
        phone={theme?.footer?.phone ?? theme?.pages?.contact?.phone ?? ""}
        location={theme?.footer?.location ?? theme?.pages?.contact?.address ?? ""}
        copyright={theme?.footer?.copyright ?? ""}
        usesAnalytics={usesAnalytics}
      />

      {/* Banner cookies (solo si aplica) */}
      <CookieBanner tenant={tenant} usesAnalytics={usesAnalytics} />

    </div>
  );
}
