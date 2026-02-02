import Link from "next/link";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { redirect } from "next/navigation";
import { AppCard } from "@/components/app-ui/AppCard";
import { appButtonClassName } from "@/components/app-ui/AppButton";
import { ChangePasswordForm } from "./password-form";

export default async function AccountPasswordPage({
  searchParams,
}: {
  searchParams?: Promise<Record<string, string | string[] | undefined>>;
}) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.email) {
    redirect("/login");
  }

  const mustChange = !!((session.user as any).mustChangePassword);

  const sp = (await searchParams) ?? {};
  const retRaw = (sp.next ?? sp.return) as string | string[] | undefined;
  const ret = Array.isArray(retRaw) ? retRaw[0] : retRaw;
  const returnTo = (ret && ret.startsWith("/")) ? ret : "/app";

  return (
    <main className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div>
          <h1 className="text-2xl font-semibold">Account · Password</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Change your password for WebCompliance.
          </p>
        </div>

        <Link className={appButtonClassName({ variant: "secondary" })} href={returnTo}>
          Back
        </Link>
      </div>

      <div className="mx-auto w-full max-w-lg">
        <AppCard className="p-4 md:p-6">
          {mustChange ? (
            <div className="mb-4 rounded-2xl border border-border bg-bg2/40 p-3 text-sm">
              <div className="font-medium">Tu administrador ha reseteado tu contraseña.</div>
              <div className="mt-0.5 text-xs text-muted-foreground">
                Debes establecer una nueva para continuar.
              </div>
            </div>
          ) : null}

          <ChangePasswordForm mustChangePassword={mustChange} />
        </AppCard>
      </div>
    </main>
  );
}
