import Link from "next/link";
import { prisma } from "@/lib/db";
import { requireTenantContextPage } from "@/lib/tenant-auth";
import ModuleLocked from "@/components/app/ModuleLocked";
import { AppCard } from "@/components/app-ui/AppCard";
import { appButtonClassName } from "@/components/app-ui/AppButton";
import { Badge } from "@/components/ui/badge";

const TAKE = 100;

type SP = Record<string, string | string[] | undefined>;

function first(v: string | string[] | undefined) {
  return Array.isArray(v) ? v[0] : v;
}

export default async function SecurityAlertsPage({
  params,
  searchParams,
}: {
  params: Promise<{ tenant: string }>;
  searchParams?: Promise<SP>;
}) {
  const { tenant } = await params;
  const sp = (await searchParams) ?? {};

  const ctx = await requireTenantContextPage(tenant);
  const alertsEnabled = !!(ctx.features as any)?.raw?.security?.alerts;

  if (!ctx.features.security || !alertsEnabled) {
    return <ModuleLocked tenant={tenant} module="security" />;
  }

  const level = (first(sp.level) ?? "").trim().toUpperCase();

  const where: any = {
    tenantId: ctx.tenantId,
    ...(level && ["INFO", "WARN"].includes(level) ? { level } : {}),
  };

  const alerts = await prisma.securityAlert.findMany({
    where,
    orderBy: { createdAt: "desc" },
    take: TAKE,
    select: {
      id: true,
      createdAt: true,
      level: true,
      message: true,
      auditId: true,
    },
  });

  return (
    <main className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div>
          <h1 className="text-2xl font-semibold">Security · Alerts</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Showing up to {TAKE} latest alerts
          </p>
        </div>

        <div className="flex flex-wrap gap-2">
          <Link className={appButtonClassName({ variant: "secondary" })} href={`/app/${tenant}/security`}>
            Back to Security
          </Link>
        </div>
      </div>

      <form method="get">
        <AppCard className="flex flex-wrap items-center gap-2 p-3">
          <label className="text-xs">
            Level
            <select
              name="level"
              defaultValue={level}
              className="mt-1 w-[160px] rounded-xl border border-border bg-bg2/50 px-3 py-2 text-sm text-foreground backdrop-blur transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand/30 focus-visible:border-brand2"
            >
              <option value="">All</option>
              <option value="INFO">INFO</option>
              <option value="WARN">WARN</option>
            </select>
          </label>

          <button className={appButtonClassName({ variant: "primary" })} type="submit">
            Apply
          </button>

          <Link className={appButtonClassName({ variant: "secondary" })} href={`/app/${tenant}/security/alerts`}>
            Reset
          </Link>
        </AppCard>
      </form>

      <div className="grid gap-3">
        {alerts.map((a) => (
          <AppCard key={a.id} className="p-4">
            <div className="flex flex-wrap items-start justify-between gap-2">
              <div className="min-w-0">
                <div className="text-sm font-medium truncate">{a.message}</div>
                <div className="mt-1 text-xs text-muted-foreground">
                  {new Date(a.createdAt).toLocaleString()}
                  {a.auditId ? (
                    <span className="ml-2 font-mono">audit: {a.auditId}</span>
                  ) : null}
                </div>
              </div>
              <Badge variant={a.level === "WARN" ? "warning" : "outline"} className="font-mono">
                {a.level}
              </Badge>
            </div>
          </AppCard>
        ))}

        {alerts.length === 0 && (
          <AppCard className="p-6 text-center text-sm text-muted-foreground">
            No alerts yet.
          </AppCard>
        )}
      </div>
    </main>
  );
}
