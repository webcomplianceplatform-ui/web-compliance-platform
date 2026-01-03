import { prisma } from "@/lib/db";

export default async function TenantPublicPage({
  params,
}: {
  params: { tenant: string };
}) {
  const tenantRow = await prisma.tenant.findUnique({
    where: { slug: params.tenant },
  });

  if (!tenantRow) {
    return <main className="p-6">Tenant no encontrado</main>;
  }

  return (
    <main className="mx-auto max-w-3xl p-6">
      <h1 className="text-2xl font-semibold">{tenantRow.name}</h1>
      <p className="mt-2 text-muted-foreground">
        Tenant: <span className="font-mono">{tenantRow.slug}</span>
      </p>
    </main>
  );
}
