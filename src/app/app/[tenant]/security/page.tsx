import Link from "next/link";
import { requireTenantContextPage } from "@/lib/tenant-auth";
import { AppCard } from "@/components/app-ui/AppCard";
import ModuleLocked from "@/components/app/ModuleLocked";
import { MfaPolicyCard } from "@/components/app/security/MfaPolicyCard";
import { RecoveryCodesCard } from "@/components/app/security/RecoveryCodesCard";

export default async function SecurityPage({ params }: { params: Promise<{ tenant: string }> }) {
  const { tenant } = await params;
  const ctx = await requireTenantContextPage(tenant);

  const advancedAudit = !!(ctx.features as any)?.raw?.security?.audit;
  const alertsEnabled = !!(ctx.features as any)?.raw?.security?.alerts;

  if (!ctx.features.security) {
    return <ModuleLocked tenant={tenant} module="security" />;
  }

  return (
    <main className="space-y-6">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold">Security</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Control de accesos, roles y auditoría. Seguridad básica pero real.
          </p>
        </div>

        <Link
          href={`/app/${tenant}/users`}
          className="inline-flex items-center rounded-xl border bg-bg2/60 px-4 py-2 text-sm transition hover:bg-bg2/80"
        >
          Manage users →
        </Link>
      </div>

      <div className="grid gap-3 md:grid-cols-4">
        <AppCard className="p-0">
          <MfaPolicyCard
            tenant={tenant}
            canEdit={ctx.isSuperadmin || ctx.role === "OWNER"}
            required={!!ctx.features.mfaRequired}
            planSupportsMfa={!!(ctx.features as any)?.raw?.security?.mfa}
          />
          <div className="border-t px-4 py-3 text-xs text-muted-foreground">
            Account: {(ctx.user as any)?.mfaEnabled ? "MFA enabled" : "MFA not enrolled"}.{" "}
            <Link
              href={`/app/mfa/${tenant}/enroll?callbackUrl=${encodeURIComponent(`/app/${tenant}/security`)}`}
              className="underline"
            >
              {(ctx.user as any)?.mfaEnabled ? "Re-enroll" : "Enroll now"}
            </Link>
          </div>

          <div className="border-t px-4 py-3">
            <RecoveryCodesCard tenant={tenant} enabled={!!(ctx.user as any)?.mfaEnabled} />
          </div>
        </AppCard>

        <AppCard className="p-4">
          <div className="text-xs text-muted-foreground">Roles & access</div>
          <div className="mt-1 text-lg font-semibold">Live</div>
          <div className="mt-1 text-sm text-muted-foreground">
            OWNER / ADMIN / MEMBER, y permisos por área.
          </div>
        </AppCard>

        <AppCard className="p-4">
          <div className="text-xs text-muted-foreground">Audit</div>
          <div className="mt-1 text-lg font-semibold">{advancedAudit ? "Live" : "Planned"}</div>
          <div className="mt-1 text-sm text-muted-foreground">
            {advancedAudit ? (
              <span>
                Registro tenant-scoped de acciones.
                <Link href={`/app/${tenant}/security/audit`} className="ml-2 underline">
                  Open audit →
                </Link>
              </span>
            ) : (
              "Log de acciones: settings, tickets, usuarios, monitor."
            )}
          </div>
        </AppCard>

        <AppCard className="p-4">
          <div className="text-xs text-muted-foreground">Alerts</div>
          <div className="mt-1 text-lg font-semibold">{alertsEnabled ? "Live" : "Planned"}</div>
          <div className="mt-1 text-sm text-muted-foreground">
            {alertsEnabled ? (
              <span>
                Feed de cambios sensibles (plan, legal, dominio, usuarios).
                <Link href={`/app/${tenant}/security/alerts`} className="ml-2 underline">
                  Open alerts →
                </Link>
              </span>
            ) : (
              "Notificaciones de cambios sensibles para evidencias."
            )}
          </div>
        </AppCard>
      </div>

      <AppCard className="p-4">
        <div className="text-sm font-medium">Next steps (implementation)</div>
        <ul className="mt-2 list-disc space-y-1 pl-5 text-sm text-muted-foreground">
          <li>MFA en el panel (NextAuth + TOTP) con enforcement por tenant/rol.</li>
          <li>Mejorar audit: filtros, export, y mostrar meta (diffs) con buen UI.</li>
          <li>Security posture básico: password policy + session timeout.</li>
        </ul>
      </AppCard>
    </main>
  );
}
