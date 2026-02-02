import { redirect } from "next/navigation";

export default async function LegacyTenantMfaVerify({ params, searchParams }: any) {
  const { tenant } = await params;
  const cb = searchParams?.callbackUrl ? String(searchParams.callbackUrl) : `/app/${tenant}`;
  redirect(`/app/mfa/${tenant}/verify?callbackUrl=${encodeURIComponent(cb)}`);
}
