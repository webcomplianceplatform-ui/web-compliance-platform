"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { AppCard } from "@/components/app-ui/AppCard";

type Schedule = {
  id?: string;
  enabled: boolean;
  dayOfMonth: number;
  hour: number;
  timezone: string;
  lastRunAt?: string | null;
};

type Member = {
  userId: string;
  email: string;
  name: string | null;
  role: string;
};

async function safeJson(res: Response) {
  try {
    return await res.json();
  } catch {
    return null;
  }
}

function planKey(plan: string) {
  const p = String(plan || "").toUpperCase();
  if (p === "ASSURED") return "AGENCY";
  if (p === "COMPLIANCE") return "BUSINESS";
  return "STARTER";
}

export default function PacksClient({ tenant }: { tenant: string }) {
  const [schedule, setSchedule] = useState<Schedule | null>(null);
  const [days, setDays] = useState(30);
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);

  const [plan, setPlan] = useState<string>("COMPLIANCE");
  const [clients, setClients] = useState<Member[]>([]);
  const [selectedClientUserId, setSelectedClientUserId] = useState<string>("");

  const apiBase = useMemo(() => `/api/app/evidence/packs`, []);

  const isAgency = planKey(plan) === "AGENCY";

  async function load() {
    setMsg(null);

    // schedule
    const r = await fetch(`${apiBase}/schedule?tenant=${encodeURIComponent(tenant)}`);
    const j = await safeJson(r);
    if (j?.ok) {
      const s = j.schedule as any;
      const next: Schedule = s
        ? {
            enabled: !!s.enabled,
            dayOfMonth: Number(s.dayOfMonth ?? 1),
            hour: Number(s.hour ?? 9),
            timezone: String(s.timezone ?? "Europe/Madrid"),
            lastRunAt: s.lastRunAt ?? null,
          }
        : { enabled: true, dayOfMonth: 1, hour: 9, timezone: "Europe/Madrid", lastRunAt: null };
      setSchedule(next);
    }

    // plan
    try {
      const pr = await fetch(`/api/app/settings/plan?tenant=${encodeURIComponent(tenant)}`, { cache: "no-store" });
      const pj = await safeJson(pr);
      if (pj?.ok) setPlan(String(pj.plan ?? "COMPLIANCE"));
    } catch {
      // ignore
    }

    // clients (Agency only)
    try {
      const ur = await fetch(`/api/app/tenants/${encodeURIComponent(tenant)}/users`, { cache: "no-store" });
      const uj = await safeJson(ur);
      if (uj?.ok && Array.isArray(uj.members)) {
        const c = (uj.members as Member[]).filter((m) => String(m.role).toUpperCase() === "CLIENT");
        setClients(c);
        if (!selectedClientUserId && c.length) setSelectedClientUserId(c[0].userId);
      }
    } catch {
      // ignore
    }
  }

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function saveSchedule() {
    if (!schedule) return;
    setBusy(true);
    setMsg(null);
    try {
      const r = await fetch(`${apiBase}/schedule?tenant=${encodeURIComponent(tenant)}`, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ ...schedule }),
      });
      const j = await safeJson(r);
      if (!j?.ok) throw new Error(j?.error || "save_failed");
      setMsg("Schedule saved.");
      await load();
    } catch (e: any) {
      setMsg(`Error: ${e?.message || "save_failed"}`);
    } finally {
      setBusy(false);
    }
  }

  async function generateNow(scope: "tenant" | "client") {
    setBusy(true);
    setMsg(null);
    try {
      const payload: any = { days };
      if (scope === "client") {
        if (!isAgency) throw new Error("client_packs_require_agency");
        if (!selectedClientUserId) throw new Error("select_client");
        payload.clientUserId = selectedClientUserId;
      }

      const r = await fetch(`${apiBase}/generate-now?tenant=${encodeURIComponent(tenant)}`, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify(payload),
      });
      const j = await safeJson(r);
      if (!j?.ok) throw new Error(j?.error || "generate_failed");
      setMsg("Evidence pack generated. Downloading latest…");

      const qs = scope === "client" ? `&clientUserId=${encodeURIComponent(selectedClientUserId)}` : "";
      window.location.href = `${apiBase}/latest?tenant=${encodeURIComponent(tenant)}${qs}`;
      await load();
    } catch (e: any) {
      setMsg(`Error: ${e?.message || "generate_failed"}`);
    } finally {
      setBusy(false);
    }
  }

  const dlLatestTenant = `${apiBase}/latest?tenant=${encodeURIComponent(tenant)}`;
  const dlLatestClient = `${apiBase}/latest?tenant=${encodeURIComponent(tenant)}&clientUserId=${encodeURIComponent(selectedClientUserId || "")}`;

  return (
    <main className="space-y-6">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold">Evidence Packs</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Downloadable, customer-ready exports — branded, shareable, integrity-checked.
          </p>
        </div>
        <Link href={`/app/${tenant}/evidence/bundles`} className="rounded-xl border bg-bg2/50 px-3 py-2 text-sm hover:bg-bg2">
          Back to Bundles
        </Link>
      </div>

      {msg ? <div className="text-sm text-muted-foreground">{msg}</div> : null}

      <AppCard className="p-4">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <div className="text-sm font-semibold">Generate pack now</div>
            <div className="mt-1 text-xs text-muted-foreground">Great for demos — it looks like a real deliverable.</div>
          </div>
          <div className="rounded-full border bg-bg2/50 px-3 py-1 text-xs text-muted-foreground">
            Plan: <span className="font-semibold text-foreground">{planKey(plan)}</span>
          </div>
        </div>

        <div className="mt-3 flex flex-wrap items-end gap-2">
          <div>
            <label className="text-xs text-muted-foreground">Days</label>
            <input
              value={days}
              onChange={(e) => setDays(Number(e.target.value || 30))}
              type="number"
              min={1}
              max={365}
              className="mt-1 w-24 rounded-xl border bg-transparent px-3 py-2 text-sm"
            />
          </div>

          <button
            onClick={() => generateNow("tenant")}
            disabled={busy}
            className="rounded-xl bg-primary px-4 py-2 text-sm text-primary-foreground hover:opacity-90 disabled:opacity-50"
          >
            Generate & Download
          </button>
          <a href={dlLatestTenant} className="rounded-xl border px-4 py-2 text-sm hover:bg-bg2">
            Download latest
          </a>
        </div>

        {isAgency ? (
          <div className="mt-4 rounded-xl border bg-bg2/30 p-3">
            <div className="text-sm font-semibold">Client-scoped pack (Agency)</div>
            <div className="mt-2 flex flex-wrap items-end gap-2">
              <div className="min-w-[260px]">
                <label className="text-xs text-muted-foreground">Client</label>
                <select
                  value={selectedClientUserId}
                  onChange={(e) => setSelectedClientUserId(e.target.value)}
                  className="mt-1 w-full rounded-xl border bg-transparent px-3 py-2 text-sm"
                >
                  {clients.length ? (
                    clients.map((c) => (
                      <option key={c.userId} value={c.userId}>
                        {(c.name ? `${c.name} — ` : "") + c.email}
                      </option>
                    ))
                  ) : (
                    <option value="">No clients yet</option>
                  )}
                </select>
              </div>

              <button
                onClick={() => generateNow("client")}
                disabled={busy || !selectedClientUserId}
                className="rounded-xl border px-4 py-2 text-sm hover:bg-bg2 disabled:opacity-50"
              >
                Generate client pack
              </button>
              <a
                href={dlLatestClient}
                className="rounded-xl border px-4 py-2 text-sm hover:bg-bg2"
                aria-disabled={!selectedClientUserId}
              >
                Download client latest
              </a>
            </div>
            <div className="mt-2 text-xs text-muted-foreground">
              Tip: create CLIENT users in Users → they appear here automatically.
            </div>
          </div>
        ) : null}
      </AppCard>

      <AppCard className="p-4">
        <div className="text-sm font-semibold">Monthly schedule (auto-generate)</div>
        <div className="mt-2 grid gap-3 md:grid-cols-2">
          <div>
            <label className="text-xs text-muted-foreground">Enabled</label>
            <div className="mt-1">
              <input
                type="checkbox"
                checked={!!schedule?.enabled}
                onChange={(e) => setSchedule((s) => (s ? { ...s, enabled: e.target.checked } : s))}
              />
            </div>
          </div>

          <div>
            <label className="text-xs text-muted-foreground">Day of month (1–28)</label>
            <input
              value={schedule?.dayOfMonth ?? 1}
              onChange={(e) => setSchedule((s) => (s ? { ...s, dayOfMonth: Number(e.target.value || 1) } : s))}
              type="number"
              min={1}
              max={28}
              className="mt-1 w-full rounded-xl border bg-transparent px-3 py-2 text-sm"
            />
          </div>

          <div>
            <label className="text-xs text-muted-foreground">Hour (0–23)</label>
            <input
              value={schedule?.hour ?? 9}
              onChange={(e) => setSchedule((s) => (s ? { ...s, hour: Number(e.target.value || 9) } : s))}
              type="number"
              min={0}
              max={23}
              className="mt-1 w-full rounded-xl border bg-transparent px-3 py-2 text-sm"
            />
          </div>

          <div>
            <label className="text-xs text-muted-foreground">Timezone</label>
            <input
              value={schedule?.timezone ?? "Europe/Madrid"}
              onChange={(e) => setSchedule((s) => (s ? { ...s, timezone: e.target.value } : s))}
              className="mt-1 w-full rounded-xl border bg-transparent px-3 py-2 text-sm"
            />
          </div>

          <div className="md:col-span-2">
            <div className="mt-2 flex flex-wrap items-center gap-2">
              <button
                onClick={saveSchedule}
                disabled={busy}
                className="rounded-xl border px-4 py-2 text-sm hover:bg-bg2 disabled:opacity-50"
              >
                Save schedule
              </button>
              {schedule?.lastRunAt ? (
                <span className="text-xs text-muted-foreground">Last run: {String(schedule.lastRunAt).slice(0, 19)}</span>
              ) : (
                <span className="text-xs text-muted-foreground">Not run yet</span>
              )}
            </div>
          </div>
        </div>

        <div className="mt-3 text-xs text-muted-foreground">
          To automate, call <span className="font-mono">/api/cron/evidence-packs?secret=CRON_SECRET</span> daily (Vercel cron, GitHub action, etc.).
        </div>
      </AppCard>
    </main>
  );
}
