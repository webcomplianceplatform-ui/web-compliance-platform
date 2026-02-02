import { getPublicTenant } from "@/lib/public-tenant";
import type { Metadata } from "next";
import { getBaseUrl, publicCanonical } from "@/lib/seo";
import { pageTitle } from "@/lib/seo-titles";
import ConsentManager from "@/components/public/ConsentManager";
import LegalShell from "@/components/public/legal/LegalShell";
export async function generateMetadata({
  params,
}: {
  params: Promise<{ tenant: string }>;
}): Promise<Metadata> {
  const { tenant } = await params;
  const data = await getPublicTenant(tenant);
  if (!data) return { title: "Not found" };

  const brand = data.theme.brandName ?? data.tenant.name;
  const title = pageTitle(brand, "Cookies");
  const description = data.theme.seo?.description ?? data.theme.tagline ?? "Cookies";

  const og = data.theme.seo?.ogImageUrl || `${getBaseUrl()}/og-default.png`;

  const canonical = publicCanonical(tenant, "/legal/cookies");
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
export default async function CookiesPage({
  params,
}: {
  params: Promise<{ tenant: string }>;
}) {
  const { tenant } = await params;
  const data = await getPublicTenant(tenant);
  if (!data) return <div>Tenant not found</div>;

  const l = data.theme.legal ?? {};
  const custom = (data.theme as any).legalDocs?.cookies?.trim();
  const brand = data.theme.brandName ?? data.tenant.name;

  if (custom) {
    return (
      <LegalShell title="Política de cookies" lastUpdated={l.lastUpdated}>
        <div className="not-prose my-4">
          <ConsentManager usesAnalytics={!!l.usesAnalytics} />
        </div>
        <pre className="whitespace-pre-wrap text-sm leading-6">{custom}</pre>
      </LegalShell>
    );
  }

  return (
    <LegalShell title="Política de cookies" lastUpdated={l.lastUpdated}>
      {/* Gestión de consentimiento (solo cliente) */}
      <div className="not-prose my-4">
        <ConsentManager usesAnalytics={!!l.usesAnalytics} />
      </div>

      <p>
        Esta política explica qué cookies se utilizan en el sitio web de <strong>{l.companyName || brand}</strong> y
        cómo puedes gestionarlas.
      </p>

      <h2>¿Qué son las cookies?</h2>
      <p>
        Las cookies son pequeños archivos que se almacenan en tu dispositivo para recordar información sobre tu
        navegación, mejorar la experiencia y, en su caso, medir el uso del sitio.
      </p>

      <h2>Tipos de cookies</h2>
      <ul>
        <li>
          <strong>Técnicas</strong>: necesarias para el funcionamiento básico del sitio.
        </li>
        <li>
          <strong>Preferencias</strong>: recuerdan opciones como idioma o configuración.
        </li>
        <li>
          <strong>Analítica</strong>: ayudan a entender cómo se usa el sitio para mejorar contenidos y rendimiento.
        </li>
      </ul>

      <h2>Cookies utilizadas en este sitio</h2>
      {l.usesAnalytics ? (
        <>
          <p>
            Este sitio puede utilizar cookies de analítica para medir el uso y mejorar el servicio. Proveedor: {" "}
            <strong>{l.analyticsProvider || "Analítica"}</strong>.
          </p>
          <ul>
            <li>Finalidad: medición de visitas, navegación y rendimiento.</li>
            <li>Base: solo se cargan si aceptas las cookies de analítica.</li>
          </ul>
        </>
      ) : (
        <>
          <p>
            Este sitio <strong>no utiliza cookies de analítica</strong>. Puede usar únicamente cookies técnicas
            necesarias.
          </p>
        </>
      )}

      <h2>Cómo gestionar o desactivar cookies</h2>
      <p>
        Puedes cambiar tu elección en cualquier momento desde el panel de preferencias anterior. Además, puedes
        configurar tu navegador para bloquear o eliminar cookies. Ten en cuenta que algunas funcionalidades podrían
        verse afectadas.
      </p>

      <h2>Más información</h2>
      <p>
        Si tienes dudas sobre esta política de cookies, puedes contactar con {l.email ? <strong>{l.email}</strong> : "nosotros"}.
      </p>
    </LegalShell>
  );
}
