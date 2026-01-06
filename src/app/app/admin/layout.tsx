import { getServerSession } from "next-auth";
import { notFound, redirect } from "next/navigation";
import Link from "next/link";

import { authOptions } from "@/lib/auth";
import { isSuperadminEmail } from "@/lib/superadmin";

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  const session = await getServerSession(authOptions);
  const email = session?.user?.email ?? null;

  // If the user is not logged in, send them to login and preserve the return URL.
  if (!session) redirect(`/login?callbackUrl=${encodeURIComponent("/app/admin")}`);

  // Logged in but not superadmin -> hide the existence of /admin.
  if (!isSuperadminEmail(email)) notFound();

  return (
    <div className="min-h-screen">
      <header className="border-b">
        <div className="mx-auto flex max-w-6xl items-center justify-between p-4">
          <div className="flex items-center gap-3">
            <Link href="/app/admin" className="text-sm font-semibold">
              Superadmin
            </Link>
            <span className="text-xs text-muted-foreground">{email}</span>
          </div>
          <div className="flex items-center gap-2">
            <Link href="/app" className="rounded border px-3 py-2 text-sm">
              Go to App
            </Link>
          </div>
        </div>
      </header>
      <main className="mx-auto max-w-6xl p-4">{children}</main>
    </div>
  );
}
