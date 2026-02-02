import Link from "next/link";
import { getPublicTenant } from "@/lib/public-tenant";
import type { Metadata } from "next";
import { getBaseUrl, publicCanonical } from "@/lib/seo";
import { pageTitle } from "@/lib/seo-titles";
import { FadeIn, Stagger, StaggerItem } from "@/components/public/Motion";
import { SectionRenderer } from "@/components/public/SectionRenderer";

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

  const builderSections = (theme.siteBuilder?.pages?.home ?? []) as any[];

  if (builderSections.length) {
    return (
      <main
        className="space-y-12"
        style={
          {
            ["--brand-primary" as any]: primary,
            ["--brand-accent" as any]: accent,
          } as React.CSSProperties
        }
      >
        <SectionRenderer tenant={tenant} sections={builderSections as any} />
      </main>
    );
  }

  return (
    <main
      className="space-y-12"
      style={
        {
          ["--brand-primary" as any]: primary,
          ["--brand-accent" as any]: accent,
        } as React.CSSProperties
      }
    >
      <section className="relative overflow-hidden rounded-3xl border bg-white/60 p-6 shadow-sm backdrop-blur md:p-10">
        <div
          className="pointer-events-none absolute inset-0 opacity-60"
          style={{
            background:
              "radial-gradient(1200px 400px at 20% 10%, color-mix(in srgb, var(--brand-accent) 35%, transparent), transparent 55%), radial-gradient(900px 500px at 80% 0%, color-mix(in srgb, var(--brand-primary) 25%, transparent), transparent 60%)",
          }}
        />

        {/* Brand row */}
        <FadeIn>
          <div className="relative flex items-center gap-3">
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
        </FadeIn>

        {/* Hero */}
        <FadeIn delay={0.05}>
          <h1 className="relative mt-6 max-w-2xl text-3xl font-semibold leading-tight md:text-5xl">
            {theme.hero?.headline ?? "Tu web corporativa, rápida y compliant"}
          </h1>
        </FadeIn>

        <FadeIn delay={0.1}>
          <p className="relative mt-4 max-w-2xl text-base text-muted-foreground md:text-lg">
            {theme.hero?.subheadline ??
              "Tu presencia online con branding, dominio y cumplimiento básico, sin complicaciones."}
          </p>
        </FadeIn>

        <FadeIn delay={0.15}>
          <div className="relative mt-6 flex flex-wrap gap-3">
          <Link
            href={`/t/${tenant}${theme.hero?.ctaHref ?? "/contacto"}`}
            className="rounded-xl px-4 py-2 text-sm text-white shadow-sm transition hover:-translate-y-0.5 hover:opacity-95"
            style={{ background: "var(--brand-primary)" }}
          >
            {theme.hero?.ctaText ?? "Contactar"}
          </Link>

          <Link
            href={`/t/${tenant}/servicios`}
            className="rounded-xl border px-4 py-2 text-sm transition hover:-translate-y-0.5 hover:bg-white/60"
            style={{
              borderColor: "color-mix(in srgb, var(--brand-primary) 30%, transparent)",
            }}
          >
            Ver servicios
          </Link>

          <Link
            href={`/app/${tenant}`}
            className="rounded-xl px-4 py-2 text-sm transition hover:-translate-y-0.5"
            style={{
              background: "color-mix(in srgb, var(--brand-accent) 18%, transparent)",
              border: "1px solid color-mix(in srgb, var(--brand-accent) 35%, transparent)",
            }}
          >
            Panel
          </Link>
          </div>
        </FadeIn>
      </section>

      {/* Services */}
      <section className="space-y-4">
        <FadeIn>
          <div className="flex items-end justify-between gap-4">
            <div>
              <h2 className="text-2xl font-semibold">Servicios</h2>
              <p className="mt-1 text-sm text-muted-foreground">Lo esencial, explicado en claro.</p>
            </div>
            <Link
              href={`/t/${tenant}/servicios`}
              className="text-sm underline underline-offset-4"
              style={{ textDecorationColor: "color-mix(in srgb, var(--brand-accent) 70%, transparent)" }}
            >
              Ver todos
            </Link>
          </div>
        </FadeIn>

        <Stagger className="grid gap-3 md:grid-cols-3">
          {(theme.pages?.services ?? []).slice(0, 6).map((s, idx) => (
            <StaggerItem
              key={idx}
              variants={{
                hidden: { opacity: 0, y: 10 },
                show: { opacity: 1, y: 0, transition: { duration: 0.35 } },
              }}
              className="group rounded-2xl border bg-white/60 p-5 shadow-sm backdrop-blur transition hover:-translate-y-1 hover:shadow-md"
              style={{
                borderColor: "color-mix(in srgb, var(--brand-primary) 18%, transparent)",
              }}
            >
              <div className="flex items-center gap-2">
                <span className="inline-block h-2 w-2 rounded-full" style={{ background: "var(--brand-accent)" }} />
                <div className="font-medium">{s.title}</div>
              </div>
              <div className="mt-2 text-sm text-muted-foreground">{s.description}</div>
              <div
                className="mt-4 h-px w-full opacity-0 transition group-hover:opacity-100"
                style={{ background: "color-mix(in srgb, var(--brand-accent) 45%, transparent)" }}
              />
            </StaggerItem>
          ))}

          {(theme.pages?.services ?? []).length === 0 ? (
            <FadeIn className="rounded-2xl border bg-white/60 p-5 text-sm text-muted-foreground shadow-sm backdrop-blur">
              No hay servicios configurados todavía. Edita el contenido desde el panel (Site).
            </FadeIn>
          ) : null}
        </Stagger>
      </section>
    </main>
  );
}
