import { getPublicTenant } from "@/lib/public-tenant";

export default async function CookiesPage({
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
      <h1>Política de cookies</h1>

      <p>
        Este sitio web de <strong>{l.companyName || brand}</strong> utiliza cookies para mejorar la experiencia de usuario.
      </p>

      <h2>¿Qué son las cookies?</h2>
      <p>
        Son pequeños archivos que se almacenan en tu dispositivo para recordar información sobre tu navegación.
      </p>

      <h2>Cookies utilizadas</h2>

      {l.usesAnalytics ? (
        <>
          <p>
            Este sitio utiliza cookies de analítica para medir el uso (proveedor:{" "}
            <strong>{l.analyticsProvider || "analítica"}</strong>).
          </p>
          <ul>
            <li>Analítica: medir visitas y comportamiento de navegación.</li>
          </ul>
        </>
      ) : (
        <>
          <p>Este sitio no utiliza cookies de analítica. Puede usar únicamente cookies técnicas necesarias.</p>
          <ul>
            <li>Técnicas: necesarias para el funcionamiento básico del sitio.</li>
          </ul>
        </>
      )}

      <h2>Cómo desactivar cookies</h2>
      <p>
        Puedes configurar tu navegador para bloquear o eliminar cookies. Ten en cuenta que algunas funcionalidades
        podrían verse afectadas.
      </p>
    </main>
  );
}
