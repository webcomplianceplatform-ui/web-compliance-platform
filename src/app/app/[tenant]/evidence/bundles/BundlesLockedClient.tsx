"use client";

import { useMemo, useState } from "react";

type TargetPlan = "Business" | "Agency";

export default function BundlesLockedClient({
  tenant,
  currentPlanLabel,
  retentionDays,
}: {
  tenant: string;
  currentPlanLabel: string;
  retentionDays: number;
}) {
  const [open, setOpen] = useState(false);
  const [email, setEmail] = useState("");
  const [targetPlan, setTargetPlan] = useState<TargetPlan>("Business");
  const [domains, setDomains] = useState("1");
  const [clients, setClients] = useState("0");
  const [notes, setNotes] = useState("");
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<string | null>(null);

  const retentionText = useMemo(() => {
    return `Starter keeps ${retentionDays} days of evidence visible. Business keeps 90 days. Agency keeps 365+.`;
  }, [retentionDays]);

  async function submit() {
    setLoading(true);
    setResult(null);
    try {
      const res = await fetch(`/api/app/billing/request-upgrade`, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          tenant,
          desiredPlan: targetPlan === "Agency" ? "AGENCY" : "BUSINESS",
          contactEmail: email || undefined,
          domainsCount: Number(domains || "0") || undefined,
          message: [
            `Clients (Agency): ${clients || "0"}`,
            notes ? `Notes: ${notes}` : null,
            `Source: evidence_export_paywall`,
          ].filter(Boolean).join("\n"),
        }),
      });
      const data = await res.json();
      if (!data.ok) {
        setResult(`Error: ${data.error ?? res.status}`);
      } else {
        setResult("Request sent. We’ll reach out to enable Business/Agency on your tenant.");
      }
    } catch (e: any) {
      setResult(`Error: ${e?.message ?? "request failed"}`);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="rounded-2xl border bg-bg2/30 p-4">
      <div className="text-sm font-semibold">Export locked on {currentPlanLabel}</div>
      <div className="mt-1 text-sm text-muted-foreground">
        You can generate evidence inside the platform, but exporting bundles is available on Business and Agency.
      </div>
      <div className="mt-2 text-xs text-muted-foreground">{retentionText}</div>

      <div className="mt-4 flex flex-wrap gap-2">
        <button
          onClick={() => setOpen(true)}
          className="inline-flex items-center rounded-xl bg-primary px-4 py-2 text-sm text-primary-foreground transition hover:opacity-90"
        >
          Request upgrade
        </button>
        <a
          href={`/app/${tenant}/evidence`}
          className="inline-flex items-center rounded-xl border bg-bg2/60 px-4 py-2 text-sm transition hover:bg-bg2/80"
        >
          Back to evidence →
        </a>
      </div>

      {open ? (
        <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/40 p-4 md:items-center">
          <div className="w-full max-w-lg rounded-2xl border bg-background p-4 shadow-lg">
            <div className="flex items-start justify-between gap-3">
              <div>
                <div className="text-lg font-semibold">Request plan upgrade</div>
                <div className="mt-1 text-sm text-muted-foreground">
                  Tell us what you need and we’ll enable the right tier.
                </div>
              </div>
              <button
                onClick={() => setOpen(false)}
                className="rounded-xl border bg-bg2/60 px-3 py-1 text-sm transition hover:bg-bg2/80"
              >
                Close
              </button>
            </div>

            <div className="mt-4 grid gap-3">
              <label className="grid gap-1">
                <span className="text-xs text-muted-foreground">Email (so we can reply)</span>
                <input
                  className="w-full rounded-xl border bg-bg2/20 px-3 py-2 text-sm"
                  placeholder="you@company.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                />
              </label>

              <label className="grid gap-1">
                <span className="text-xs text-muted-foreground">Plan</span>
                <select
                  className="w-full rounded-xl border bg-bg2/20 px-3 py-2 text-sm"
                  value={targetPlan}
                  onChange={(e) => setTargetPlan(e.target.value as TargetPlan)}
                >
                  <option value="Business">Business (90 days + exports)</option>
                  <option value="Agency">Agency (365+ days + clients)</option>
                </select>
              </label>

              <div className="grid grid-cols-2 gap-3">
                <label className="grid gap-1">
                  <span className="text-xs text-muted-foreground">Domains</span>
                  <input
                    className="w-full rounded-xl border bg-bg2/20 px-3 py-2 text-sm"
                    value={domains}
                    onChange={(e) => setDomains(e.target.value)}
                    inputMode="numeric"
                  />
                </label>
                <label className="grid gap-1">
                  <span className="text-xs text-muted-foreground">Clients (Agency)</span>
                  <input
                    className="w-full rounded-xl border bg-bg2/20 px-3 py-2 text-sm"
                    value={clients}
                    onChange={(e) => setClients(e.target.value)}
                    inputMode="numeric"
                  />
                </label>
              </div>

              <label className="grid gap-1">
                <span className="text-xs text-muted-foreground">Notes</span>
                <textarea
                  className="min-h-[90px] w-full rounded-xl border bg-bg2/20 px-3 py-2 text-sm"
                  placeholder="Any details about your use case…"
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                />
              </label>

              <button
                disabled={loading}
                onClick={submit}
                className="inline-flex items-center justify-center rounded-xl bg-primary px-4 py-2 text-sm text-primary-foreground transition hover:opacity-90 disabled:opacity-50"
              >
                {loading ? "Sending…" : "Send request"}
              </button>

              {result ? <div className="rounded-xl border bg-bg2/20 p-3 text-sm">{result}</div> : null}
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
}
