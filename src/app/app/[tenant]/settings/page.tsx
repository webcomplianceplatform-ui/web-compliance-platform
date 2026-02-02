import SettingsClient from "./settings-client";
import { requireTenantContextPage, canManageSite } from "@/lib/tenant-auth";
import { redirect } from "next/navigation";

export default async function Page({
  params,
}: {
  params: Promise<{ tenant: string }>;
}) {
  const { tenant } = await params;
  const ctx = await requireTenantContextPage(tenant);
  if (!canManageSite(ctx.role) && !ctx.isSuperadmin) redirect(`/app/${tenant}`);
  return <SettingsClient tenant={tenant} isSuperadmin={ctx.isSuperadmin} />;
}
