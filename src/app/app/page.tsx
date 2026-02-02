import { getServerSession } from "next-auth";
import { redirect } from "next/navigation";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { isSuperadminEmail } from "@/lib/superadmin";
import TenantSwitcherClient, { TenantListItem } from "./_components/TenantSwitcherClient";

export default async function AppHome() {
  const session = await getServerSession(authOptions);
  if (!session?.user?.email) redirect("/login");

  // Force password change after an admin reset.
  if ((session.user as any)?.mustChangePassword) {
    redirect("/app/account/password");
  }

  if (isSuperadminEmail(session.user.email)) redirect("/app/admin");

  const user = await prisma.user.findUnique({
    where: { email: session.user.email },
    select: { id: true },
  });
  if (!user) redirect("/login");

  const memberships = await prisma.userTenant.findMany({
    where: { userId: user.id },
    select: {
      role: true,
      tenant: { select: { slug: true, name: true, status: true } },
    },
    orderBy: { createdAt: "asc" },
  });

  const tenants: TenantListItem[] = memberships.map((m) => ({
    slug: m.tenant.slug,
    name: m.tenant.name,
    status: m.tenant.status,
    role: m.role,
  }));

  // Conveniencia: si solo hay 1 tenant, entra directo
  if (tenants.length === 1) redirect(`/app/${tenants[0].slug}`);
if (tenants.length === 0) redirect("/app/no-access");

  return <TenantSwitcherClient tenants={tenants} />;
}
