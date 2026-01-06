import Link from "next/link";
import { prisma } from "@/lib/db";
import { requireSuperadminPage } from "@/lib/superadmin"; // el guard que ya tienes
import { Badge } from "@/components/ui/badge";
import { ImpersonateButton } from "./ImpersonateButton";

export default async function AdminTenantsPage({
  searchParams,
}: {
  searchParams?: Promise<Record<string, string | string[] | undefined>>;
}) {
  await requireSuperadminPage();

  const sp = (await searchParams) ?? {};
  const qRaw = Array.isArray(sp.q) ? sp.q[0] : sp.q;
  const q = (qRaw ?? "").trim();

  const tenants = await prisma.tenant.findMany({
    where: q
      ? {
          OR: [
            { slug: { contains: q, mode: "insensitive" } },
            { name: { contains: q, mode: "insensitive" } },
          ],
        }
      : undefined,
    orderBy: { createdAt: "desc" },
    select: {
      id: true,
      slug: true,
      name: true,
      status: true,
      createdAt: true,
    },
  });

  return (
    <main className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div>
          <h1 className="text-2xl font-semibold">Admin · Tenants</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Platform view — all tenants (superadmin only)
          </p>
        </div>

        <Link className="rounded border px-3 py-2 text-sm" href="/app">
          Go to /app
        </Link>
      </div>

      <form className="flex gap-2" method="get">
        <input
          name="q"
          defaultValue={q}
          placeholder="Search slug or name…"
          className="w-full max-w-md rounded border px-3 py-2 text-sm"
        />
        <button className="rounded bg-black px-3 py-2 text-sm text-white" type="submit">
          Search
        </button>
        <Link className="rounded border px-3 py-2 text-sm" href="/app/admin">
          Reset
        </Link>
      </form>

      <div className="overflow-hidden rounded border">
        <table className="w-full text-sm">
          <thead className="border-b bg-muted/50">
            <tr>
              <th className="p-3 text-left">Slug</th>
              <th className="p-3 text-left">Name</th>
              <th className="p-3 text-left">Status</th>
              <th className="p-3 text-left">Created</th>
              <th className="p-3 text-left">Actions</th>
            </tr>
          </thead>
          <tbody>
            {tenants.map((t) => (
              <tr key={t.id} className="border-b last:border-b-0">
                <td className="p-3 font-mono">{t.slug}</td>
                <td className="p-3">{t.name}</td>
                <td className="p-3">
                  <Badge variant="outline" className="font-mono">
                    {t.status}
                  </Badge>
                </td>
                <td className="p-3">{new Date(t.createdAt).toLocaleString()}</td>
                <td className="p-3">
                  <div className="flex flex-wrap gap-2">
                    <ImpersonateButton slug={t.slug} />
                    <Link className="rounded border px-3 py-2 text-sm" href={`/t/${t.slug}`}>
                      Public site
                    </Link>
                  </div>
                </td>
              </tr>
            ))}

            {tenants.length === 0 && (
              <tr>
                <td className="p-6 text-center text-sm text-muted-foreground" colSpan={5}>
                  No tenants found.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </main>
  );
}
