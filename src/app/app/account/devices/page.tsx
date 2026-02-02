import Link from "next/link";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/db";
import RevokeDeviceButton from "./revoke-device-button";

export default async function AccountDevicesPage() {
  const session = await getServerSession(authOptions);
  const uid = (session?.user as any)?.id as string | undefined;
  if (!uid) {
    return (
      <div className="p-6">
        <h1 className="text-xl font-semibold">Trusted devices</h1>
        <p className="mt-2 text-sm text-muted-foreground">You must be signed in.</p>
      </div>
    );
  }

  const devices = await prisma.trustedDevice.findMany({
    where: { userId: uid },
    orderBy: { lastSeenAt: "desc" },
    take: 100,
  });

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-xl font-semibold">Trusted devices</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Devices you have approved for step-up protected areas (e.g. the control plane).
          </p>
        </div>
        <div className="flex gap-2">
          <Link href="/app/account/sessions" className="text-sm underline">
            My sessions
          </Link>
        </div>
      </div>

      <div className="rounded-xl border overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-muted/40">
            <tr>
              <th className="text-left px-4 py-3 font-medium">Label</th>
              <th className="text-left px-4 py-3 font-medium">Approved</th>
              <th className="text-left px-4 py-3 font-medium">Last seen</th>
              <th className="text-left px-4 py-3 font-medium">Status</th>
              <th className="text-right px-4 py-3 font-medium">Actions</th>
            </tr>
          </thead>
          <tbody>
            {devices.length === 0 ? (
              <tr>
                <td className="px-4 py-6 text-muted-foreground" colSpan={5}>
                  No trusted devices yet.
                </td>
              </tr>
            ) : (
              devices.map((d) => (
                <tr key={d.id} className="border-t">
                  <td className="px-4 py-3">
                    <div className="font-medium">{d.label ?? "Trusted device"}</div>
                    <div className="text-xs text-muted-foreground truncate max-w-[520px]">
                      {String((d.metaJson as any)?.userAgent ?? "")}
                    </div>
                  </td>
                  <td className="px-4 py-3">{d.approvedAt ? new Date(d.approvedAt).toLocaleString() : "—"}</td>
                  <td className="px-4 py-3">{new Date(d.lastSeenAt).toLocaleString()}</td>
                  <td className="px-4 py-3">
                    {d.revokedAt ? (
                      <span className="text-xs rounded-full border px-2 py-1">Revoked</span>
                    ) : (
                      <span className="text-xs rounded-full border px-2 py-1">Active</span>
                    )}
                  </td>
                  <td className="px-4 py-3 text-right">
                    <RevokeDeviceButton deviceId={d.id} disabled={!!d.revokedAt} />
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      <div className="text-xs text-muted-foreground">
        Tip: a device is automatically approved after you complete MFA verification during a step-up flow.
      </div>
    </div>
  );
}
