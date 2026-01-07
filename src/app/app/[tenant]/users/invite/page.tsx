import InviteClient from "./invite-client";

type PageProps = {
  params: Promise<{ tenant: string }>;
};

export default async function InvitePage({ params }: PageProps) {
  const { tenant } = await params;
  return <InviteClient tenantSlug={tenant} />;
}
