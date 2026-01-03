import { redirect } from "next/navigation";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/db";

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
    <div className="min-h-screen">
      <div className="border-b p-4 text-sm">
        Tenant: <span className="font-mono">{tenant}</span> — Role:{" "}
        <span className="font-mono">{membership.role}</span>
      </div>
      <div className="p-6">{children}</div>
    </div>
  );
}
