import { redirect } from "next/navigation";

export default async function RedirectLegalConsents({ params }: { params: Promise<{ tenant: string }> }) {
  const { tenant } = await params;
  redirect(`/app/${tenant}/evidence/legal/consents`);
}
