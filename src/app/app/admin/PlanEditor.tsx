"use client";

import { useEffect, useMemo, useState } from "react";
import { AppButton } from "@/components/app-ui/AppButton";
import { AppCard } from "@/components/app-ui/AppCard";
import { AppInput } from "@/components/app-ui/AppInput";

type PlanTier = "CONTROL" | "COMPLIANCE" | "ASSURED";

const PLAN_LABEL: Record<PlanTier, string> = {
  CONTROL: "Control",
  COMPLIANCE: "Compliance",
  ASSURED: "Assured",
};

export function PlanEditor({ tenantId }: { tenantId: string }) {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [plan, setPlan] = useState<PlanTier>("COMPLIANCE");
  const [webSimple, setWebSimple] = useState(false);
  const [securityAddon, setSecurityAddon] = useState(false);

  // Custom module bundle (lets you disable/enable modules per-tenant)
  const [customModules, setCustomModules] = useState(false);
  const [ticketsEnabled, setTicketsEnabled] = useState(true);
  const [intakeEnabled, setIntakeEnabled] = useState(true);
  const [monitoringEnabled, setMonitoringEnabled] = useState(true);
  const [legalEnabled, setLegalEnabled] = useState(false);

  // ✅ These were missing (you were calling setters that didn't exist)
  const [securityEnabled, setSecurityEnabled] = useState(false);
  const [webEnabled, setWebEnabled] = useState(false);

  // MFA policy (tenant-level)
  const [mfaRequired, setMfaRequired] = useState(false);

  const [msg, setMsg] = useState<string | null>(null);

  const BASE_MODULES: Record<
    PlanTier,
    { tickets: boolean; intake: boolean; monitoring: boolean; legal: boolean; security: boolean; web: boolean }
  > = {
    CONTROL: { tickets: true, intake: true, monitoring: true, legal: false, security: false, web: false },
    COMPLIANCE: { tickets: true, intake: true, monitoring: true, legal: true, security: false, web: false },
    ASSURED: { tickets: true, intake: true, monitoring: true, legal: true, security: true, web: false },
  };

  // Keep module toggles aligned with selected plan + addons unless user enables custom bundle.
  useEffect(() => {
    if (customModules) return;

    const base = { ...BASE_MODULES[plan] };
    if (webSimple) base.web = true;
    if (securityAddon || plan === "ASSURED") base.security = true;

    setTicketsEnabled(!!base.tickets);
    setIntakeEnabled(!!base.intake);
    setMonitoringEnabled(!!base.monitoring);
    setLegalEnabled(!!base.legal);

    // ✅ align also these (so UI stays coherent)
    setSecurityEnabled(!!base.security);
    setWebEnabled(!!base.web);
  }, [plan, webSimple, securityAddon, customModules]);

  // Optional overrides (advanced)
  const [seats, setSeats] = useState<string>("");
  const [domains, setDomains] = useState<string>("");

  useEffect(() => {
    (async () => {
      setLoading(true);
      setMsg(null);
      try {
        const res = await fetch(`/api/admin/tenant-plan?tenantId=${encodeURIComponent(tenantId)}`, { cache: "no-store" });
        const data = await res.json();

        if (data?.ok) {
          setPlan((data.plan as PlanTier) ?? "COMPLIANCE");

          const f = data.features;
          const modules = f?.modules ?? null;

          // Addons best-effort detection
          setWebSimple(!!modules?.web);

          const secEnabled = !!modules?.security;
          setSecurityAddon((data.plan !== "ASSURED") && secEnabled);

          // Module toggles (merged values)
          setTicketsEnabled(!!modules?.tickets);
          setIntakeEnabled(!!modules?.intake || !!modules?.leads);
          setMonitoringEnabled(!!modules?.monitoring);
          setLegalEnabled(!!modules?.legal);

          // ✅ these were referenced but not defined before
          setSecurityEnabled(!!modules?.security);
          setWebEnabled(!!modules?.web);

          setMfaRequired(!!data.mfaRequired);

          // Assume custom if any module was overridden (best-effort)
          setCustomModules(!!data.planFeatures?.overrides?.modules);

          const lim = f?.limits ?? null;
          setSeats(lim?.seats ? String(lim.seats) : "");
          setDomains(lim?.domains ? String(lim.domains) : "");
        }
      } catch {
        // ignore
      } finally {
        setLoading(false);
      }
    })();
  }, [tenantId]);

  const canToggleSecurityAddon = plan !== "ASSURED";

  const payloadPreview = useMemo(() => {
    return {
      plan,
      addons: { webSimple, security: canToggleSecurityAddon ? securityAddon : false },
      mfaRequired: !!mfaRequired,
      overrides: {
        modules: {
          tickets: !!ticketsEnabled,
          intake: !!intakeEnabled,
          monitoring: !!monitoringEnabled,
          legal: !!legalEnabled,
        },
        ...(seats.trim() ? { limits: { seats: Number(seats) } } : {}),
        ...(domains.trim()
          ? { limits: { ...(seats.trim() ? { seats: Number(seats) } : {}), domains: Number(domains) } }
          : {}),
      },
    };
  }, [plan, webSimple, securityAddon, seats, domains, canToggleSecurityAddon, ticketsEnabled, intakeEnabled, monitoringEnabled, legalEnabled, mfaRequired]);

  const save = async () => {
    setSaving(true);
    setMsg(null);
    try {
      const overrides: any = {};
      overrides.modules = {
        tickets: !!ticketsEnabled,
        intake: !!intakeEnabled,
        monitoring: !!monitoringEnabled,
        legal: !!legalEnabled,
      };

      if (seats.trim() || domains.trim()) {
        overrides.limits = {};
        if (seats.trim()) overrides.limits.seats = Number(seats);
        if (domains.trim()) overrides.limits.domains = Number(domains);
      }

      const res = await fetch("/api/admin/tenant-plan", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          tenantId,
          plan,
          addons: { webSimple, security: canToggleSecurityAddon ? securityAddon : false },
          mfaRequired: !!mfaRequired,
          overrides: Object.keys(overrides).length ? overrides : undefined,
        }),
      });

      const data = await res.json();
      if (!data?.ok) {
        setMsg(data?.error ?? "Error saving plan");
        return;
      }
      setMsg("Saved ✅");
    } catch {
      setMsg("Error saving plan");
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return <div className="text-xs text-muted-foreground">Loading plan…</div>;
  }

  return (
    <AppCard className="p-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <div className="text-sm font-semibold">Plan & modules</div>
          <div className="mt-0.5 text-xs text-muted-foreground">
            Tenant plan controls sidebar + access to modules.
          </div>
        </div>

        <div className="flex items-center gap-2">
          <AppButton variant="secondary" size="sm" onClick={save} disabled={saving}>
            {saving ? "Saving…" : "Save"}
          </AppButton>
        </div>
      </div>

      {msg ? <div className="mt-3 rounded-xl border bg-bg2/40 px-3 py-2 text-xs">{msg}</div> : null}

      <div className="mt-4 grid gap-3 md:grid-cols-3">
        <label className="text-xs">
          Plan
          <select
            className="mt-1 w-full rounded-xl border border-border bg-bg2/50 px-3 py-2 text-sm text-foreground backdrop-blur transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand/30 focus-visible:border-brand2"
            value={plan}
            onChange={(e) => {
              const v = e.target.value as PlanTier;
              setPlan(v);
              if (v === "ASSURED") setSecurityAddon(false);
            }}
          >
            {(["CONTROL", "COMPLIANCE", "ASSURED"] as PlanTier[]).map((p) => (
              <option key={p} value={p}>
                {PLAN_LABEL[p]}
              </option>
            ))}
          </select>
        </label>

        <label className="text-xs">
          Seats (override)
          <AppInput
            value={seats}
            onChange={(e) => setSeats(e.target.value)}
            placeholder="e.g. 5"
            className="mt-1"
          />
        </label>

        <label className="text-xs">
          Domains (override)
          <AppInput
            value={domains}
            onChange={(e) => setDomains(e.target.value)}
            placeholder="e.g. 2"
            className="mt-1"
          />
        </label>
      </div>

      <div className="mt-4 grid gap-2">
        <label className="flex items-center gap-2 text-sm">
          <input type="checkbox" checked={webSimple} onChange={(e) => setWebSimple(e.target.checked)} />
          Web Simple (builder)
        </label>

        <label className={"flex items-center gap-2 text-sm " + (!canToggleSecurityAddon ? "opacity-60" : "")}>
          <input
            type="checkbox"
            checked={canToggleSecurityAddon ? securityAddon : true}
            disabled={!canToggleSecurityAddon}
            onChange={(e) => setSecurityAddon(e.target.checked)}
          />
          Security add-on (MFA + advanced audit + alerts)
          {!canToggleSecurityAddon ? <span className="text-xs text-muted-foreground">(included in Assured)</span> : null}
        </label>

        <label className={"flex items-center gap-2 text-sm " + (!securityEnabled ? "opacity-60" : "")}>
          <input
            type="checkbox"
            checked={!!mfaRequired}
            disabled={!securityEnabled}
            onChange={(e) => setMfaRequired(e.target.checked)}
          />
          Require MFA for this tenant
          {!securityEnabled ? (
            <span className="text-xs text-muted-foreground">(enable Security module first)</span>
          ) : (
            <span className="text-xs text-muted-foreground">(policy, not per-user)</span>
          )}
        </label>
      </div>

      <div className="mt-4 rounded-xl border bg-bg2/30 p-3">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div>
            <div className="text-sm font-medium">Module toggles</div>
            <div className="text-xs text-muted-foreground">
              Fine-tune what this tenant gets (e.g., Intake-only).
            </div>
          </div>
          <AppButton
            variant="secondary"
            size="sm"
            onClick={() => {
              setCustomModules(false);
              const base = BASE_MODULES[plan];
              setTicketsEnabled(!!base.tickets);
              setIntakeEnabled(!!base.intake);
              setMonitoringEnabled(!!base.monitoring);
              setLegalEnabled(!!base.legal);
              setSecurityEnabled(!!base.security);
              setWebEnabled(!!base.web);
            }}
          >
            Reset to plan defaults
          </AppButton>
        </div>

        <div className="mt-3 grid gap-2 md:grid-cols-2">
          <label className="flex items-center gap-2 text-sm">
            <input
              type="checkbox"
              checked={ticketsEnabled}
              onChange={(e) => {
                setCustomModules(true);
                setTicketsEnabled(e.target.checked);
              }}
            />
            Tickets (ops workflow)
          </label>

          <label className="flex items-center gap-2 text-sm">
            <input
              type="checkbox"
              checked={intakeEnabled}
              onChange={(e) => {
                setCustomModules(true);
                setIntakeEnabled(e.target.checked);
              }}
            />
            Intake (public contact → LEAD)
          </label>

          <label className="flex items-center gap-2 text-sm">
            <input
              type="checkbox"
              checked={monitoringEnabled}
              onChange={(e) => {
                setCustomModules(true);
                setMonitoringEnabled(e.target.checked);
              }}
            />
            Monitoring (uptime / SSL)
          </label>

          <label className="flex items-center gap-2 text-sm">
            <input
              type="checkbox"
              checked={legalEnabled}
              onChange={(e) => {
                setCustomModules(true);
                setLegalEnabled(e.target.checked);
              }}
            />
            Legal module
          </label>
        </div>

        <div className="mt-2 text-xs text-muted-foreground">
          Note: Security & Web are controlled by the plan + add-ons above.
        </div>
      </div>

      <details className="mt-4">
        <summary className="cursor-pointer text-xs text-muted-foreground">Preview payload</summary>
        <pre className="mt-2 overflow-auto rounded-xl border bg-bg2/40 p-3 text-[11px]">
          {JSON.stringify(payloadPreview, null, 2)}
        </pre>
      </details>
    </AppCard>
  );
}
