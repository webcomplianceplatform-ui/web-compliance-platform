import Link from "next/link";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/db";

export default async function Page({ searchParams }: { searchParams?: { callbackUrl?: string } }) {
  const session = await getServerSession(authOptions);
  const email = session?.user?.email ?? null;
  if (!email) {
    // account area is behind auth, but just in case
    return (
      <div className="p-6">
        <div className="text-sm text-white/70">Please login.</div>
      </div>
    );
  }

  const user = await prisma.user.findUnique({ where: { email }, select: { id: true, mfaEnabled: true } });
  const callbackUrl = searchParams?.callbackUrl ?? "/app";

  return (
    <div className="mx-auto max-w-2xl p-6">
      <div className="rounded-3xl border border-white/10 bg-white/5 p-6">
        <h1 className="text-2xl font-semibold tracking-tight">Multi-factor authentication</h1>
        <p className="mt-2 text-sm text-white/70">
          This is your global MFA (superadmin/account). It protects the admin area and sensitive actions.
        </p>

        <div className="mt-6 rounded-2xl border border-white/10 bg-black/20 p-4">
          <div className="text-sm font-semibold">Status</div>
          <div className="mt-1 text-sm text-white/70">
            {user?.mfaEnabled ? (
              <span className="text-emerald-200">Enabled</span>
            ) : (
              <span className="text-amber-200">Not enabled</span>
            )}
          </div>
        </div>

        <div className="mt-6 flex flex-col gap-3 sm:flex-row">
          {!user?.mfaEnabled ? (
            <Link
              href={`/app/account/mfa/enroll?callbackUrl=${encodeURIComponent(callbackUrl)}`}
              className="inline-flex items-center justify-center rounded-2xl bg-white px-4 py-2 text-sm font-semibold text-black hover:opacity-90"
            >
              Enable MFA
            </Link>
          ) : (
            <Link
              href={`/app/account/mfa/verify?callbackUrl=${encodeURIComponent(callbackUrl)}`}
              className="inline-flex items-center justify-center rounded-2xl border border-white/10 bg-white/5 px-4 py-2 text-sm font-semibold text-white hover:bg-white/10"
            >
              Verify now
            </Link>
          )}

          <Link
            href={`/app/account/mfa/recovery?callbackUrl=${encodeURIComponent(callbackUrl)}`}
            className="inline-flex items-center justify-center rounded-2xl border border-white/10 bg-white/5 px-4 py-2 text-sm font-semibold text-white hover:bg-white/10"
          >
            Recovery codes
          </Link>
        </div>

        <div className="mt-6 text-xs text-white/60">
          Tip: Once enabled, open <span className="text-white">/app/admin</span> to confirm the guardrail works.
        </div>
      </div>
    </div>
  );
}
