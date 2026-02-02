"use client";

import { useMemo, useState } from "react";
import { AppTable, AppTableHead, AppTableRow } from "@/components/app-ui/AppTable";

type UserLite = { id: string; email: string; name: string | null };

type AccessEventLite = {
  id: string;
  createdAt: string | Date;
  kind: string;
  userId: string | null;
  ip: string | null;
  userAgent: string | null;
  deviceId: string | null;
  trustedDeviceId: string | null;
  sessionId: string | null;
  metaJson: any;
};

function fmtTime(v: string | Date) {
  const d = typeof v === "string" ? new Date(v) : v;
  if (Number.isNaN(d.getTime())) return "—";
  return d.toLocaleString();
}

function normalizeIp(ip?: string | null) {
  if (!ip) return "—";
  if (ip === "::1" || ip === "127.0.0.1") return "localhost";
  if (ip.startsWith("::ffff:")) return ip.replace("::ffff:", "");
  return ip;
}

function kindBadgeClass(kind: string) {
  const k = (kind || "").toUpperCase();
  if (k.includes("IMPERSON")) return "bg-violet-500/15 border-violet-500/30 text-violet-200";
  if (k.includes("DEVICE") || k.includes("TRUST")) return "bg-sky-500/15 border-sky-500/30 text-sky-200";
  if (k.includes("STEP") || k.includes("MFA")) return "bg-amber-500/15 border-amber-500/30 text-amber-200";
  if (k.includes("FAIL") || k.includes("DENY") || k.includes("REVOK")) return "bg-rose-500/15 border-rose-500/30 text-rose-200";
  return "bg-emerald-500/15 border-emerald-500/30 text-emerald-200";
}

export function AccessEventsTable({
  events,
  userMap,
}: {
  events: AccessEventLite[];
  userMap: Record<string, UserLite>;
}) {
  const [q, setQ] = useState("");
  const [kind, setKind] = useState<string>("all");

  const kinds = useMemo(() => {
    const s = new Set<string>();
    for (const e of events) s.add(e.kind);
    return Array.from(s).sort();
  }, [events]);

  const filtered = useMemo(() => {
    const qq = q.trim().toLowerCase();
    return events.filter((e) => {
      if (kind !== "all" && e.kind !== kind) return false;
      if (!qq) return true;
      const u = e.userId ? userMap[e.userId] : null;
      const hay = [
        e.kind,
        e.userId ?? "",
        u?.email ?? "",
        u?.name ?? "",
        normalizeIp(e.ip),
        e.userAgent ?? "",
        e.sessionId ?? "",
        e.deviceId ?? "",
        e.trustedDeviceId ?? "",
      ]
        .join(" ")
        .toLowerCase();
      return hay.includes(qq);
    });
  }, [events, userMap, q, kind]);

  return (
    <div className="mt-4">
      <div className="flex flex-col gap-2 md:flex-row md:items-center md:justify-between">
        <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
          <input
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="Search (user, email, ip, kind…)"
            className="w-full rounded-2xl border border-border bg-bg1/60 px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-white/10 sm:w-[360px]"
          />
          <select
            value={kind}
            onChange={(e) => setKind(e.target.value)}
            className="w-full rounded-2xl border border-border bg-bg1/60 px-3 py-2 text-sm outline-none sm:w-[240px]"
          >
            <option value="all">All kinds</option>
            {kinds.map((k) => (
              <option key={k} value={k}>
                {k}
              </option>
            ))}
          </select>
        </div>
        <div className="text-xs text-muted-foreground">Showing {filtered.length} / {events.length}</div>
      </div>

      {/* Quick kind filters */}
      <div className="mt-2 flex flex-wrap items-center gap-2">
        {([
          { k: "all", label: "All" },
          { k: "LOGIN", label: "Login" },
          { k: "SESSION", label: "Sessions" },
          { k: "DEVICE", label: "Devices" },
          { k: "POLICY", label: "Policy/MFA" },
          { k: "IMPERSONATION", label: "Impersonation" },
        ] as const).map((it) => (
          <button
            key={it.k}
            type="button"
            onClick={() => {
              // If the exact kind exists, filter by it; otherwise keep 'all' or do a fuzzy match via search.
              if (it.k === "all") return setKind("all");
              const exact = kinds.find((x) => x.toUpperCase() === it.k);
              if (exact) setKind(exact);
              else setQ((q) => (q.trim() ? q : it.k));
            }}
            className={
              "rounded-full border px-3 py-1 text-xs transition " +
              (it.k === "all" ? (kind === "all" ? "border-white/20 bg-white/10 text-white" : "border-white/10 bg-white/5 text-white/70 hover:bg-white/10") :
              ((kinds.find((x) => x.toUpperCase() === it.k) && kind.toUpperCase() == it.k) ? "border-white/20 bg-white/10 text-white" : "border-white/10 bg-white/5 text-white/70 hover:bg-white/10"))
            }
          >
            {it.label}
          </button>
        ))}
      </div>

      <div className="mt-3 overflow-x-auto">
        <AppTable>
          <AppTableHead>
            <tr>
              <th className="p-3 text-left">Time</th>
              <th className="p-3 text-left">Kind</th>
              <th className="p-3 text-left">User</th>
              <th className="p-3 text-left">IP</th>
              <th className="p-3 text-left">Agent</th>
            </tr>
          </AppTableHead>
          <tbody>
            {filtered.map((e) => {
              const u = e.userId ? userMap[e.userId] : null;
              const userLabel = u ? `${u.name ?? "(no name)"} · ${u.email}` : e.userId ?? "—";
              return (
                <AppTableRow key={e.id}>
                  <td className="p-3 text-sm text-white/80">{fmtTime(e.createdAt)}</td>
                  <td className="p-3">
                    <span className={`inline-flex items-center rounded-full border px-2.5 py-1 text-xs ${kindBadgeClass(e.kind)}`}>
                      {e.kind}
                    </span>
                  </td>
                  <td className="p-3 text-sm text-white/80">
                    <span className="block max-w-[420px] truncate">{userLabel}</span>
                  </td>
                  <td className="p-3 text-sm text-white/70">{normalizeIp(e.ip)}</td>
                  <td className="p-3 text-xs text-white/60">
                    <span className="block max-w-[520px] truncate">{e.userAgent ?? "—"}</span>
                  </td>
                </AppTableRow>
              );
            })}
            {filtered.length === 0 ? (
              <tr>
                <td colSpan={5} className="p-6 text-center text-sm text-muted-foreground">
                  No results.
                </td>
              </tr>
            ) : null}
          </tbody>
        </AppTable>
      </div>
    </div>
  );
}
