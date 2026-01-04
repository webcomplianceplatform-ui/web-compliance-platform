import { getPublicTenant } from "@/lib/public-tenant";

export default async function PrivacyPage({
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
      <h1>Política de privacidad</h1>

      <p>
        El responsable del tratamiento es <strong>{l.companyName || brand}</strong>
        {l.cifNif ? <> (CIF/NIF: {l.cifNif})</> : null}.
      </p>

      <h2>Finalidad</h2>
      <p>
        Gestionar las consultas recibidas a través de los formularios de contacto y, si procede, prestar los servicios
        solicitados.
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

      <h2>Derechos</h2>
      <p>
        Puedes ejercer los derechos de acceso, rectificación, supresión, oposición, limitación y portabilidad
        escribiendo a {l.email || "nuestro email de contacto"}.
      </p>
    </main>
  );
}
