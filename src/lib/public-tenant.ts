import { prisma } from "@/lib/db";
import { defaultTheme, TenantTheme } from "@/lib/theme";

export async function getPublicTenant(tenantSlug: string) {
  const t = await prisma.tenant.findUnique({
    where: { slug: tenantSlug },
    select: { id: true, slug: true, name: true, themeJson: true },
  });
  if (!t) return null;

  const theme = ({ ...defaultTheme, ...(t.themeJson as any) } as TenantTheme);
  return { tenant: t, theme };
}
