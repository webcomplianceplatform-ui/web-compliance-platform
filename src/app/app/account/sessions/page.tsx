import Link from "next/link";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { redirect } from "next/navigation";
import { RevokeMySessionButton } from "./RevokeMySessionButton";

function fmt(d: Date | null | undefined) {
  if (!d) return "-";
  try {
    return new Intl.DateTimeFormat("es-ES", {
      dateStyle: "medium",
      timeStyle: "short",
    }).format(d);
  } catch {
    return d.toISOString();
  }
}

export default async function AccountSessionsPage() {
  const session = await getServerSession(authOptions);
  const email = session?.user?.email ?? null;
  const actorId = (session?.user as any)?.id as string | undefined;
  const currentSid = (session?.user as any)?.sessionId as string | undefined;
  if (!email || !actorId || !currentSid) redirect("/login");

  const user = await prisma.user.findUnique({ where: { id: actorId }, select: { id: true, email: true, name: true } });
  if (!user) redirect("/login");

  const sessions = await prisma.userSession.findMany({
    where: { userId: user.id },
    orderBy: { createdAt: "desc" },
    take: 50,
    select: {
      id: true,
      createdAt: true,
      lastSeenAt: true,
      revokedAt: true,
      revokedReason: true,
      ip: true,
      userAgent: true,
      requiresStepUp: true,
    },
  });

  return (
    <div className="mx-auto max-w-5xl p-6">
      <div className="mb-6">
        <h1 className="text-2xl font-semibold">Sessions</h1>
        <p className="text-sm text-zinc-600">Manage where your account is signed in.</p>
        <div className="mt-2 text-sm">
          <Link href="/app/account/devices" className="underline">Trusted devices</Link>
        </div>
      </div>

      <div className="rounded-xl border bg-white">
        <div className="border-b p-4">
          <div className="text-sm font-medium">{user.name ?? user.email}</div>
          <div className="text-xs text-zinc-500">Latest 50 sessions</div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-zinc-50 text-xs text-zinc-600">
              <tr>
                <th className="px-4 py-3 text-left">When</th>
                <th className="px-4 py-3 text-left">Last seen</th>
                <th className="px-4 py-3 text-left">IP</th>
                <th className="px-4 py-3 text-left">Device</th>
                <th className="px-4 py-3 text-left">Status</th>
                <th className="px-4 py-3 text-right">Action</th>
              </tr>
            </thead>
            <tbody>
              {sessions.map((s) => {
                const isCurrent = s.id === currentSid;
                const status = s.revokedAt
                  ? `Revoked (${s.revokedReason ?? ""})`
                  : s.requiresStepUp
                    ? "Step-up required"
                    : isCurrent
                      ? "Active (current)"
                      : "Active";

                return (
                  <tr key={s.id} className="border-t">
                    <td className="px-4 py-3 whitespace-nowrap">{fmt(s.createdAt)}</td>
                    <td className="px-4 py-3 whitespace-nowrap">{fmt(s.lastSeenAt)}</td>
                    <td className="px-4 py-3 whitespace-nowrap">{s.ip ?? "-"}</td>
                    <td className="px-4 py-3 min-w-[320px]">
                      <div className="line-clamp-2 break-all text-xs text-zinc-700">{s.userAgent ?? "-"}</div>
                    </td>
                    <td className="px-4 py-3 whitespace-nowrap">
                      <span className={
                        "inline-flex rounded-full border px-2 py-1 text-xs " +
                        (s.revokedAt
                          ? "border-zinc-200 bg-zinc-50 text-zinc-600"
                          : s.requiresStepUp
                            ? "border-amber-200 bg-amber-50 text-amber-700"
                            : isCurrent
                              ? "border-emerald-200 bg-emerald-50 text-emerald-700"
                              : "border-zinc-200 bg-white text-zinc-700")
                      }>
                        {status}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-right">
                      {s.revokedAt ? null : <RevokeMySessionButton sessionId={s.id} isCurrent={isCurrent} />}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
