import { redirect } from "next/navigation";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { AppNav } from "@/components/app/AppNav";

export default async function TenantAppLayout({
  children,
  params,
}: {
  children: React.ReactNode;
  params: Promise<{ tenant: string }>;
}) {
  const { tenant } = await params;

  const session = await getServerSession(authOptions);
  if (!session?.user?.email) redirect("/login");

  const user = await prisma.user.findUnique({
    where: { email: session.user.email },
    select: { id: true },
  });
  if (!user) redirect("/login");

  const membership = await prisma.userTenant.findFirst({
    where: {
      userId: user.id,
      tenant: { slug: tenant },
    },
    select: { role: true },
  });

  if (!membership) redirect("/login");

return (
  <div className="min-h-screen bg-muted/30">
    <AppNav tenant={tenant} role={membership.role} />
    <div className="mx-auto max-w-6xl p-4 md:p-6">
      <div className="rounded-xl border bg-white p-4 md:p-6">{children}</div>
    </div>
  </div>
);

}
