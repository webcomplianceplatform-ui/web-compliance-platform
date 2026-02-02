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
  const title = pageTitle(brand, "Aviso legal");
  const description = data.theme.seo?.description ?? data.theme.tagline ?? "Aviso Legal";

  const og = data.theme.seo?.ogImageUrl || `${getBaseUrl()}/og-default.png`;

  const canonical = publicCanonical(tenant, "/legal/aviso-legal");
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
export default async function LegalNoticePage({
  params,
}: {
  params: Promise<{ tenant: string }>;
}) {
  const { tenant } = await params;
  const data = await getPublicTenant(tenant);
  if (!data) return <div>Tenant not found</div>;

  const l = data.theme.legal ?? {};
  const custom = (data.theme as any).legalDocs?.avisoLegal?.trim();
  const brand = data.theme.brandName ?? data.tenant.name;
  const holder = l.companyName || l.tradeName || brand;

  if (custom) {
    return (
      <LegalShell title="Aviso legal" lastUpdated={l.lastUpdated}>
        <pre className="whitespace-pre-wrap text-sm leading-6">{custom}</pre>
      </LegalShell>
    );
  }

  return (
    <LegalShell title="Aviso legal" lastUpdated={l.lastUpdated}>
      <p>
        Este sitio web es titularidad de <strong>{holder}</strong>
        {l.cifNif ? <> (CIF/NIF: {l.cifNif})</> : null}.
      </p>

      <h2>Identificación del titular</h2>
      <ul>
        <li>
          Titular: <strong>{holder}</strong>
        </li>
        {l.tradeName ? <li>Nombre comercial: {l.tradeName}</li> : null}
        {l.cifNif ? <li>CIF/NIF: {l.cifNif}</li> : null}
        {l.address ? (
          <li>
            Dirección: {l.address}
            {l.city ? `, ${l.city}` : ""}
            {l.country ? `, ${l.country}` : ""}
          </li>
        ) : null}
        {l.email ? <li>Email: {l.email}</li> : null}
        {l.phone ? <li>Teléfono: {l.phone}</li> : null}
      </ul>

      <h2>Objeto</h2>
      <p>
        El presente aviso legal regula el acceso, navegación y uso de este sitio web. El acceso y/o uso implica que
        aceptas las condiciones aquí recogidas.
      </p>

      <h2>Condiciones de uso</h2>
      <p>
        Te comprometes a utilizar el sitio de forma lícita y diligente, evitando acciones que puedan dañar la imagen,
        los intereses o los derechos del titular o de terceros, o que puedan inutilizar, sobrecargar o impedir el
        normal uso del sitio.
      </p>

      <h2>Propiedad intelectual e industrial</h2>
      <p>
        Salvo indicación expresa, los contenidos del sitio (textos, imágenes, marcas, logotipos, código, etc.) están
        protegidos por la normativa aplicable. Queda prohibida su reproducción, distribución o transformación sin la
        autorización correspondiente.
      </p>

      <h2>Responsabilidad</h2>
      <p>
        El titular no se hace responsable de los daños derivados del uso indebido del sitio ni de posibles errores o
        interrupciones del servicio, salvo que la normativa aplicable disponga lo contrario.
      </p>

      <h2>Enlaces a terceros</h2>
      <p>
        Este sitio puede incluir enlaces a páginas de terceros. El titular no asume responsabilidad por los contenidos
        o políticas de dichos sitios.
      </p>

      <h2>Legislación aplicable</h2>
      <p>
        La relación entre el usuario y el titular se regirá por la legislación aplicable en la jurisdicción del
        titular, salvo disposición imperativa en contrario.
      </p>
    </LegalShell>
  );
}
