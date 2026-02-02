import Link from "next/link";
import { prisma } from "@/lib/db";
import {
  canManageSettings,
  canManageTickets,
  canManageUsers,
  requireTenantContextPage,
} from "@/lib/tenant-auth";
import { redirect } from "next/navigation";
import OnboardingCard from "@/components/app/OnboardingCard";
import { AppCard } from "@/components/app-ui/AppCard";
import { appButtonClassName } from "@/components/app-ui/AppButton";

const DAYS_7_MS = 7 * 24 * 60 * 60 * 1000;

export default async function TenantHome({
  params,
}: {
  params: Promise<{ tenant: string }>;
}) {
  const { tenant } = await params;

  const ctx = await requireTenantContextPage(tenant);
  const isTicketManager = canManageTickets(ctx.role);
  const isUserManager = canManageUsers(ctx.role, ctx.isSuperadmin);
  const isSettingsManager = canManageSettings(ctx.role, ctx.isSuperadmin);

  const t = await prisma.tenant.findUnique({
    where: { id: ctx.tenantId },
    select: {
      id: true,
      name: true,
      slug: true,
      status: true,
      customDomain: true,
      customDomainVerifiedAt: true,
    },
  });
  if (!t) return <div>Tenant not found</div>;

  const ticketScopeWhere = isTicketManager
    ? { tenantId: t.id }
    : { tenantId: t.id, createdById: ctx.user.id };

  const [totalTickets, last7d, checksTotal, checksEnabled, membersCount, lastConnected] = await Promise.all([
    prisma.ticket.count({ where: ticketScopeWhere }),
    prisma.ticket.count({
      where: { ...ticketScopeWhere, createdAt: { gte: new Date(Date.now() - DAYS_7_MS) } },
    }),
    prisma.monitorCheck.count({ where: { tenantId: t.id } }),
    prisma.monitorCheck.count({ where: { tenantId: t.id, enabled: true } }),
    prisma.userTenant.count({ where: { tenantId: t.id } }).catch(() => 0),
    prisma.auditEvent.findFirst({
      where: { tenantId: t.id, action: "evidence.source.connected" },
      orderBy: { createdAt: "desc" },
      select: { id: true },
    }).catch(() => null),
  ]);

  // --- Onboarding / Setup Progress ---
  const setup = {
    hasTicket: totalTickets > 0,
    hasMonitoring: checksTotal > 0,
    hasVerifiedDomain: Boolean(t.customDomain && t.customDomainVerifiedAt),
    hasInvitedUser: membersCount >= 2,
  };

  const completedSteps = Object.values(setup).filter(Boolean).length;
  const totalSteps = 4;

  type NextStep = {
    title: string;
    description: string;
    actionLabel: string;
    actionHref: string;
  } | null;

  let nextStep: NextStep = null;
  if (!setup.hasTicket) {
    nextStep = {
      title: "Create your first ticket",
      description:
        "Tickets are the core workflow. Track leads, incidents, requests and legal tasks here.",
      actionLabel: "Create ticket",
      actionHref: `/app/${tenant}/tickets/new`,
    };
  } else if (!setup.hasMonitoring) {
    nextStep = {
      title: "Enable monitoring",
      description:
        "Add Uptime or SSL checks and let the daily cron generate monitoring events automatically.",
      actionLabel: "Open monitoring",
      actionHref: `/app/${tenant}/monitor`,
    };
  } else if (!setup.hasInvitedUser && isUserManager) {
    nextStep = {
      title: "Invite a teammate",
      description:
        "Add users to this tenant (Owner/Admin/Client/Viewer) so they can collaborate.",
      actionLabel: "Manage users",
      actionHref: `/app/${tenant}/users`,
    };
  } else if (!setup.hasVerifiedDomain && isSettingsManager) {
    nextStep = {
      title: "Connect your domain",
      description:
        "Set a custom domain and verify it (CNAME target) to enable multi-domain access safely.",
      actionLabel: "Configure domain",
      actionHref: `/app/${tenant}/settings`,
    };
  }

  const isEmptyTenant = totalTickets === 0 && checksTotal === 0 && !lastConnected;
  const canOnboard = isTicketManager || isUserManager || isSettingsManager;
  if (canOnboard && isEmptyTenant) {
    redirect(`/app/${tenant}/onboarding`);
  }

  const quickActions = [
    { label: "Create ticket", href: `/app/${tenant}/tickets/new`, show: true },
    { label: "Tickets", href: `/app/${tenant}/tickets`, show: true },
    { label: "Monitoring", href: `/app/${tenant}/monitor`, show: true },
    { label: "Users", href: `/app/${tenant}/users`, show: isUserManager },
    { label: "Settings", href: `/app/${tenant}/settings`, show: isSettingsManager },
  ].filter((a) => a.show);

  return (
    <main className="space-y-6">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold">{t.name}</h1>
          <div className="mt-1 flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
            <span>
              Tenant: <span className="font-mono">{t.slug}</span>
            </span>
            <span className="opacity-60">·</span>
            <span>
              Status: <span className="font-mono">{String(t.status)}</span>
            </span>
            {!isTicketManager ? (
              <>
                <span className="opacity-60">·</span>
                <span>
                  Scope: <span className="font-mono">my tickets</span>
                </span>
              </>
            ) : null}
          </div>
        </div>

        <div className="flex flex-wrap gap-2">
          {quickActions.map((a) => (
            <Link
              key={a.href}
              href={a.href}
              className={appButtonClassName({ variant: "secondary" })}
            >
              {a.label}
            </Link>
          ))}
          <a
            href={`/t/${tenant}`}
            target="_blank"
            className={appButtonClassName({ variant: "ghost", className: "border border-border bg-bg2/20" })}
          >
            Public site ↗
          </a>
        </div>
      </div>

      {/* Setup progress (hide when completed) */}
      {completedSteps < totalSteps ? (
        <AppCard className="p-5">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <div>
              <div className="text-sm font-semibold">Setup progress</div>
              <div className="mt-1 text-xs text-muted-foreground">
                {completedSteps} / {totalSteps} completed
              </div>
            </div>

            <div className="rounded-full border border-border bg-bg2/50 px-2 py-1 text-xs font-mono text-muted-foreground">
              {Math.round((completedSteps / totalSteps) * 100)}%
            </div>
          </div>

          <div className="mt-4 h-2 w-full overflow-hidden rounded-full bg-muted">
            <div
              className="h-2 rounded-full bg-[hsl(var(--brand))] transition-all"
              style={{ width: `${(completedSteps / totalSteps) * 100}%` }}
            />
          </div>

          <div className="mt-4 grid gap-2 text-sm md:grid-cols-2">
            <div className="flex items-center gap-2">
              <span className="text-base">{setup.hasTicket ? "✅" : "⬜"}</span>
              <span>First ticket created</span>
            </div>
            <div className="flex items-center gap-2">
              <span className="text-base">{setup.hasMonitoring ? "✅" : "⬜"}</span>
              <span>Monitoring enabled</span>
            </div>
            <div className="flex items-center gap-2">
              <span className="text-base">{setup.hasInvitedUser ? "✅" : "⬜"}</span>
              <span>Teammate invited</span>
            </div>
            <div className="flex items-center gap-2">
              <span className="text-base">{setup.hasVerifiedDomain ? "✅" : "⬜"}</span>
              <span>Domain verified</span>
            </div>
          </div>
        </AppCard>
      ) : null}

      {nextStep ? (
        <OnboardingCard
          title={nextStep.title}
          description={nextStep.description}
          actionLabel={nextStep.actionLabel}
          actionHref={nextStep.actionHref}
        />
      ) : null}

      {/* At-a-glance KPIs */}
      <section className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
        <AppCard className="p-4">
          <div className="text-xs text-muted-foreground">Tickets</div>
          <div className="mt-1 text-2xl font-semibold">{totalTickets}</div>
          <div className="mt-1 text-xs text-muted-foreground">Total in this tenant</div>
        </AppCard>
        <AppCard className="p-4">
          <div className="text-xs text-muted-foreground">New tickets</div>
          <div className="mt-1 text-2xl font-semibold">{last7d}</div>
          <div className="mt-1 text-xs text-muted-foreground">Last 7 days</div>
        </AppCard>
        <AppCard className="p-4">
          <div className="text-xs text-muted-foreground">Monitoring checks</div>
          <div className="mt-1 text-2xl font-semibold">
            {checksEnabled} <span className="text-muted-foreground">/ {checksTotal}</span>
          </div>
          <div className="mt-1 text-xs text-muted-foreground">Enabled / total</div>
        </AppCard>
        <AppCard className="p-4">
          <div className="text-xs text-muted-foreground">Members</div>
          <div className="mt-1 text-2xl font-semibold">{membersCount}</div>
          <div className="mt-1 text-xs text-muted-foreground">
            Domain: {setup.hasVerifiedDomain ? "verified" : "not verified"}
          </div>
        </AppCard>
      </section>
    </main>
  );
}
