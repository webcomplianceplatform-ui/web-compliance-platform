import type { Metadata } from "next";
import { getPublicTenant } from "@/lib/public-tenant";
import { getBaseUrl, publicCanonical } from "@/lib/seo";
import { pageTitle } from "@/lib/seo-titles";

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

  const about = (data.theme.pages as any)?.about; // si lo tipaste ya, quita el any
  return (
    <main className="space-y-4">
      <h1 className="text-2xl font-semibold">{about?.title ?? "Sobre"}</h1>
      <p className="text-muted-foreground whitespace-pre-wrap">
        {about?.body ??
          "Describe aquí quién eres, qué haces y por qué el cliente debería confiar en ti. (Luego lo conectamos a CMS)."}
      </p>
    </main>
  );
}
