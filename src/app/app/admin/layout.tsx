import { getServerSession } from "next-auth";
import { notFound, redirect } from "next/navigation";
import Link from "next/link";
import { cookies } from "next/headers";

import { authOptions } from "@/lib/auth";
import { isSuperadminEmail } from "@/lib/superadmin";
import { prisma } from "@/lib/db";
import { mfaCookieNameGlobal, verifyMfaCookie, MFA_GLOBAL_TENANT_ID } from "@/lib/mfa";
import { AdminMobileNav } from "@/app/app/admin/AdminMobileNav";

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  const session = await getServerSession(authOptions);
  const email = session?.user?.email ?? null;

  // If the user is not logged in, send them to login and preserve the return URL.
  if (!session) redirect(`/login?callbackUrl=${encodeURIComponent("/app/admin")}`);

  // Force password change after an admin reset.
  if ((session.user as any)?.mustChangePassword) {
    redirect(`/app/account/password?next=${encodeURIComponent("/app/admin")}`);
  }

  // Logged in but not superadmin -> hide the existence of /admin.
  if (!isSuperadminEmail(email)) notFound();

  // ✅ Superadmin must pass GLOBAL MFA to access /app/admin (prevents blind impersonation).
  // We keep it global (not tenant-scoped) so the superadmin can manage multiple tenants safely.
  const user = await prisma.user.findUnique({
    where: { email: String(email) },
    select: { id: true, mfaEnabled: true },
  });
  if (user) {
    const store = await cookies();
    const v = store.get(mfaCookieNameGlobal())?.value;
    const payload = v ? verifyMfaCookie(v) : null;
    const verified = !!payload && payload.uid === user.id && payload.tenantId === MFA_GLOBAL_TENANT_ID;
    if (!verified) {
      const next = encodeURIComponent("/app/admin");
      if (!user.mfaEnabled) redirect(`/app/account/mfa/enroll?callbackUrl=${next}`);
      redirect(`/app/account/mfa/verify?callbackUrl=${next}`);
    }
  }

  return (
    <div className="min-h-screen">
      <header className="sticky top-0 z-50 border-b bg-background/70 backdrop-blur">
        <div className="mx-auto flex max-w-6xl items-center justify-between p-4">
          <div className="flex items-center gap-3">
            <Link href="/app/admin" className="text-sm font-semibold">
              Superadmin
            </Link>
            <span className="text-xs text-muted-foreground">{email}</span>
          </div>
          <nav className="hidden items-center gap-2 md:flex">
            <Link href="/app/admin" className="rounded-xl px-3 py-2 text-sm hover:bg-muted/40">
              Tenants
            </Link>
            <Link href="/app/admin/security" className="rounded-xl px-3 py-2 text-sm hover:bg-muted/40">
              Security
            </Link>
            <Link href="/app/admin/ops" className="rounded-xl px-3 py-2 text-sm hover:bg-muted/40">
              Ops
            </Link>
            <Link href="/app/admin/kpis" className="rounded-xl px-3 py-2 text-sm hover:bg-muted/40">
              KPIs
            </Link>
            <Link href="/app/admin/users" className="rounded-xl px-3 py-2 text-sm hover:bg-muted/40">
              Users
            </Link>
            <Link href="/app/admin/provision" className="rounded-xl px-3 py-2 text-sm hover:bg-muted/40">
              Provision
            </Link>
          </nav>

          {/* Mobile hamburger */}
          <AdminMobileNav email={String(email)} />

          <div className="flex items-center gap-2">
            <Link
              href="/app"
              className="rounded-xl bg-primary px-3 py-2 text-sm text-primary-foreground transition hover:-translate-y-0.5 hover:shadow-sm"
            >
              Go to App
            </Link>
          </div>
        </div>
      </header>
      <main className="mx-auto max-w-6xl p-4">{children}</main>
    </div>
  );
}
