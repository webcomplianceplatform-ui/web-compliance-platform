import type { Metadata } from "next";
import { getPublicTenant } from "@/lib/public-tenant";
import { getBaseUrl, publicCanonical } from "@/lib/seo";
import { pageTitle } from "@/lib/seo-titles";
import ContactForm from "./contact-form";
import { FadeIn } from "@/components/public/Motion";
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
  const title = pageTitle(brand, "Contacto");
  const description = data.theme.seo?.description ?? data.theme.tagline ?? "Contacto";

  const og = data.theme.seo?.ogImageUrl || `${getBaseUrl()}/og-default.png`;

  const canonical = publicCanonical(tenant, "/contacto");
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

export default async function Page({ params }: { params: Promise<{ tenant: string }> }) {
  const { tenant } = await params;
  const data = await getPublicTenant(tenant);
  if (!data) return <div>Tenant not found</div>;

  const builderSections = (data.theme.siteBuilder?.pages?.contact ?? []) as any[];
  if (builderSections.length) {
    return (
      <main className="space-y-12">
        <SectionRenderer tenant={tenant} sections={builderSections as any} />
      </main>
    );
  }

  const contact = (data.theme.pages as any)?.contact;

  return (
    <main className="space-y-6">
      <FadeIn>
        <div>
          <h1 className="text-3xl font-semibold">{contact?.title ?? "Contacto"}</h1>
          <p className="mt-1 text-sm text-muted-foreground">Escríbeme y te respondo lo antes posible.</p>
        </div>
      </FadeIn>

      <FadeIn delay={0.05}>
        <div className="rounded-2xl border bg-white/60 p-6 shadow-sm backdrop-blur">
          <div className="text-sm text-muted-foreground">
            {contact?.email ? <div><span className="font-medium text-foreground">Email:</span> {contact.email}</div> : null}
            {contact?.phone ? <div className="mt-1"><span className="font-medium text-foreground">Tel:</span> {contact.phone}</div> : null}
            {contact?.address ? <div className="mt-1">{contact.address}</div> : null}
          </div>

          <div className="mt-6">
            <ContactForm tenant={tenant} />
          </div>
        </div>
      </FadeIn>
    </main>
  );
}
