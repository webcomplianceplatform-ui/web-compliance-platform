import SettingsClient from "./settings-client";

export default async function Page({
  params,
}: {
  params: Promise<{ tenant: string }>;
}) {
  const { tenant } = await params;
  return <SettingsClient tenant={tenant} />;
}
