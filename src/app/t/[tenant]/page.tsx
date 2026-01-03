export default async function TenantPublicPage({
  params,
}: {
  params: { tenant: string };
}) {
  return (
    <main className="mx-auto max-w-3xl p-6">
      <h1 className="text-2xl font-semibold">Web pública</h1>
      <p className="mt-2 text-muted-foreground">
        Tenant: <span className="font-mono">{params.tenant}</span>
      </p>
    </main>
  );
}
