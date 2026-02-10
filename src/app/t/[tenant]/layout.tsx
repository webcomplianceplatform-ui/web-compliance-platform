import CookieBanner from "@/components/public/CookieBanner";
import AnalyticsLoader from "@/components/public/AnalyticsLoader";
import PublicFooter from "@/components/public/PublicFooter";
import { getPublicTenant } from "@/lib/public-tenant";
import { defaultTheme } from "@/lib/theme";
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

export default async function TenantPublicBaseLayout({
  children,
  params,
}: {
  children: React.ReactNode;
  params: Promise<{ tenant: string }>;
}) {
  const { tenant } = await params;
  const data = await getPublicTenant(tenant);

  const theme = data?.theme ?? defaultTheme;
  const primary = cssVarColor(theme?.primary, "#111111");
  const accent = cssVarColor(theme?.accent, "#F59E0B");

  const brandName = theme?.brandName ?? data?.tenant.name ?? tenant;

  const usesAnalytics = !!theme?.legal?.usesAnalytics;
  const analyticsProvider = theme?.legal?.analyticsProvider ?? null;
  const analyticsId = theme?.legal?.analyticsId ?? null;

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
      {children}

      {/* Analítica (solo si hay consentimiento) */}
      <AnalyticsLoader usesAnalytics={usesAnalytics} provider={analyticsProvider} analyticsId={analyticsId} />

      {/* Footer público (incluye enlaces a legal) */}
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

      {/* Banner cookies (si no hay consentimiento) */}
      <CookieBanner tenant={tenant} usesAnalytics={usesAnalytics} />
    </div>
  );
}
