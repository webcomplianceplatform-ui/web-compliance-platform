import { redirect } from "next/navigation";

export default async function DomainsAlias({ params }: { params: Promise<{ tenant: string }> }) {
  const { tenant } = await params;
  redirect(`/app/${tenant}/settings?tab=domain`);
}
