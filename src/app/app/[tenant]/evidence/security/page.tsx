import SecurityPage from "../../security/page";

export default async function EvidenceSecurityPage({
  params,
}: {
  params: Promise<{ tenant: string }>;
}) {
  // Reuse existing module implementation. Navigation is Evidence-first.
  return <SecurityPage params={params} />;
}
