import Link from "next/link";
import { prisma } from "@/lib/db";
import { requireTenantContextPage, canManageUsers } from "@/lib/tenant-auth";
import { AppCard } from "@/components/app-ui/AppCard";

function isAgency(plan?: string) {
  return String(plan ?? "").toUpperCase() === "ASSURED";
}

export default async function ClientsPage({ params }: { params: Promise<{ tenant: string }> }) {
  const { tenant } = await params;
  const ctx = await requireTenantContextPage(tenant);

  const agency = isAgency(ctx.features.plan);
  const canManage = canManageUsers(ctx.role, ctx.isSuperadmin);

  if (!agency) {
    return (
      <main className="space-y-6">
        <div>
          <h1 className="text-2xl font-semibold">Clients</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Agency mode lets you manage client users under your tenant.
          </p>
        </div>

        <AppCard className="p-4">
          <div className="text-sm font-semibold">Agency feature</div>
          <div className="mt-1 text-sm text-muted-foreground">
            Client management is available on the <span className="font-semibold text-foreground">Agency</span> plan.
          </div>
          <div className="mt-4">
            <Link
              href={`/app/${tenant}/settings?tab=billing`}
              className="inline-flex items-center rounded-xl bg-primary px-4 py-2 text-sm text-primary-foreground transition hover:opacity-90"
            >
              Request upgrade
            </Link>
          </div>
        </AppCard>
      </main>
    );
  }

  const clients = await prisma.userTenant.findMany({
    where: { tenantId: ctx.tenantId, role: "CLIENT" },
    select: { createdAt: true, user: { select: { id: true, email: true, name: true, mfaEnabled: true } } },
    orderBy: { createdAt: "desc" },
  });

  return (
    <main className="space-y-6">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold">Clients</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Client users (role=CLIENT) under this tenant. Use this for Agency workflows.
          </p>
        </div>

        {canManage ? (
          <Link
            href={`/app/${tenant}/users/invite`}
            className="inline-flex items-center rounded-xl bg-primary px-4 py-2 text-sm text-primary-foreground transition hover:opacity-90"
          >
            Add client
          </Link>
        ) : (
          <span className="text-sm text-muted-foreground">Solo lectura ({ctx.role})</span>
        )}
      </div>

      <AppCard className="p-4">
        <div className="text-sm font-semibold">Client list</div>
        <div className="mt-3 overflow-hidden rounded-xl border">
          <table className="w-full text-sm">
            <thead className="bg-bg2/40 text-xs text-muted-foreground">
              <tr>
                <th className="px-3 py-2 text-left">Name</th>
                <th className="px-3 py-2 text-left">Email</th>
                <th className="px-3 py-2 text-left">MFA</th>
                <th className="px-3 py-2 text-left">Added</th>
              </tr>
            </thead>
            <tbody>
              {clients.length === 0 ? (
                <tr>
                  <td className="px-3 py-3 text-muted-foreground" colSpan={4}>
                    No client users yet. Add one to start an Agency workflow.
                  </td>
                </tr>
              ) : (
                clients.map((c) => (
                  <tr key={c.user.id} className="border-t">
                    <td className="px-3 py-2">{c.user.name ?? "—"}</td>
                    <td className="px-3 py-2">{c.user.email}</td>
                    <td className="px-3 py-2">{(c.user as any).mfaEnabled ? "Enabled" : "—"}</td>
                    <td className="px-3 py-2">{new Date(c.createdAt).toLocaleString()}</td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        <div className="mt-3 text-xs text-muted-foreground">
          Tip: manage all users (admins/viewers) in <Link className="underline" href={`/app/${tenant}/users`}>Users</Link>.
        </div>
      </AppCard>
    </main>
  );
}
