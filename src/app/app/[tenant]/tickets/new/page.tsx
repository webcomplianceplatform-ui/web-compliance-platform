import NewTicketForm from "./new-ticket-form";

export default async function Page({
  params,
}: {
  params: Promise<{ tenant: string }>;
}) {
  const { tenant } = await params;
  return <NewTicketForm tenant={tenant} />;
}
