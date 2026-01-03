import Link from "next/link";
import { getPublicTenant } from "@/lib/public-tenant";

export default async function ServiciosPage({
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
      <div className="flex items-end justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold">Servicios</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Lo que ofrecemos para <span className="font-mono">{tenant}</span>
          </p>
        </div>

        <Link
          href={`/t/${tenant}/contacto`}
          className="rounded bg-black px-4 py-2 text-sm text-white"
        >
          Pedir propuesta
        </Link>
      </div>

      <div className="grid gap-3 md:grid-cols-2">
        {services.map((s, idx) => (
          <div key={idx} className="rounded-2xl border p-5">
            <div className="text-lg font-medium">{s.title}</div>
            <div className="mt-2 text-sm text-muted-foreground">{s.description}</div>
          </div>
        ))}

        {services.length === 0 ? (
          <div className="rounded-2xl border p-5 text-sm text-muted-foreground">
            No hay servicios configurados todavía.
          </div>
        ) : null}
      </div>
    </main>
  );
}
