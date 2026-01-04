import { getPublicTenant } from "@/lib/public-tenant";
import type { Metadata } from "next";
export async function generateMetadata({ params }: { params: Promise<{ tenant: string }> }): Promise<Metadata> {
  const { tenant } = await params;
  return { title: `Servicios | ${tenant}` };
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
        <div className="rounded-xl border p-4 text-sm text-muted-foreground">
          Aún no hay servicios configurados.
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
