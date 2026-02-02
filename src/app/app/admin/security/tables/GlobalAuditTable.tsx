"use client";

import { useMemo, useState } from "react";
import { AppTable, AppTableHead, AppTableRow } from "@/components/app-ui/AppTable";

type UserLite = { id: string; email: string; name: string | null };

type AuditEventLite = {
  id: string;
  createdAt: string | Date;
  actorType: string;
  actorId: string | null;
  action: string;
  targetType: string;
  targetId: string | null;
  metaJson: any;
};

function fmtTime(d: string | Date) {
  const dt = typeof d === "string" ? new Date(d) : d;
  return isNaN(dt.getTime()) ? String(d) : dt.toLocaleString();
}

function actionBadgeClass(action: string) {
  const a = (action || "").toUpperCase();
  if (a.includes("LOGIN") || a.includes("SESSION")) return "border-sky-400/30 bg-sky-400/10 text-sky-200";
  if (a.includes("MFA") || a.includes("STEP") || a.includes("DEVICE")) return "border-indigo-400/30 bg-indigo-400/10 text-indigo-200";
  if (a.includes("REVOK") || a.includes("DISABLE") || a.includes("DENY")) return "border-rose-400/30 bg-rose-400/10 text-rose-200";
  if (a.includes("CREATE") || a.includes("PROVISION")) return "border-emerald-400/30 bg-emerald-400/10 text-emerald-200";
  if (a.includes("UPDATE") || a.includes("EDIT")) return "border-amber-400/30 bg-amber-400/10 text-amber-200";
  return "border-white/15 bg-white/5 text-white/80";
}

function actorLabel(e: AuditEventLite, userMap: Record<string, UserLite>) {
  if (e.actorType === "User" && e.actorId) {
    const u = userMap[e.actorId];
    if (u) return `${u.name ?? "(no name)"} · ${u.email}`;
  }
  return e.actorId ? `${e.actorType}:${e.actorId}` : e.actorType;
}

function targetLabel(e: AuditEventLite, userMap?: Record<string, UserLite>) {
  const map = userMap ?? {};

  if (e?.targetType === "User" && e?.targetId) {
    const u = map[e.targetId];
    if (u) return `${u.name ?? "(no name)"} · ${u.email}`;
  }

  if (!e?.targetType) return e?.targetId ?? "(unknown target)";
  return e.targetId ? `${e.targetType}:${e.targetId}` : e.targetType;
}


export function GlobalAuditTable({
  events,
  userMap,
}: {
  events: AuditEventLite[];
  userMap: Record<string, UserLite>;
}) {
  const [q, setQ] = useState("");
  const [action, setAction] = useState<string>("all");
  const [target, setTarget] = useState<string>("all");

  const actions = useMemo(() => {
    const s = new Set<string>();
    for (const e of events) if (e.action) s.add(e.action);
    return Array.from(s).sort();
  }, [events]);

  const targets = useMemo(() => {
    const s = new Set<string>();
    for (const e of events) if (e.targetType) s.add(e.targetType);
    return Array.from(s).sort();
  }, [events]);

  const filtered = useMemo(() => {
    const qq = q.trim().toLowerCase();
    return events.filter((e) => {
      if (action !== "all" && e.action !== action) return false;
      if (target !== "all" && e.targetType !== target) return false;

      if (!qq) return true;
      const hay = [
        fmtTime(e.createdAt),
        e.action,
        actorLabel(e, userMap),
        targetLabel(e, userMap),
        JSON.stringify(e.metaJson ?? {}),
      ]
        .join(" ")
        .toLowerCase();
      return hay.includes(qq);
    });
  }, [events, userMap, q, action, target]);

  return (
    <div className="mt-4">
      <div className="flex flex-col gap-2 md:flex-row md:items-center md:justify-between">
        <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
          <input
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="Search (action, user, target… )"
            className="w-full rounded-2xl border border-border bg-bg1/60 px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-white/10 sm:w-[360px]"
          />
          <select
            value={action}
            onChange={(e) => setAction(e.target.value)}
            className="w-full rounded-2xl border border-border bg-bg1/60 px-3 py-2 text-sm outline-none sm:w-[260px]"
          >
            <option value="all">All actions</option>
            {actions.map((a) => (
              <option key={a} value={a}>
                {a}
              </option>
            ))}
          </select>
          <select
            value={target}
            onChange={(e) => setTarget(e.target.value)}
            className="w-full rounded-2xl border border-border bg-bg1/60 px-3 py-2 text-sm outline-none sm:w-[220px]"
          >
            <option value="all">All targets</option>
            {targets.map((t) => (
              <option key={t} value={t}>
                {t}
              </option>
            ))}
          </select>
        </div>
        <div className="text-xs text-muted-foreground">Showing {filtered.length} / {events.length}</div>
      </div>

      <div className="mt-3 overflow-x-auto">
        <AppTable>
          <AppTableHead>
            <tr>
              <th className="p-3 text-left">Time</th>
              <th className="p-3 text-left">Action</th>
              <th className="p-3 text-left">Actor</th>
              <th className="p-3 text-left">Target</th>
              <th className="p-3 text-left">Meta</th>
            </tr>
          </AppTableHead>
          
          <tbody>
            {filtered.map((e) => (
              <AppTableRow key={e.id}>
                
                <td className="p-3 text-sm text-white/80">{fmtTime(e.createdAt)}</td>
                <td className="p-3">
                  <span className={`inline-flex items-center rounded-full border px-2.5 py-1 text-xs ${actionBadgeClass(e.action)}`}>
                    {e.action}
                  </span>
                </td>
                <td className="p-3 text-sm text-white/80">
                  <span className="block max-w-[420px] truncate">{actorLabel(e, userMap)}</span>
                </td>
                <td className="p-3 text-sm text-white/70">
                  <span className="block max-w-[420px] truncate">{targetLabel(e, userMap)}</span>
                </td>
                <td className="p-3 text-xs text-white/60">
                  <span className="block max-w-[520px] truncate">{JSON.stringify(e.metaJson ?? {})}</span>
                </td>
              </AppTableRow>
            ))}
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
