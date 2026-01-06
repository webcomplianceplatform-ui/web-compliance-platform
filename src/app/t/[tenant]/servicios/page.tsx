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

  const services = data.theme.pages?.services ?? [];

  return (
    <main className="space-y-6">
      <h1 className="text-2xl font-semibold">Servicios</h1>

      {services.length === 0 ? (
        <div className="rounded-xl border bg-white p-6">
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
        </div>
      ) : (
        <div className="grid gap-3 md:grid-cols-3">
          {services.map((s, i) => (
            <div key={i} className="rounded-xl border p-4">
              <div className="font-medium">{s.title}</div>
              <div className="mt-2 text-sm text-muted-foreground">{s.description}</div>
            </div>
          ))}
        </div>
      )}
    </main>
  );
}
