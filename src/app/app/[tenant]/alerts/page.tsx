import { redirect } from "next/navigation";

export default async function AlertsAlias({ params }: { params: Promise<{ tenant: string }> }) {
  const { tenant } = await params;
  redirect(`/app/${tenant}/security/alerts`);
}
