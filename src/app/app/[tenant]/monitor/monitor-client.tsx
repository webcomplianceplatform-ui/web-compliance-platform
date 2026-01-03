"use client";

import { useMemo, useState } from "react";

type CheckType = "UPTIME" | "SSL";
type CheckStatus = "OK" | "WARN" | "FAIL" | null;

type MonitorCheckRow = {
  id: string;
  type: CheckType;
  targetUrl: string;
  intervalM: number;
  lastStatus: CheckStatus;
  lastRunAt: string | Date | null;
  createdAt: string | Date;
};

type MonitorEventRow = {
  id: string;
  status: "OK" | "WARN" | "FAIL";
  severity: number;
  message: string;
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
  initialChecks,
  initialEvents,
}: {
  tenant: string;
  initialChecks: MonitorCheckRow[];
  initialEvents: MonitorEventRow[];
}) {
  const [checks, setChecks] = useState<MonitorCheckRow[]>(initialChecks);
  const [events, setEvents] = useState<MonitorEventRow[]>(initialEvents);

  const [type, setType] = useState<CheckType>("UPTIME");
  const [targetUrl, setTargetUrl] = useState("");
  const [intervalM, setIntervalM] = useState(10);

  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);

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
        body: JSON.stringify({ tenant }),
      });
      const data = await res.json();
      if (!data.ok) return setErr(data.error ?? "error");

      await refresh();
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="space-y-6">
      <section className="rounded-xl border bg-white p-4">
        <div className="flex items-center justify-between">
          <div>
            <div className="text-sm font-medium">Create a check</div>
            <div className="text-xs text-muted-foreground">
              Uptime = HTTP GET. SSL = certificate validity (warn if ≤ 14 days).
            </div>
          </div>

          <button
            className="rounded bg-black px-3 py-2 text-sm text-white disabled:opacity-60"
            disabled={busy}
            onClick={runNow}
            title="Runs all checks once and writes events"
          >
            Run now
          </button>
        </div>

        <div className="mt-4 grid gap-3 md:grid-cols-4">
          <label className="block text-sm">
            Type
            <select
              className="mt-1 w-full rounded border p-2"
              value={type}
              onChange={(e) => setType(e.target.value as CheckType)}
            >
              <option value="UPTIME">UPTIME</option>
              <option value="SSL">SSL</option>
            </select>
          </label>

          <label className="block text-sm md:col-span-2">
            Target URL
            <input
              className="mt-1 w-full rounded border p-2"
              value={targetUrl}
              onChange={(e) => setTargetUrl(e.target.value)}
              placeholder={type === "SSL" ? "https://example.com" : "https://example.com/health"}
            />
          </label>

          <label className="block text-sm">
            Interval (min)
            <input
              className="mt-1 w-full rounded border p-2"
              type="number"
              min={1}
              max={1440}
              value={intervalM}
              onChange={(e) => setIntervalM(parseInt(e.target.value || "10", 10))}
            />
          </label>
        </div>

        <div className="mt-3 flex items-center gap-2">
          <button
            className="rounded border px-3 py-2 text-sm hover:bg-muted disabled:opacity-60"
            disabled={busy}
            onClick={createCheck}
          >
            Create
          </button>

          <button
            className="rounded border px-3 py-2 text-sm hover:bg-muted disabled:opacity-60"
            disabled={busy}
            onClick={refresh}
          >
            Refresh
          </button>

          {err ? <div className="text-sm text-red-600">Error: {err}</div> : null}
        </div>
      </section>

      <section className="rounded-xl border bg-white p-4">
        <div className="text-sm font-medium">Checks</div>

        <div className="mt-3 overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="text-left text-xs text-muted-foreground">
              <tr>
                <th className="py-2">Type</th>
                <th className="py-2">Target</th>
                <th className="py-2">Interval</th>
                <th className="py-2">Last status</th>
                <th className="py-2">Last run</th>
              </tr>
            </thead>
            <tbody>
              {checks.map((c) => (
                <tr key={c.id} className="border-t">
                  <td className="py-2 font-mono">{c.type}</td>
                  <td className="py-2">
                    <a className="underline" href={c.targetUrl} target="_blank" rel="noreferrer">
                      {c.targetUrl}
                    </a>
                  </td>
                  <td className="py-2">{c.intervalM}m</td>
                  <td className="py-2 font-mono">{c.lastStatus ?? "-"}</td>
                  <td className="py-2">{fmt(c.lastRunAt)}</td>
                </tr>
              ))}
              {checks.length === 0 ? (
                <tr>
                  <td className="py-3 text-muted-foreground" colSpan={5}>
                    No checks yet.
                  </td>
                </tr>
              ) : null}
            </tbody>
          </table>
        </div>

        {checks.length > 0 ? (
          <div className="mt-4 grid gap-3 md:grid-cols-2">
            {checks.slice(0, 4).map((c) => {
              const ev = (byCheck.get(c.id) ?? []).slice(0, 3);
              return (
                <div key={c.id} className="rounded-lg border p-3">
                  <div className="flex items-center justify-between">
                    <div className="text-sm font-medium">
                      {c.type} — <span className="font-mono text-xs">{c.id.slice(-6)}</span>
                    </div>
                    <div className="text-xs text-muted-foreground">{c.lastStatus ?? "-"}</div>
                  </div>

                  <div className="mt-2 space-y-2">
                    {ev.map((e) => (
                      <div key={e.id} className="rounded border p-2">
                        <div className="flex items-center justify-between text-xs">
                          <span className="font-mono">{e.status}</span>
                          <span className="text-muted-foreground">{fmt(e.createdAt)}</span>
                        </div>
                        <div className="mt-1 text-sm text-muted-foreground">{e.message}</div>
                      </div>
                    ))}
                    {ev.length === 0 ? <div className="text-sm text-muted-foreground">No events yet.</div> : null}
                  </div>
                </div>
              );
            })}
          </div>
        ) : null}
      </section>

      <section className="rounded-xl border bg-white p-4">
        <div className="text-sm font-medium">Latest events</div>
        <div className="mt-3 space-y-2">
          {events.map((e) => (
            <div key={e.id} className="rounded-lg border p-3">
              <div className="flex items-center justify-between text-xs">
                <span className="font-mono">
                  {e.status} · sev {e.severity}
                  {e.checkId ? ` · ${e.checkId.slice(-6)}` : ""}
                </span>
                <span className="text-muted-foreground">{fmt(e.createdAt)}</span>
              </div>
              <div className="mt-1 text-sm text-muted-foreground">{e.message}</div>
            </div>
          ))}
          {events.length === 0 ? <div className="text-sm text-muted-foreground">No events yet.</div> : null}
        </div>
      </section>
    </div>
  );
}
