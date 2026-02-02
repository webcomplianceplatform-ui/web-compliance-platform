import { AppNav } from "@/components/app/AppNav";
import { requireTenantContextPage } from "@/lib/tenant-auth";
import { ImpersonationBanner } from "@/components/app/ImpersonationBanner";
import { AppCard } from "@/components/app-ui/AppCard";
import { redirect } from "next/navigation";

export default async function TenantAppLayout({
  children,
  params,
}: {
  children: React.ReactNode;
  params: Promise<{ tenant: string }>;
}) {
  const { tenant } = await params;

  const ctx = await requireTenantContextPage(tenant);

  // Force password change after an admin reset (applies to any tenant routes).
  if ((ctx.user as any)?.mustChangePassword) {
    redirect(`/app/account/password?next=${encodeURIComponent(`/app/${tenant}`)}`);
  }

  return (
    <div className="min-h-screen">
      <div className="mx-auto flex max-w-7xl flex-col gap-4 px-3 py-3 md:flex-row md:px-4 md:py-4">
        <AppNav tenant={tenant} role={ctx.role} user={ctx.user} features={ctx.features} />

        <main className="min-w-0 flex-1">
          {ctx.isImpersonating ? <ImpersonationBanner tenant={tenant} /> : null}
          <AppCard className="p-4 md:p-6">{children}</AppCard>
        </main>
      </div>
    </div>
  );
}
