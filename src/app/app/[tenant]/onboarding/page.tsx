import { prisma } from "@/lib/db";
import { requireTenantContextPage } from "@/lib/tenant-auth";
import OnboardingWizard from "./onboarding-wizard";

export default async function TenantOnboardingPage({
  params,
}: {
  params: Promise<{ tenant: string }>;
}) {
  const { tenant } = await params;
  const ctx = await requireTenantContextPage(tenant);

  const [checksTotal, monitorEventsTotal, connectedEvent] = await Promise.all([
    prisma.monitorCheck.count({ where: { tenantId: ctx.tenantId } }),
    prisma.monitorEvent.count({ where: { tenantId: ctx.tenantId } }),
    prisma.auditEvent.findFirst({
      where: { tenantId: ctx.tenantId, action: "evidence.source.connected" },
      orderBy: { createdAt: "desc" },
      select: { createdAt: true },
    }),
  ]);

  return (
    <OnboardingWizard
      tenant={tenant}
      plan={String(ctx.features.plan ?? "")}
      initial={{
        checksTotal,
        monitorEventsTotal,
        connected: !!connectedEvent,
        lastConnectedAt: connectedEvent?.createdAt ? connectedEvent.createdAt.toISOString() : null,
      }}
    />
  );
}
