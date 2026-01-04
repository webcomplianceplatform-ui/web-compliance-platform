import { getPublicTenant } from "@/lib/public-tenant";

export default async function LegalNoticePage({
  params,
}: {
  params: Promise<{ tenant: string }>;
}) {
  const { tenant } = await params;
  const data = await getPublicTenant(tenant);
  if (!data) return <div>Tenant not found</div>;

  const l = data.theme.legal ?? {};
  const brand = data.theme.brandName ?? data.tenant.name;

  return (
    <main className="prose max-w-none">
      <h1>Aviso legal</h1>

      <p>
        Este sitio web es titularidad de <strong>{l.companyName || brand}</strong>
        {l.cifNif ? <> (CIF/NIF: {l.cifNif})</> : null}.
      </p>

      <h2>Datos de contacto</h2>
      <ul>
        {l.address ? <li>Dirección: {l.address}{l.city ? `, ${l.city}` : ""}{l.country ? `, ${l.country}` : ""}</li> : null}
        {l.email ? <li>Email: {l.email}</li> : null}
        {l.phone ? <li>Teléfono: {l.phone}</li> : null}
      </ul>

      <h2>Condiciones de uso</h2>
      <p>
        El acceso y uso del sitio implica la aceptación de estas condiciones. El usuario se compromete a utilizar
        el sitio de forma lícita, sin causar daños ni impedir su normal funcionamiento.
      </p>

      <h2>Propiedad intelectual</h2>
      <p>
        Salvo indicación expresa, los contenidos del sitio (textos, imágenes, marcas, etc.) están protegidos y no
        pueden reutilizarse sin autorización.
      </p>

      <h2>Responsabilidad</h2>
      <p>
        El titular no se hace responsable del mal uso del contenido ni de posibles daños derivados del acceso o uso
        de la información del sitio.
      </p>
    </main>
  );
}
