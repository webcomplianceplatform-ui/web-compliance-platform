import type { Metadata } from "next";
import { getPublicTenant } from "@/lib/public-tenant";
import { getBaseUrl, publicCanonical } from "@/lib/seo";
import { pageTitle } from "@/lib/seo-titles";
import { FadeIn } from "@/components/public/Motion";
import { SectionRenderer } from "@/components/public/SectionRenderer";

export async function generateMetadata({ params }: { params: Promise<{ tenant: string }> }): Promise<Metadata> {
  const { tenant } = await params;
  const data = await getPublicTenant(tenant);
  if (!data) return { title: "Not found" };

  const brand = data.theme.brandName ?? data.tenant.name;
  const title = pageTitle(brand, "Sobre");
  const description = data.theme.seo?.description ?? data.theme.tagline ?? "Sobre";
  const canonical = publicCanonical(tenant, "/sobre");
  const og = data.theme.seo?.ogImageUrl || `${getBaseUrl()}/og-default.png`;

  return {
    title,
    description,
    alternates: { canonical },
    openGraph: { title, description, url: canonical, images: og ? [og] : [] },
  };
}

export default async function Page({ params }: { params: Promise<{ tenant: string }> }) {
  const { tenant } = await params;
  const data = await getPublicTenant(tenant);
  if (!data) return <div>Tenant not found</div>;

  const builderSections = (data.theme.siteBuilder?.pages?.about ?? []) as any[];
  if (builderSections.length) {
    return (
      <main className="space-y-12">
        <SectionRenderer tenant={tenant} sections={builderSections as any} />
      </main>
    );
  }

  const about = (data.theme.pages as any)?.about; // si lo tipaste ya, quita el any
  return (
    <main className="space-y-6">
      <FadeIn>
        <div>
          <h1 className="text-3xl font-semibold">{about?.title ?? "Sobre"}</h1>
          <p className="mt-1 text-sm text-muted-foreground">Una presentación rápida y clara.</p>
        </div>
      </FadeIn>

      <FadeIn delay={0.05}>
        <div className="rounded-2xl border bg-white/60 p-6 shadow-sm backdrop-blur">
          <p className="whitespace-pre-wrap text-sm leading-6 text-muted-foreground md:text-base">
            {about?.body ??
              "Describe aquí quién eres, qué haces y por qué el cliente debería confiar en ti. (Edita este texto desde el panel: Site)."}
          </p>
        </div>
      </FadeIn>
    </main>
  );
}
