"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";

import { AppCard } from "@/components/app-ui/AppCard";
import { AppButton } from "@/components/app-ui/AppButton";
import { AppInput } from "@/components/app-ui/AppInput";
import { useToast } from "@/components/ui/toast";

type PlanTier = "CONTROL" | "COMPLIANCE" | "ASSURED" | string;

function planLabel(plan: PlanTier) {
  const p = String(plan ?? "").toUpperCase();
  if (p === "CONTROL") return "Starter";
  if (p === "COMPLIANCE") return "Business";
  if (p === "ASSURED") return "Agency";
  return "Custom";
}

function normalizeDomain(input: string) {
  const raw = input.trim();
  if (!raw) return "";
  const noProto = raw.replace(/^https?:\/\//i, "");
  const host = noProto.split("/")[0] ?? "";
  return host.toLowerCase();
}

async function safeJson(res: Response) {
  try {
    return await res.json();
  } catch {
    return null;
  }
}

export default function OnboardingWizard({
  tenant,
  plan,
  initial,
}: {
  tenant: string;
  plan: PlanTier;
  initial: {
    checksTotal: number;
    monitorEventsTotal: number;
    connected: boolean;
    lastConnectedAt: string | null;
  };
}) {
  const toast = useToast();

  const [domain, setDomain] = useState("");
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  const [checksTotal, setChecksTotal] = useState(initial.checksTotal);
  const [monitorEventsTotal, setMonitorEventsTotal] = useState(initial.monitorEventsTotal);
  const [connected, setConnected] = useState(initial.connected);
  const [lastConnectedAt, setLastConnectedAt] = useState<string | null>(initial.lastConnectedAt);

  const origin = typeof window !== "undefined" ? window.location.origin : "";
  const snippet = useMemo(() => {
    const base = origin || "https://YOUR_APP_DOMAIN";
    return `<script defer src=\"${base}/api/public/wc.js?tenant=${encodeURIComponent(
      tenant
    )}\"></script>`;
  }, [origin, tenant]);

  const steps = useMemo(() => {
    const hasDomain = checksTotal > 0;
    const hasConnection = connected;
    const hasEvidence = hasConnection || monitorEventsTotal > 0;
    const canExport = String(plan).toUpperCase() !== "CONTROL";

    return {
      hasDomain,
      hasConnection,
      hasEvidence,
      canExport,
    };
  }, [checksTotal, connected, monitorEventsTotal, plan]);

  // Poll connection status for a short time while user is installing the script
  useEffect(() => {
    let t: any;
    let stopped = false;

    async function tick() {
      if (stopped) return;
      try {
        const res = await fetch(`/api/app/evidence/connection-status?tenant=${encodeURIComponent(tenant)}`);
        const data = await safeJson(res);
        if (data?.ok) {
          setConnected(!!data.connected);
          setLastConnectedAt(data.lastConnectedAt ?? null);
        }
      } catch {
        // ignore
      }
      t = setTimeout(tick, 4000);
    }

    // Only poll if not connected yet (avoid pointless traffic)
    if (!connected) tick();
    return () => {
      stopped = true;
      if (t) clearTimeout(t);
    };
  }, [tenant, connected]);

  async function refreshMonitoring() {
    try {
      const res1 = await fetch(`/api/app/monitor/checks?tenant=${encodeURIComponent(tenant)}`);
      const d1 = await safeJson(res1);
      if (d1?.ok && Array.isArray(d1.checks)) setChecksTotal(d1.checks.length);

      const res2 = await fetch(`/api/app/monitor/events?tenant=${encodeURIComponent(tenant)}`);
      const d2 = await safeJson(res2);
      if (d2?.ok && Array.isArray(d2.events)) setMonitorEventsTotal(d2.events.length);
    } catch {
      // ignore
    }
  }

  async function createDomainChecks() {
    setErr(null);
    const host = normalizeDomain(domain);
    if (!host) return setErr("domain_required");

    setBusy(true);
    try {
      // Create UPTIME + SSL checks for the root domain
      const target = `https://${host}`;
      const payloads = [
        { tenant, type: "UPTIME", targetUrl: target, intervalM: 10 },
        { tenant, type: "SSL", targetUrl: target, intervalM: 1440 },
      ];

      for (const body of payloads) {
        const res = await fetch(`/api/app/monitor/checks`, {
          method: "POST",
          headers: { "content-type": "application/json" },
          body: JSON.stringify(body),
        });
        const data = await safeJson(res);
        if (!data?.ok && data?.error !== "already_exists") {
          setErr(data?.error ?? "error");
          return;
        }
      }

      await refreshMonitoring();
      toast.push({ variant: "success", message: "Domain added (monitoring enabled)" });
    } finally {
      setBusy(false);
    }
  }

  async function copySnippet() {
    try {
      await navigator.clipboard.writeText(snippet);
      toast.push({ variant: "success", message: "Snippet copied" });
    } catch {
      toast.push({ variant: "error", message: "Could not copy. Select and copy manually." });
    }
  }

  async function runMonitoringNow() {
    setBusy(true);
    setErr(null);
    try {
      const res = await fetch("/api/app/monitor/run", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ tenant, force: true }),
      });
      const data = await safeJson(res);
      if (!data?.ok) {
        setErr(data?.error ?? "error");
        return;
      }
      await refreshMonitoring();
      toast.push({ variant: "success", message: "Monitoring ran. Evidence generated." });
    } finally {
      setBusy(false);
    }
  }

  async function tryExportBundle() {
    setBusy(true);
    setErr(null);
    try {
      const res = await fetch(
        `/api/app/security/evidence/export?tenant=${encodeURIComponent(tenant)}&days=90&format=json&kind=bundle`,
        { method: "GET" }
      );
      const data = await safeJson(res);

      if (res.status === 403 && data?.error === "export_locked") {
        toast.push({ variant: "error", message: "Export is locked on Starter. Upgrade to unlock." });
        return;
      }
      if (!data?.ok) {
        toast.push({ variant: "error", message: data?.error ?? "export_failed" });
        return;
      }

      // Download JSON as a file
      const blob = new Blob([JSON.stringify(data.bundle, null, 2)], { type: "application/json" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `evidence_${tenant}_90d.json`;
      document.body.appendChild(a);
      a.click();
      a.remove();
      URL.revokeObjectURL(url);

      toast.push({ variant: "success", message: "Evidence bundle exported" });
    } finally {
      setBusy(false);
    }
  }

  const doneCount = [steps.hasDomain, steps.hasConnection, steps.hasEvidence].filter(Boolean).length;

  return (
    <main className="mx-auto max-w-3xl p-6 space-y-6">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold">Get to proof in 5 minutes</h1>
          <p className="mt-2 text-sm text-muted-foreground">
            Complete these steps to generate your first evidence and (optionally) export a bundle.
          </p>
        </div>
        <div className="rounded-full border bg-bg2/50 px-3 py-1 text-xs font-medium text-muted-foreground">
          Plan: <span className="font-semibold text-foreground">{planLabel(plan)}</span>
        </div>
      </div>

      {err ? (
        <div className="rounded-xl border border-red-400/30 bg-red-500/5 p-3 text-sm text-red-600">
          Error: <span className="font-mono">{err}</span>
        </div>
      ) : null}

      <div className="grid gap-3">
        {/* Step 1 */}
        <AppCard className="p-5">
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div>
              <div className="text-sm font-semibold">{steps.hasDomain ? "✅" : "1"}. Add your first domain</div>
              <div className="mt-1 text-sm text-muted-foreground">
                We will automatically enable Uptime + SSL monitoring and generate operational evidence.
              </div>
            </div>
            {steps.hasDomain ? (
              <Link className="text-sm underline" href={`/app/${tenant}/monitor`}>Open monitoring</Link>
            ) : null}
          </div>

          {!steps.hasDomain ? (
            <div className="mt-4 flex flex-col gap-3 md:flex-row md:items-end">
              <label className="flex-1 text-sm">
                Domain
                <AppInput
                  className="mt-1"
                  placeholder="example.com"
                  value={domain}
                  onChange={(e) => setDomain(e.target.value)}
                />
              </label>
              <AppButton disabled={busy} onClick={createDomainChecks}>
                {busy ? "Working…" : "Add domain"}
              </AppButton>
            </div>
          ) : (
            <div className="mt-4 flex flex-wrap gap-2">
              <AppButton disabled={busy} onClick={runMonitoringNow}>
                {busy ? "Running…" : "Run checks now"}
              </AppButton>
              <div className="text-xs text-muted-foreground self-center">
                Checks: <span className="font-mono">{checksTotal}</span> · Events: <span className="font-mono">{monitorEventsTotal}</span>
              </div>
            </div>
          )}
        </AppCard>

        {/* Step 2 */}
        <AppCard className="p-5">
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div>
              <div className="text-sm font-semibold">{steps.hasConnection ? "✅" : "2"}. Install the evidence script</div>
              <div className="mt-1 text-sm text-muted-foreground">
                Paste this snippet into your website (before <span className="font-mono">&lt;/body&gt;</span>). It will create a proof trail.
              </div>
            </div>
            {steps.hasConnection && lastConnectedAt ? (
              <div className="text-xs text-muted-foreground">Connected: <span className="font-mono">{new Date(lastConnectedAt).toLocaleString()}</span></div>
            ) : (
              <div className="text-xs text-muted-foreground">Waiting for connection…</div>
            )}
          </div>

          <div className="mt-4 grid gap-2">
            <textarea
              readOnly
              className="w-full min-h-[72px] rounded-xl border bg-bg2/50 p-3 font-mono text-xs"
              value={snippet}
            />
            <div className="flex flex-wrap gap-2">
              <AppButton variant="secondary" onClick={copySnippet} disabled={busy}>
                Copy snippet
              </AppButton>
              <a className="text-sm underline self-center" href={`/t/${tenant}`} target="_blank">
                View public page ↗
              </a>
            </div>
            <div className="text-xs text-muted-foreground">
              Once installed, this page will auto-detect the connection (we poll every few seconds).
            </div>
            <div className="mt-2 text-xs text-muted-foreground">
              Evidence Packs (PDF downloads) require Storage: create a bucket named <span className="font-mono">evidence-packs</span> in Supabase Storage and set <span className="font-mono">SUPABASE_SERVICE_ROLE_KEY</span> on the server.
            </div>
          </div>
        </AppCard>

        {/* Step 3 */}
        <AppCard className="p-5">
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div>
              <div className="text-sm font-semibold">{steps.hasEvidence ? "✅" : "3"}. Confirm first evidence</div>
              <div className="mt-1 text-sm text-muted-foreground">
                You should now see evidence in the panel. This is your “aha moment”.
              </div>
            </div>
            <Link className="text-sm underline" href={`/app/${tenant}/evidence`}>
              Open evidence
            </Link>
          </div>

          <div className="mt-4 flex flex-wrap gap-2">
            <Link href={`/app/${tenant}/evidence/security`} className="text-sm underline">
              Security evidence
            </Link>
            <span className="text-xs text-muted-foreground self-center">·</span>
            <Link href={`/app/${tenant}/evidence/operations`} className="text-sm underline">
              Operations evidence
            </Link>
            <span className="text-xs text-muted-foreground self-center">·</span>
            <Link href={`/app/${tenant}/evidence/legal`} className="text-sm underline">
              Legal evidence
            </Link>
          </div>
        </AppCard>

        {/* Step 4 */}
        <AppCard className="p-5">
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div>
              <div className="text-sm font-semibold">4. Try exporting an Evidence Bundle</div>
              <div className="mt-1 text-sm text-muted-foreground">
                This is what you share with auditors, clients or partners. Starter is view-only.
              </div>
            </div>
            <Link className="text-sm underline" href={`/app/${tenant}/evidence/bundles`}>
              Bundles
            </Link>
          </div>

          <div className="mt-4 flex flex-wrap items-center gap-2">
            <AppButton disabled={busy} onClick={tryExportBundle}>
              {busy ? "Preparing…" : steps.canExport ? "Download bundle" : "Try download (locked)"}
            </AppButton>
            {!steps.canExport ? (
              <span className="text-xs text-muted-foreground">
                Locked on Starter. Upgrade to Business/Agency to export.
              </span>
            ) : null}
          </div>
        </AppCard>
      </div>

      <div className="flex flex-wrap items-center justify-between gap-2">
        <div className="text-sm text-muted-foreground">
          Progress: <span className="font-mono">{doneCount}</span> / <span className="font-mono">3</span>
        </div>
        <div className="flex gap-2">
          <Link className="rounded border px-3 py-2 text-sm" href={`/app/${tenant}`}>
            Go to dashboard
          </Link>
          <Link className="rounded border px-3 py-2 text-sm" href={`/app/${tenant}/evidence`}>
            Evidence hub
          </Link>
        </div>
      </div>
    </main>
  );
}
