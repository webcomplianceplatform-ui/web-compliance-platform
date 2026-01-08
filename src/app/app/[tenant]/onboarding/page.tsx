import Link from "next/link";
import { prisma } from "@/lib/db";
import { requireTenantContextPage, canManageUsers, canManageTickets, canManageSettings } from "@/lib/tenant-auth";

export default async function TenantOnboardingPage(props: any) {
  const tenant = props?.params?.tenant as string;

  const ctx = await requireTenantContextPage(tenant);
  const canTickets = canManageTickets(ctx.role);
  const canUsers = canManageUsers(ctx.role);
  const canSettings = canManageSettings(ctx.role);

  const [tickets, checks, events, members] = await Promise.all([
    prisma.ticket.count({ where: { tenantId: ctx.tenantId } }),
    prisma.monitorCheck.count({ where: { tenantId: ctx.tenantId } }),
    prisma.monitorEvent.count({ where: { tenantId: ctx.tenantId } }),
    prisma.userTenant.count({ where: { tenantId: ctx.tenantId } }),
  ]);

  const steps = {
    ticket: tickets > 0,
    monitor: checks > 0,
    monitorEvents: events > 0,
    users: members > 1,
  };

  const items = [
    {
      title: "Crea tu primer ticket",
      desc: "Registra incidencias, cambios legales o SEO.",
      href: `/app/${tenant}/tickets/new`,
      done: steps.ticket,
      show: true,
    },
    {
      title: "Añade un monitor (UPTIME o SSL)",
      desc: "Empieza a registrar disponibilidad y SSL.",
      href: `/app/${tenant}/monitor`,
      done: steps.monitor,
      show: true,
    },
    {
      title: "Comprueba que ya hay eventos",
      desc: "Después de Run now o el cron diario, aparecerán eventos.",
      href: `/app/${tenant}/monitor`,
      done: steps.monitorEvents,
      show: true,
    },
    {
      title: "Invita a un usuario",
      desc: "Añade miembros y asigna roles.",
      href: `/app/${tenant}/users`,
      done: steps.users,
      show: canUsers,
    },
    {
      title: "Conecta un dominio (opcional)",
      desc: "Puedes hacerlo más tarde.",
      href: `/app/${tenant}/settings/domain`,
      done: false,
      show: canSettings,
    },
  ].filter((x) => x.show);

  const completed = items.filter((i) => i.done).length;

  return (
    <main className="mx-auto max-w-2xl p-6 space-y-6">
      <div>
        <h1 className="text-2xl font-semibold">Onboarding</h1>
        <p className="mt-2 text-sm text-muted-foreground">
          Completa estos pasos para dejar el tenant operativo. ({completed}/{items.length})
        </p>
      </div>

      <div className="space-y-3">
        {items.map((it) => (
          <div key={it.title} className="rounded border p-4">
            <div className="flex items-start justify-between gap-4">
              <div>
                <div className="font-medium">{it.done ? "✅" : "⬜"} {it.title}</div>
                <div className="mt-1 text-sm text-muted-foreground">{it.desc}</div>
              </div>
              <Link className="rounded bg-black px-3 py-2 text-sm text-white" href={it.href}>
                Ir
              </Link>
            </div>
          </div>
        ))}
      </div>

      <div className="flex flex-wrap gap-2">
        <Link className="rounded border px-3 py-2 text-sm" href={`/app/${tenant}`}>
          Ir al dashboard
        </Link>
        <Link className="rounded border px-3 py-2 text-sm" href="/app">
          Cambiar de tenant
        </Link>
      </div>
    </main>
  );
}
