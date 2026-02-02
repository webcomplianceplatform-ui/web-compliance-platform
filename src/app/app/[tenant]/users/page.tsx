import Link from "next/link";
import { prisma } from "@/lib/db";
import { requireTenantContextPage, canManageUsers } from "@/lib/tenant-auth";
import UsersTableClient from "./UsersTableClient";

export default async function UsersPage({
  params,
}: {
  params: Promise<{ tenant: string }>;
}) {
  const { tenant } = await params;

  const ctx = await requireTenantContextPage(tenant);

  const members = await prisma.userTenant.findMany({
    where: { tenantId: ctx.tenantId },
    select: {
      role: true,
      user: { select: { email: true, name: true, id: true, mfaEnabled: true } },
    },
    orderBy: { role: "asc" },
  });

  const canManage = canManageUsers(ctx.role, ctx.isSuperadmin);

  return (
    <main>
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-semibold">Users</h1>

        {canManage ? (
          <Link
            className="rounded-2xl bg-primary px-4 py-2 text-sm font-medium text-primary-foreground transition hover:-translate-y-0.5 hover:shadow-sm"
            href={`/app/${tenant}/users/invite`}
          >
            Invite
          </Link>
        ) : (
          <span className="text-sm text-muted-foreground">
            Solo lectura ({ctx.role})
          </span>
        )}
      </div>

      <UsersTableClient
        tenant={tenant}
        members={members.map((m) => ({
          userId: m.user.id,
          name: m.user.name,
          email: m.user.email,
          role: m.role,
          mfaEnabled: (m.user as any).mfaEnabled ?? false,
        }))}
        myRole={ctx.role as any}
        isSuperadmin={ctx.isSuperadmin as any}
        canManage={canManage}
      />
    </main>
  );
}
