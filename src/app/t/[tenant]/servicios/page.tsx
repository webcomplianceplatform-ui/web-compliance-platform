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
  const title = pageTitle(brand, "Servicios");
  const description = data.theme.seo?.description ?? data.theme.tagline ?? "Servicios";

  const og = data.theme.seo?.ogImageUrl || `${getBaseUrl()}/og-default.png`;

  const canonical = publicCanonical(tenant, "/servicios");

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

export default async function ServicesPage({
  params,
}: {
  params: Promise<{ tenant: string }>;
}) {
  const { tenant } = await params;
  const data = await getPublicTenant(tenant);
  if (!data) return <div>Tenant not found</div>;

  const builderSections = (data.theme.siteBuilder?.pages?.services ?? []) as any[];
  if (builderSections.length) {
    return (
      <main className="space-y-12">
        <SectionRenderer tenant={tenant} sections={builderSections as any} />
      </main>
    );
  }

  const services = data.theme.pages?.services ?? [];

  return (
    <main className="space-y-6">
      <FadeIn>
        <div>
          <h1 className="text-3xl font-semibold">Servicios</h1>
          <p className="mt-1 text-sm text-muted-foreground">Lo que hago y cómo te puedo ayudar.</p>
        </div>
      </FadeIn>

      {services.length === 0 ? (
        <FadeIn className="rounded-2xl border bg-white/60 p-6 shadow-sm backdrop-blur">
          <div className="text-base font-semibold">Aún no hay servicios configurados</div>
          <div className="mt-1 text-sm text-muted-foreground">
            Si quieres saber en qué puedo ayudarte, contáctame y te respondo lo antes posible.
          </div>
          <a
            className="mt-4 inline-flex rounded border px-3 py-2 text-sm hover:bg-muted"
            href={`/t/${tenant}/contacto`}
          >
            Ir a contacto
          </a>
        </FadeIn>
      ) : (
        <Stagger className="grid gap-3 md:grid-cols-3">
          {services.map((s, i) => (
            <StaggerItem
              key={i}
              variants={{
                hidden: { opacity: 0, y: 10 },
                show: { opacity: 1, y: 0, transition: { duration: 0.35 } },
              }}
              className="group rounded-2xl border bg-white/60 p-5 shadow-sm backdrop-blur transition hover:-translate-y-1 hover:shadow-md"
            >
              <div className="font-medium">{s.title}</div>
              <div className="mt-2 text-sm text-muted-foreground">{s.description}</div>
              <div className="mt-4 h-px w-full opacity-0 transition group-hover:opacity-100" style={{ background: "color-mix(in srgb, var(--brand-accent) 45%, transparent)" }} />
            </StaggerItem>
          ))}
        </Stagger>
      )}
    </main>
  );
}
