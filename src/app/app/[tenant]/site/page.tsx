import SiteEditorClient from "./site-client";
import { requireTenantContextPage } from "@/lib/tenant-auth";
import ModuleLocked from "@/components/app/ModuleLocked";

export default async function Page({ params }: { params: Promise<{ tenant: string }> }) {
  const { tenant } = await params;
  const ctx = await requireTenantContextPage(tenant);
  if (!ctx.features.web) {
    return <ModuleLocked tenant={tenant} module="web" />;
  }
  return <SiteEditorClient tenant={tenant} />;
}
