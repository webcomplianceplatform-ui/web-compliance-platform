import { AppNav } from "@/components/app/AppNav";
import { requireTenantContextPage } from "@/lib/tenant-auth";
import { ImpersonationBanner } from "@/components/app/ImpersonationBanner";

export default async function TenantAppLayout({
  children,
  params,
}: {
  children: React.ReactNode;
  params: Promise<{ tenant: string }>;
}) {
  const { tenant } = await params;

  const ctx = await requireTenantContextPage(tenant);

  return (
    <div className="min-h-screen bg-muted/30">
      <AppNav tenant={tenant} role={ctx.role} />
      {ctx.isImpersonating ? <ImpersonationBanner tenant={tenant} /> : null}
      <div className="mx-auto max-w-6xl p-4 md:p-6">
        <div className="rounded-xl border bg-white p-4 md:p-6">{children}</div>
      </div>
    </div>
  );

}
