import { getPublicTenant } from "@/lib/public-tenant";
import type { Metadata } from "next";
export async function generateMetadata({ params }: { params: Promise<{ tenant: string }> }): Promise<Metadata> {
  const { tenant } = await params;
  return { title: `Servicios | ${tenant}` };
}

export default async function AboutPage({
  params,
}: {
  params: Promise<{ tenant: string }>;
}) {
  const { tenant } = await params;
  const data = await getPublicTenant(tenant);
  if (!data) return <div>Tenant not found</div>;

  const brandName = data.theme.brandName ?? data.tenant.name;

  return (
    <main className="space-y-4">
      <h1 className="text-2xl font-semibold">Sobre {brandName}</h1>

      <p className="text-sm text-muted-foreground">
        Página “Sobre” (MVP). Aquí meteremos contenido editable por cliente (CMS) o desde Settings.
      </p>

      <div className="rounded-xl border p-4 text-sm">
        <div className="font-medium">Nuestra propuesta</div>
        <ul className="mt-2 list-disc space-y-1 pl-5 text-muted-foreground">
          <li>Web corporativa rápida (SEO-ready)</li>
          <li>Base legal (privacidad / cookies / términos)</li>
          <li>Soporte por tickets + monitorización</li>
        </ul>
      </div>
    </main>
  );
}
