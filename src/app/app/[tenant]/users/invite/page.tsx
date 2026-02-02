import InviteClient from "./invite-client";
import { requireTenantContextPage } from "@/lib/tenant-auth";

type PageProps = {
  params: Promise<{ tenant: string }>;
};

export default async function InvitePage({ params }: PageProps) {
  const { tenant } = await params;
  const ctx = await requireTenantContextPage(tenant);
  return <InviteClient tenantSlug={tenant} myRole={ctx.role as any} isSuperadmin={ctx.isSuperadmin as any} />;
}
