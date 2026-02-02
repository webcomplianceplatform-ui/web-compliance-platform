"use client";

import { useMemo, useState } from "react";

import EmptyState from "@/components/app/EmptyState";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/components/ui/toast";
import { AppCard } from "@/components/app-ui/AppCard";
import { AppButton } from "@/components/app-ui/AppButton";
import { AppInput } from "@/components/app-ui/AppInput";
import { AppTable, AppTableHead, AppTableRow } from "@/components/app-ui/AppTable";

type CheckType = "UPTIME" | "SSL";
type CheckStatus = "OK" | "WARN" | "FAIL" | null;

type MonitorCheckRow = {
  id: string;
  type: CheckType;
  targetUrl: string;
  intervalM: number;
  enabled: boolean;
  lastStatus: CheckStatus;
  lastRunAt: string | Date | null;
  createdAt: string | Date;
};

type MonitorEventRow = {
  id: string;
  status: "OK" | "WARN" | "FAIL";
  severity: number;
  message: string;
  metaJson?: any;
  createdAt: string | Date;
  checkId: string | null;
};

function fmt(d: string | Date | null | undefined) {
  if (!d) return "-";
  const date = typeof d === "string" ? new Date(d) : d;
  return date.toLocaleString();
}

export default function MonitorClient({
  tenant,
  role,
  initialChecks,
  initialEvents,
}: {
  tenant: string;
  role: string;
  initialChecks: MonitorCheckRow[];
  initialEvents: MonitorEventRow[];
}) {
  const toast = useToast();
  const [checks, setChecks] = useState<MonitorCheckRow[]>(initialChecks);
  const [events, setEvents] = useState<MonitorEventRow[]>(initialEvents);

  const [showAllEvents, setShowAllEvents] = useState(false);

  const [type, setType] = useState<CheckType>("UPTIME");
  const [targetUrl, setTargetUrl] = useState("");
  const [intervalM, setIntervalM] = useState(10);

  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  const [editingId, setEditingId] = useState<string | null>(null);
  const canEdit = role === "OWNER" || role === "ADMIN";
  const [editTargetUrl, setEditTargetUrl] = useState("");
  const [editIntervalM, setEditIntervalM] = useState(10);

  const byCheck = useMemo(() => {
    const m = new Map<string, MonitorEventRow[]>();
    for (const e of events) {
      if (!e.checkId) continue;
      const arr = m.get(e.checkId) ?? [];
      arr.push(e);
      m.set(e.checkId, arr);
    }
    return m;
  }, [events]);

  async function refresh() {
    const res = await fetch(`/api/app/monitor/checks?tenant=${encodeURIComponent(tenant)}`);
    const data = await res.json();
    if (data?.ok) setChecks(data.checks);

    const res2 = await fetch(`/api/app/monitor/events?tenant=${encodeURIComponent(tenant)}`);
    const data2 = await res2.json();
    if (data2?.ok) setEvents(data2.events);
  }

  async function createCheck() {
    setErr(null);
    if (!targetUrl.trim()) return setErr("targetUrl_required");

    setBusy(true);
    try {
      const res = await fetch("/api/app/monitor/checks", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ tenant, type, targetUrl: targetUrl.trim(), intervalM }),
      });
      const data = await res.json();
      if (!data.ok) return setErr(data.error ?? "error");

      setTargetUrl("");
      await refresh();
      toast.push({ variant: "success", message: "Check created" });
    } finally {
      setBusy(false);
    }
  }

  async function runNow() {
    setErr(null);
    setBusy(true);
    try {
      const res = await fetch("/api/app/monitor/run", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ tenant, force: true }),
      });
      const data = await res.json();
      if (!data.ok) return setErr(data.error ?? "error");

      await refresh();
      toast.push({ variant: "success", message: "Monitor run completed" });
    } finally {
      setBusy(false);
    }
  }

  async function startEdit(c: MonitorCheckRow) {
    setEditingId(c.id);
    setEditTargetUrl(c.targetUrl);
    setEditIntervalM(c.intervalM);
  }

  async function saveEdit() {
    if (!editingId) return;
    setErr(null);
    setBusy(true);
    try {
      const res = await fetch("/api/app/monitor/checks", {
        method: "PATCH",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ tenant, id: editingId, targetUrl: editTargetUrl.trim(), intervalM: editIntervalM }),
      });
      const data = await res.json();
      if (!data.ok) return setErr(data.error ?? "error");
      setEditingId(null);
      await refresh();
      toast.push({ variant: "success", message: "Check updated" });
    } finally {
      setBusy(false);
    }
  }

  async function deleteCheck(id: string) {
    if (!window.confirm("Delete this check?")) return;
    setErr(null);
    setBusy(true);
    try {
      const res = await fetch("/api/app/monitor/checks", {
        method: "DELETE",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ tenant, id }),
      });
      const data = await res.json();
      if (!data.ok) return setErr(data.error ?? "error");
      await refresh();
      toast.push({ variant: "success", message: "Check deleted" });
    } finally {
      setBusy(false);
    }
  }

  async function toggleEnabled(c: MonitorCheckRow) {
    setErr(null);
    setBusy(true);
    try {
      const res = await fetch("/api/app/monitor/checks", {
        method: "PATCH",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ tenant, id: c.id, enabled: !c.enabled }),
      });
      const data = await res.json();
      if (!data.ok) return setErr(data.error ?? "error");
      await refresh();
      toast.push({ variant: "success", message: c.enabled ? "Check disabled" : "Check enabled" });
    } finally {
      setBusy(false);
    }
  }

  function extraEventInfo(e: MonitorEventRow) {
    const m = e?.metaJson;
    if (!m) return null;
    if (typeof m.latencyMs === "number") return `latency ${m.latencyMs}ms`;
    if (typeof m.daysLeft === "number") return `daysLeft ${m.daysLeft}`;
    return null;
  }

  const eventsToRender = showAllEvents ? events : events.slice(0, 4);

  return (
    <div className="space-y-6">
      {canEdit ? (
      <section id="create-check">
        <AppCard className="p-4">
        <div className="flex items-center justify-between">
          <div>
            <div className="text-sm font-medium">Create a check</div>
            <div className="text-xs text-muted-foreground">
              Uptime = HTTP GET. SSL = certificate validity (warn if ≤ 14 days).
            </div>
          </div>

          <AppButton disabled={busy} onClick={runNow} title="Runs all checks once and writes events">
            Run now
          </AppButton>
        </div>

        <div className="mt-4 grid gap-3 md:grid-cols-4">
          <label className="block text-sm">
            Type
            <select
              className="mt-1 w-full rounded-xl border border-border bg-bg2/50 px-3 py-2 text-sm text-foreground backdrop-blur transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand/30 focus-visible:border-brand2"
              value={type}
              onChange={(e) => setType(e.target.value as CheckType)}
            >
              <option value="UPTIME">UPTIME</option>
              <option value="SSL">SSL</option>
            </select>
          </label>

          <label className="block text-sm md:col-span-2">
            Target URL
            <AppInput
              className="mt-1"
              value={targetUrl}
              onChange={(e) => setTargetUrl(e.target.value)}
              placeholder={type === "SSL" ? "https://example.com" : "https://example.com/health"}
            />
          </label>

          <label className="block text-sm">
            Interval (min)
            <AppInput
              className="mt-1"
              type="number"
              min={1}
              max={1440}
              value={intervalM}
              onChange={(e) => setIntervalM(parseInt(e.target.value || "10", 10))}
            />
          </label>
        </div>

        <div className="mt-3 flex items-center gap-2">
          <AppButton disabled={busy} onClick={createCheck}>
            Create
          </AppButton>

          <AppButton variant="secondary" disabled={busy} onClick={refresh}>
            Refresh
          </AppButton>

          {err ? <div className="text-sm text-red-600">Error: {err}</div> : null}
        </div>
        </AppCard>
      </section>
      ) : (
        <AppCard className="p-4">
          <div className="text-sm font-medium">Monitoring</div>
          <div className="mt-1 text-xs text-muted-foreground">
            You can view status and history. Ask an admin if you need changes.
          </div>
        </AppCard>
      )}

      <section>
        <AppCard className="p-4">
  <div className="text-sm font-medium">Checks</div>

  {checks.length === 0 ? (
    <div className="mt-3">
      <EmptyState
        title="No monitor checks yet"
        description="Add an Uptime or SSL check to start tracking availability and certificate expiry."
        actionLabel={canEdit ? "Create a check" : undefined}
        actionHref={canEdit ? "#create-check" : undefined}
      />
    </div>
  ) : (
    <>
      <div className="mt-3 overflow-x-auto">
        <table className="w-full text-sm">
          <thead className="text-left text-xs text-muted-foreground">
            <tr>
              <th className="py-2">Type</th>
              <th className="py-2">Target</th>
              <th className="py-2">Interval</th>
              <th className="py-2">Enabled</th>
              <th className="py-2">Last status</th>
              <th className="py-2">Last run</th>
              <th className="py-2"></th>
            </tr>
          </thead>
          <tbody>
            {checks.map((c) => (
              <tr key={c.id} className="border-t">
                <td className="py-2">
                  <Badge variant="outline" className="font-mono">
                    {c.type}
                  </Badge>
                </td>

                <td className="py-2">
                  {editingId === c.id ? (
                    <AppInput
                      className="w-full"
                      value={editTargetUrl}
                      onChange={(e) => setEditTargetUrl(e.target.value)}
                    />
                  ) : (
                    <a className="underline" href={c.targetUrl} target="_blank" rel="noreferrer">
                      {c.targetUrl}
                    </a>
                  )}
                </td>

                <td className="py-2">
                  {editingId === c.id ? (
                    <AppInput
                      className="w-24"
                      type="number"
                      min={1}
                      max={1440}
                      value={editIntervalM}
                      onChange={(e) => setEditIntervalM(parseInt(e.target.value || "10", 10))}
                    />
                  ) : (
                    `${c.intervalM}m`
                  )}
                </td>

                <td className="py-2">
                  <input
                    type="checkbox"
                    checked={!!c.enabled}
                    disabled={busy || !canEdit}
                    onChange={() => toggleEnabled(c)}
                  />
                </td>

                <td className="py-2">
                  {!c.enabled ? (
                    <Badge variant="muted" className="mr-2">
                      Disabled
                    </Badge>
                  ) : null}

                  <Badge
                    className="font-mono"
                    variant={
                      c.lastStatus === "OK"
                        ? "success"
                        : c.lastStatus === "WARN"
                          ? "warning"
                          : c.lastStatus === "FAIL"
                            ? "danger"
                            : "muted"
                    }
                  >
                    {c.lastStatus ?? "-"}
                  </Badge>
                </td>

                <td className="py-2">{fmt(c.lastRunAt)}</td>

                <td className="py-2 text-right">
                  {editingId === c.id ? (
                    <div className="flex items-center justify-end gap-2">
                      <AppButton size="sm" variant="secondary" disabled={busy} onClick={saveEdit}>
                        Save
                      </AppButton>
                      <AppButton size="sm" variant="ghost" disabled={busy} onClick={() => setEditingId(null)}>
                        Cancel
                      </AppButton>
                    </div>
                  ) : (
                    <div className="flex items-center justify-end gap-2">
                      {canEdit ? (
                        <>
                          <AppButton size="sm" disabled={busy} onClick={() => startEdit(c)}>
                            Edit
                          </AppButton>
                          <AppButton size="sm" variant="danger" disabled={busy} onClick={() => deleteCheck(c.id)}>
                            Delete
                          </AppButton>
                        </>
                      ) : null}
                    </div>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Latest summary per type (UPTIME/SSL) */}
      <div className="mt-4 grid gap-3 md:grid-cols-2">
        {(["UPTIME", "SSL"] as const).map((t) => {
          const candidates = checks.filter((c) => c.type === t);
          if (candidates.length === 0) return null;

          const latest = [...candidates].sort((a, b) => {
            const ta = new Date((a.lastRunAt ?? a.createdAt) as any).getTime();
            const tb = new Date((b.lastRunAt ?? b.createdAt) as any).getTime();
            return tb - ta;
          })[0]!;

          const latestEvent = (byCheck.get(latest.id) ?? [])[0] ?? null;

          return (
            <AppCard key={t} className="p-4">
              <div className="flex items-center justify-between">
                <div className="text-sm font-semibold">{latest.type}</div>
                <Badge
                  className="font-mono"
                  variant={
                    latest.lastStatus === "OK"
                      ? "success"
                      : latest.lastStatus === "WARN"
                        ? "warning"
                        : latest.lastStatus === "FAIL"
                          ? "danger"
                          : "muted"
                  }
                >
                  {latest.lastStatus ?? "-"}
                </Badge>
              </div>

              <div className="mt-2 text-sm">
                <div className="text-xs text-muted-foreground">Target</div>
                <a className="break-all underline" href={latest.targetUrl} target="_blank" rel="noreferrer">
                  {latest.targetUrl}
                </a>
              </div>

              <div className="mt-3 grid gap-2 text-xs text-muted-foreground sm:grid-cols-2">
                <div>
                  <div className="font-medium text-foreground/80">Last run</div>
                  <div>{fmt(latest.lastRunAt)}</div>
                </div>
                <div>
                  <div className="font-medium text-foreground/80">Interval</div>
                  <div>{latest.intervalM}m</div>
                </div>
              </div>

              {latestEvent ? (
                <div className="mt-3 rounded-xl border border-border bg-bg2/30 p-3">
                  <div className="flex items-center justify-between text-xs">
                    <span className="font-mono">
                      {latestEvent.status} · sev {latestEvent.severity}
                    </span>
                    <span>{fmt(latestEvent.createdAt)}</span>
                  </div>
                  <div className="mt-1 text-sm text-muted-foreground">
                    {latestEvent.message}
                    {extraEventInfo(latestEvent) ? (
                      <span className="ml-2 text-xs">({extraEventInfo(latestEvent)})</span>
                    ) : null}
                  </div>
                </div>
              ) : (
                <div className="mt-3 text-sm text-muted-foreground">No events yet.</div>
              )}
            </AppCard>
          );
        })}
      </div>
    </>
  )}
        </AppCard>
      </section>


      <section>
        <AppCard className="p-4">
        <div className="text-sm font-medium">Latest events</div>
        <div className="mt-3 space-y-2">
          {eventsToRender.map((e) => (
            <div key={e.id} className="rounded-xl border border-border bg-bg2/30 p-3">
              <div className="flex items-center justify-between text-xs">
                <span className="font-mono">
                  {e.status} · sev {e.severity}
                  {e.checkId ? ` · ${e.checkId.slice(-6)}` : ""}
                </span>
                <span className="text-muted-foreground">{fmt(e.createdAt)}</span>
              </div>
              <div className="mt-1 text-sm text-muted-foreground">
                {e.message}
                {extraEventInfo(e) ? <span className="ml-2 text-xs">({extraEventInfo(e)})</span> : null}
              </div>
            </div>
          ))}
          {events.length === 0 ? <div className="text-sm text-muted-foreground">No events yet.</div> : null}

          {events.length > 4 ? (
            <div className="pt-2">
              <AppButton variant="secondary" onClick={() => setShowAllEvents((v) => !v)}>
                {showAllEvents ? "Show less" : `Show more (${events.length - 4})`}
              </AppButton>
            </div>
          ) : null}
        </div>
        </AppCard>
      </section>
    </div>
  );
}
