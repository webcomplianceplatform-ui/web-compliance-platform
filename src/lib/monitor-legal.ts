import { prisma } from "@/lib/db";

export function buildLegalEndpointUrl(tenantSlug: string): string {
  const base = (process.env.NEXT_PUBLIC_BASE_URL || "http://localhost:3000").replace(/\/$/, "");
  // Use one canonical legal page as health indicator
  return `${base}/t/${encodeURIComponent(tenantSlug)}/legal/aviso-legal`;
}

export async function ensureLegalEndpointCheck(args: {
  tenantId: string;
  tenantSlug: string;
}): Promise<{ created: boolean; checkId?: string }> {
  const targetUrl = buildLegalEndpointUrl(args.tenantSlug);

  const existing = await prisma.monitorCheck.findFirst({
    where: { tenantId: args.tenantId, targetUrl },
    select: { id: true },
  });

  if (existing) {
    // Make sure it is tagged as LEGAL, best-effort
    await prisma.monitorCheck.updateMany({
      where: { id: existing.id, tenantId: args.tenantId },
      data: { metaJson: { kind: "LEGAL" } as any },
    });
    return { created: false, checkId: existing.id };
  }

  const check = await prisma.monitorCheck.create({
    data: {
      tenantId: args.tenantId,
      type: "UPTIME" as any,
      targetUrl,
      intervalM: 60,
      enabled: true,
      metaJson: { kind: "LEGAL" } as any,
    },
    select: { id: true },
  });

  return { created: true, checkId: check.id };
}
