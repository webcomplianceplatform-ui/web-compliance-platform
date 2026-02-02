import { getPublicTenant } from "@/lib/public-tenant";
import type { Metadata } from "next";
import { getBaseUrl, publicCanonical } from "@/lib/seo";
import { pageTitle } from "@/lib/seo-titles";
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
  const title = pageTitle(brand, "Privacidad");
  const description = data.theme.seo?.description ?? data.theme.tagline ?? "Privacidad";

  const og = data.theme.seo?.ogImageUrl || `${getBaseUrl()}/og-default.png`;

  const canonical = publicCanonical(tenant, "/legal/privacidad");
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
export default async function PrivacyPage({
  params,
}: {
  params: Promise<{ tenant: string }>;
}) {
  const { tenant } = await params;
  const data = await getPublicTenant(tenant);
  if (!data) return <div>Tenant not found</div>;

  const l = data.theme.legal ?? {};
  const custom = (data.theme as any).legalDocs?.privacidad?.trim();
  const brand = data.theme.brandName ?? data.tenant.name;
  const holder = l.companyName || l.tradeName || brand;

  if (custom) {
    return (
      <LegalShell title="Política de privacidad" lastUpdated={l.lastUpdated}>
        <pre className="whitespace-pre-wrap text-sm leading-6">{custom}</pre>
      </LegalShell>
    );
  }

  return (
    <LegalShell title="Política de privacidad" lastUpdated={l.lastUpdated}>
      <p>
        El responsable del tratamiento es <strong>{holder}</strong>
        {l.cifNif ? <> (CIF/NIF: {l.cifNif})</> : null}.
      </p>

      <h2>Datos del responsable</h2>
      <ul>
        <li>
          Responsable: <strong>{holder}</strong>
        </li>
        {l.address ? (
          <li>
            Dirección: {l.address}
            {l.city ? `, ${l.city}` : ""}
            {l.country ? `, ${l.country}` : ""}
          </li>
        ) : null}
        {l.email ? <li>Email: {l.email}</li> : null}
      </ul>

      <h2>Finalidad</h2>
      <p>
        Gestionar las consultas recibidas a través de los formularios de contacto y, si procede, prestar los servicios
        solicitados.
      </p>

      <h2>Datos tratados</h2>
      <p>
        De forma general, se pueden tratar datos identificativos y de contacto (por ejemplo: nombre, email, teléfono)
        y el contenido del mensaje enviado.
      </p>

      <h2>Legitimación</h2>
      <p>
        Consentimiento del interesado al enviar el formulario, y/o ejecución de medidas precontractuales o contractuales.
      </p>

      <h2>Conservación</h2>
      <p>
        Los datos se conservarán el tiempo necesario para gestionar la solicitud y cumplir obligaciones legales aplicables.
      </p>

      <h2>Destinatarios</h2>
      <p>
        No se cederán datos a terceros salvo obligación legal o proveedores necesarios para la prestación del servicio.
      </p>

      {l.usesAnalytics ? (
        <>
          <h2>Analítica</h2>
          <p>
            Si has aceptado cookies de analítica, este sitio puede utilizar un proveedor de medición (por ejemplo, {" "}
            <strong>{l.analyticsProvider || "analítica"}</strong>) para entender el uso del sitio y mejorar el servicio.
          </p>
        </>
      ) : null}

      <h2>Derechos</h2>
      <p>
        Puedes ejercer los derechos de acceso, rectificación, supresión, oposición, limitación y portabilidad
        escribiendo a {l.email ? <strong>{l.email}</strong> : "nuestro email de contacto"}.
      </p>
    </LegalShell>
  );
}
