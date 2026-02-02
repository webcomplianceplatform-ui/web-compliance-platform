import LegalPage from "../../legal/page";

export default async function EvidenceLegalPage({
  params,
}: {
  params: Promise<{ tenant: string }>;
}) {
  // Reuse existing module implementation. Navigation is Evidence-first.
  return <LegalPage params={params} />;
}
