import Link from "next/link";
import { getPublicTenant } from "@/lib/public-tenant";
import type { Metadata } from "next";
import { getBaseUrl, publicCanonical } from "@/lib/seo";
import { pageTitle } from "@/lib/seo-titles";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ tenant: string }>;
}): Promise<Metadata> {
  const { tenant } = await params;
  const data = await getPublicTenant(tenant);
  if (!data) return { title: "Not found" };

  const brand = data.theme.brandName ?? data.tenant.name;
  const title = data.theme.seo?.title ?? pageTitle(brand, "Home");
  const description = data.theme.seo?.description ?? data.theme.tagline ?? "Web corporativa";

  const og = data.theme.seo?.ogImageUrl || `${getBaseUrl()}/og-default.png`;

  const canonical = publicCanonical(tenant, "");
  return {
    title,
    description,
    alternates: { canonical },
    openGraph: {
      title,
      description,
      url: canonical,
      images: og ? [og] : [],
    },
  };
}

function cssVarColor(value: string | null | undefined, fallback: string) {
  if (!value) return fallback;
  const v = value.trim();
  return v ? v : fallback;
}


export default async function TenantHome({
  params,
}: {
  params: Promise<{ tenant: string }>;
}) {
  const { tenant } = await params;
  const data = await getPublicTenant(tenant);
  if (!data) return <div>Tenant not found</div>;

  const { theme } = data;

  const primary = cssVarColor(theme.primary, "#111111");
  const accent = cssVarColor(theme.accent, "#F59E0B");

  return (
    <main
      className="space-y-10"
      style={
        {
          // variables para reutilizar en styles inline
          ["--brand-primary" as any]: primary,
          ["--brand-accent" as any]: accent,
        } as React.CSSProperties
      }
    >
      <section className="rounded-2xl border p-6">
        {/* Brand row */}
        <div className="flex items-center gap-3">
          {theme.logoUrl ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={theme.logoUrl}
              alt={theme.brandName ?? tenant}
              className="h-10 w-10 rounded object-cover"
            />
          ) : (
            <div
              className="flex h-10 w-10 items-center justify-center rounded text-sm font-semibold text-white"
              style={{ background: "var(--brand-primary)" }}
              aria-label="Brand mark"
            >
              {(theme.brandName ?? tenant).slice(0, 2).toUpperCase()}
            </div>
          )}

          <div className="min-w-0">
            <div className="truncate text-sm font-medium">
              {theme.brandName ?? data.tenant.name}
            </div>
            {theme.tagline ? (
              <div className="truncate text-xs text-muted-foreground">{theme.tagline}</div>
            ) : null}
          </div>

          {/* Accent badge */}
          <div
            className="ml-auto hidden rounded-full px-3 py-1 text-xs font-medium md:inline-block"
            style={{
              background: "color-mix(in srgb, var(--brand-accent) 18%, transparent)",
              color: "var(--brand-primary)",
              border: "1px solid color-mix(in srgb, var(--brand-accent) 35%, transparent)",
            }}
          >
            Web Compliance
          </div>
        </div>

        {/* Hero */}
        <h1 className="mt-5 text-3xl font-semibold">
          {theme.hero?.headline ?? "Tu web corporativa, rápida y compliant"}
        </h1>

        {theme.hero?.subheadline ? (
          <p className="mt-3 text-muted-foreground">{theme.hero.subheadline}</p>
        ) : null}

        <div className="mt-5 flex flex-wrap gap-3">
          <Link
            href={`/t/${tenant}${theme.hero?.ctaHref ?? "/contacto"}`}
            className="rounded px-4 py-2 text-sm text-white"
            style={{ background: "var(--brand-primary)" }}
          >
            {theme.hero?.ctaText ?? "Contactar"}
          </Link>

          <Link
            href={`/t/${tenant}/servicios`}
            className="rounded border px-4 py-2 text-sm"
            style={{
              borderColor: "color-mix(in srgb, var(--brand-primary) 30%, transparent)",
            }}
          >
            Ver servicios
          </Link>

          <Link
            href={`/app/${tenant}`}
            className="rounded px-4 py-2 text-sm"
            style={{
              background: "color-mix(in srgb, var(--brand-accent) 18%, transparent)",
              border: "1px solid color-mix(in srgb, var(--brand-accent) 35%, transparent)",
            }}
          >
            Panel
          </Link>
        </div>
      </section>

      {/* Services */}
      <section>
        <div className="flex items-end justify-between gap-4">
          <h2 className="text-xl font-semibold">Servicios</h2>
          <Link
            href={`/t/${tenant}/servicios`}
            className="text-sm underline"
            style={{ textDecorationColor: "color-mix(in srgb, var(--brand-accent) 70%, transparent)" }}
          >
            Ver todos
          </Link>
        </div>

        <div className="mt-4 grid gap-3 md:grid-cols-3">
          {(theme.pages?.services ?? []).map((s, idx) => (
            <div
              key={idx}
              className="rounded-xl border p-4"
              style={{
                borderColor: "color-mix(in srgb, var(--brand-primary) 18%, transparent)",
              }}
            >
              <div className="flex items-center gap-2">
                <span
                  className="inline-block h-2 w-2 rounded-full"
                  style={{ background: "var(--brand-accent)" }}
                />
                <div className="font-medium">{s.title}</div>
              </div>
              <div className="mt-2 text-sm text-muted-foreground">{s.description}</div>
            </div>
          ))}

          {(theme.pages?.services ?? []).length === 0 ? (
            <div className="rounded-xl border p-4 text-sm text-muted-foreground">
              No hay servicios configurados todavía (añádelos en Settings).
            </div>
          ) : null}
        </div>
      </section>
    </main>
  );
}
