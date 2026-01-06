import type { Metadata } from "next";
import { getPublicTenant } from "@/lib/public-tenant";
import { getBaseUrl, publicCanonical } from "@/lib/seo";
import { pageTitle } from "@/lib/seo-titles";
import ContactForm from "./contact-form";

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

  const contact = (data.theme.pages as any)?.contact;

  return (
    <main className="space-y-6">
      <h1 className="text-2xl font-semibold">{contact?.title ?? "Contacto"}</h1>
      <div className="text-sm text-muted-foreground">
        {contact?.email ? <div>Email: {contact.email}</div> : null}
        {contact?.phone ? <div>Tel: {contact.phone}</div> : null}
        {contact?.address ? <div>{contact.address}</div> : null}
      </div>

      <ContactForm tenant={tenant} />
    </main>
  );
}
