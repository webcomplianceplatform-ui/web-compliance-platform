import { requireTenantContextPage } from "@/lib/tenant-auth";
import PacksClient from "./PacksClient";

export default async function EvidencePacksPage({ params }: { params: Promise<{ tenant: string }> }) {
  const { tenant } = await params;
  await requireTenantContextPage(tenant);

  return <PacksClient tenant={tenant} />;
}
