import Link from "next/link";
import { prisma } from "@/lib/db";
import { requireTenantContextPage } from "@/lib/tenant-auth";
import { AppCard } from "@/components/app-ui/AppCard";
import ModuleLocked from "@/components/app/ModuleLocked";

export default async function LegalPage({ params }: { params: Promise<{ tenant: string }> }) {
  const { tenant } = await params;
  const ctx = await requireTenantContextPage(tenant);

  if (!ctx.features.legal) {
    return <ModuleLocked tenant={tenant} module="legal" />;
  }

  const t = await prisma.tenant.findUnique({
    where: { id: ctx.tenantId },
    select: { themeJson: true },
  });

  const theme: any = (t?.themeJson ?? {}) as any;
  const hasCompany =
    !!theme?.legal?.companyName || !!theme?.legal?.cifNif || !!theme?.legal?.email || !!theme?.legal?.address;
  const hasDocs = !!theme?.legalDocs?.avisoLegal || !!theme?.legalDocs?.privacidad || !!theme?.legalDocs?.cookies;

  return (
    <main className="space-y-6">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold">Legal</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Textos legales, datos de la empresa y trazabilidad (por tenant).
          </p>
        </div>

        <Link
          href={`/app/${tenant}/settings?tab=legal`}
          className="inline-flex items-center rounded-xl border bg-bg2/60 px-4 py-2 text-sm transition hover:bg-bg2/80"
        >
          Open legal settings →
        </Link>
      </div>

      <div className="grid gap-3 md:grid-cols-3">
        <AppCard className="p-4">
          <div className="text-xs text-muted-foreground">Company details</div>
          <div className="mt-1 text-lg font-semibold">{hasCompany ? "Configured" : "Missing"}</div>
          <div className="mt-1 text-sm text-muted-foreground">
            Nombre, CIF/NIF, dirección, email…
          </div>
        </AppCard>

        <AppCard className="p-4">
          <div className="text-xs text-muted-foreground">Legal documents</div>
          <div className="mt-1 text-lg font-semibold">{hasDocs ? "Configured" : "Using defaults"}</div>
          <div className="mt-1 text-sm text-muted-foreground">
            Aviso legal, Privacidad y Cookies (editable).
          </div>
        </AppCard>

        <AppCard className="p-4">
          <div className="text-xs text-muted-foreground">Updates & traceability</div>
          <div className="mt-1 text-lg font-semibold">Planned</div>
          <div className="mt-1 text-sm text-muted-foreground">
            Historial de cambios, versiones y “last updated”.
          </div>
        </AppCard>
      </div>

      <AppCard className="p-4">
        <div className="text-sm font-medium">Quick links</div>
        <div className="mt-3 flex flex-wrap gap-2">
          <Link className="inline-flex rounded-xl border bg-bg2/60 px-3 py-2 text-sm hover:bg-bg2/80" href={`/app/${tenant}/settings?tab=legal`}>Legal</Link>
          <Link className="inline-flex rounded-xl border bg-bg2/60 px-3 py-2 text-sm hover:bg-bg2/80" href={`/app/${tenant}/settings?tab=public`}>Branding</Link>
          <Link className="inline-flex rounded-xl border bg-bg2/60 px-3 py-2 text-sm hover:bg-bg2/80" href={`/app/${tenant}/tickets?type=LEGAL`}>Legal tickets</Link>
        </div>
      </AppCard>
    </main>
  );
}
