import { redirect } from "next/navigation";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/db";
import Link from "next/link";

export default async function UsersPage({
  params,
}: {
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
    where: { userId: user.id, tenant: { slug: tenant } },
    select: { role: true },
  });
  if (!membership) redirect("/login");

  const members = await prisma.userTenant.findMany({
    where: { tenant: { slug: tenant } },
    select: {
      role: true,
      user: { select: { email: true, name: true, id: true } },
    },
    orderBy: { role: "asc" },
  });

  const canManage = membership.role === "OWNER" || membership.role === "ADMIN";

  return (
    <main>
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-semibold">Users</h1>

        {canManage ? (
          <Link
            className="rounded border px-3 py-1 text-sm"
            href={`/app/${tenant}/users/invite`}
          >
            Invite
          </Link>
        ) : (
          <span className="text-sm text-muted-foreground">
            Solo lectura ({membership.role})
          </span>
        )}
      </div>

      <div className="mt-4 overflow-hidden rounded border">
        <table className="w-full text-sm">
          <thead className="border-b bg-muted/50">
            <tr>
              <th className="p-3 text-left">Name</th>
              <th className="p-3 text-left">Email</th>
              <th className="p-3 text-left">Role</th>
            </tr>
          </thead>
          <tbody>
            {members.map((m) => (
              <tr key={m.user.id} className="border-b last:border-b-0">
                <td className="p-3">{m.user.name ?? "—"}</td>
                <td className="p-3 font-mono">{m.user.email}</td>
                <td className="p-3 font-mono">{m.role}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </main>
  );
}
