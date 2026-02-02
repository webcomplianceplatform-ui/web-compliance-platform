import Link from "next/link";
import { prisma } from "@/lib/db";
import { requireSuperadminPage } from "@/lib/superadmin";
import { Badge } from "@/components/ui/badge";
import { ImpersonateButton } from "./ImpersonateButton";
import { PlanEditor } from "./PlanEditor";
import { appButtonClassName } from "@/components/app-ui/AppButton";
import { AppInput } from "@/components/app-ui/AppInput";
import { AppTable, AppTableHead, AppTableRow } from "@/components/app-ui/AppTable";

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
  plan: {
    select: {
      plan: true, // o tier: true / key: true según tu modelo
    },
  },
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

        <div className="flex flex-wrap gap-2">
          <Link className={appButtonClassName({ variant: "secondary" })} href="/app">
            Go to /app
          </Link>
          <Link className={appButtonClassName({ variant: "secondary" })} href="/app/admin/users">
            Users
          </Link>
          <Link className={appButtonClassName({ variant: "primary" })} href="/app/admin/provision">
            Create tenant
          </Link>
        </div>
      </div>

      <form className="flex flex-wrap gap-2" method="get">
        <AppInput
          name="q"
          defaultValue={q}
          placeholder="Search slug or name…"
          className="max-w-md"
        />
        <button className={appButtonClassName({ variant: "primary" })} type="submit">
          Search
        </button>
        <Link className={appButtonClassName({ variant: "secondary" })} href="/app/admin">
          Reset
        </Link>
      </form>

      {/* ✅ AppTable already renders the <table> */}
      {/* ✅ Mobile: cards */}
<div className="grid gap-3 md:hidden">
  {tenants.map((t) => (
    <div
      key={t.id}
      className="rounded-2xl border border-border bg-bg1/80 p-4 backdrop-blur"
    >
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <div className="truncate text-sm font-semibold">{t.name}</div>
          <div className="mt-0.5 truncate font-mono text-xs text-muted-foreground">
            {t.slug}
          </div>
        </div>

        <Badge variant="outline" className="shrink-0 font-mono">
          {t.status}
        </Badge>
      </div>

      <div className="mt-3">
        <div className="text-xs text-muted-foreground">Plan</div>
        <div className="mt-1">
          <PlanEditor tenantId={t.id} />
        </div>
      </div>

      <div className="mt-3 flex flex-wrap gap-2">
        <ImpersonateButton slug={t.slug} />
        <Link
          className="rounded-xl border px-3 py-2 text-sm transition hover:bg-muted/40"
          href={`/t/${t.slug}`}
        >
          Public site
        </Link>
      </div>

      <div className="mt-3 text-xs text-muted-foreground">
        Created: {new Date(t.createdAt).toLocaleString()}
      </div>
    </div>
  ))}

  {tenants.length === 0 && (
    <div className="rounded-2xl border p-6 text-center text-sm text-muted-foreground">
      No tenants found.
    </div>
  )}
</div>

{/* ✅ Desktop: table */}
<div className="hidden md:block">
  <AppTable>
    <AppTableHead>
      <tr>
        <th className="p-3 text-left">Slug</th>
        <th className="p-3 text-left">Name</th>
        <th className="p-3 text-left">Status</th>
        <th className="p-3 text-left">Plan</th>
        <th className="p-3 text-left">Created</th>
        <th className="p-3 text-left">Actions</th>
      </tr>
    </AppTableHead>
    <tbody>
      {tenants.map((t) => (
        <AppTableRow key={t.id}>
          <td className="p-3 font-mono">{t.slug}</td>
          <td className="p-3">{t.name}</td>
          <td className="p-3">
            <Badge variant="outline" className="font-mono">
              {t.status}
            </Badge>
          </td>
          <td className="p-3">
  <div className="relative flex items-center gap-2">
    <Badge variant="outline" className="font-mono">
  {t.plan?.plan ?? "—"}
</Badge>


    <details className="group">
      <summary className="cursor-pointer rounded-xl border px-3 py-2 text-sm transition hover:bg-muted/40 list-none">
        Edit
      </summary>

      <div className="absolute right-0 top-full z-50 mt-2 w-[420px] max-w-[90vw]">
        <div className="rounded-2xl border border-border bg-bg1/90 p-3 shadow-xl backdrop-blur">
          <PlanEditor tenantId={t.id} />
        </div>
      </div>
    </details>
  </div>
</td>

          <td className="p-3">{new Date(t.createdAt).toLocaleString()}</td>
          <td className="p-3">
            <div className="flex flex-wrap gap-2">
              <ImpersonateButton slug={t.slug} />
              <Link
                className="rounded-xl border px-3 py-2 text-sm transition hover:bg-muted/40"
                href={`/t/${t.slug}`}
              >
                Public site
              </Link>
            </div>
          </td>
        </AppTableRow>
      ))}

      {tenants.length === 0 && (
        <tr>
          <td className="p-6 text-center text-sm text-muted-foreground" colSpan={6}>
            No tenants found.
          </td>
        </tr>
      )}
    </tbody>
  </AppTable>
</div>

    </main>
  );
}
