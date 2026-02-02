import Link from "next/link";
import { prisma } from "@/lib/db";
import { requireSuperadminPage } from "@/lib/superadmin";
import { appButtonClassName } from "@/components/app-ui/AppButton";
import { AppInput } from "@/components/app-ui/AppInput";
import { AppTable, AppTableHead, AppTableRow } from "@/components/app-ui/AppTable";
import { ResetPasswordButton } from "./ResetPasswordButton";

type SP = Record<string, string | string[] | undefined>;

function first(v: string | string[] | undefined) {
  return Array.isArray(v) ? v[0] : v;
}

export default async function AdminUsersPage({ searchParams }: { searchParams?: Promise<SP> }) {
  await requireSuperadminPage();

  const sp = (await searchParams) ?? {};
  const q = (first(sp.q) ?? "").trim().toLowerCase();

  const users = await prisma.user.findMany({
    where: q
      ? {
          OR: [
            { email: { contains: q, mode: "insensitive" } },
            { name: { contains: q, mode: "insensitive" } },
          ],
        }
      : undefined,
    orderBy: { createdAt: "desc" },
    take: 50,
    select: {
      id: true,
      email: true,
      name: true,
      createdAt: true,
      sessionVersion: true,
    },
  });

  return (
    <main className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div>
          <h1 className="text-2xl font-semibold">Admin · Users</h1>
          <p className="mt-1 text-sm text-muted-foreground">Search users and reset passwords (superadmin only)</p>
        </div>

        <div className="flex flex-wrap gap-2">
          <Link className={appButtonClassName({ variant: "secondary" })} href="/app/admin">
            Back to tenants
          </Link>
        </div>
      </div>

      <form className="flex flex-wrap gap-2" method="get">
        <AppInput name="q" defaultValue={q} placeholder="Search by email or name…" className="max-w-md" />
        <button className={appButtonClassName({ variant: "primary" })} type="submit">
          Search
        </button>
        <Link className={appButtonClassName({ variant: "secondary" })} href="/app/admin/users">
          Reset
        </Link>
      </form>

      <AppTable>
        <AppTableHead>
          <tr>
            <th className="p-3 text-left">Email</th>
            <th className="p-3 text-left">Name</th>
            <th className="p-3 text-left">Created</th>
            <th className="p-3 text-left">Session v</th>
            <th className="p-3 text-left">Actions</th>
          </tr>
        </AppTableHead>
        <tbody>
          {users.map((u) => (
            <AppTableRow key={u.id}>
              <td className="p-3 font-mono text-xs">{u.email}</td>
              <td className="p-3 text-sm">{u.name ?? <span className="text-muted-foreground">—</span>}</td>
              <td className="p-3 whitespace-nowrap text-xs text-muted-foreground">
                {new Date(u.createdAt).toLocaleString()}
              </td>
              <td className="p-3 font-mono text-xs">{u.sessionVersion ?? 0}</td>
              <td className="p-3">
                <ResetPasswordButton email={u.email} />
              </td>
            </AppTableRow>
          ))}

          {users.length === 0 && (
            <tr>
              <td colSpan={5} className="p-6 text-center text-sm text-muted-foreground">
                No users found.
              </td>
            </tr>
          )}
        </tbody>
      </AppTable>

      <div className="text-xs text-muted-foreground">
        Note: Reset generates a temporary password and invalidates existing sessions (sessionVersion++).
      </div>
    </main>
  );
}
