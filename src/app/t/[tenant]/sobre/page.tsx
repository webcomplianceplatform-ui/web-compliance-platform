import { getPublicTenant } from "@/lib/public-tenant";

export default async function SobrePage({
  params,
}: {
  params: Promise<{ tenant: string }>;
}) {
  const { tenant } = await params;
  const data = await getPublicTenant(tenant);
  if (!data) return <div>Tenant not found</div>;

  const about = data.theme.pages?.about;

  return (
    <main className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold">{about?.title ?? "Sobre"}</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          {data.theme.tagline ?? "Conoce más sobre nosotros"}
        </p>
      </div>

      <section className="rounded-2xl border p-6">
        <div className="prose max-w-none">
          <p className="text-muted-foreground whitespace-pre-line">
            {about?.body ??
              "Aquí irá tu texto de 'Sobre nosotros'. Puedes editarlo desde el panel (theme)."}
          </p>
        </div>
      </section>
    </main>
  );
}
