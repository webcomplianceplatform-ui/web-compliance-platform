"use client";

import { useEffect, useMemo, useState } from "react";
import { useSearchParams } from "next/navigation";
import { defaultTheme, TenantTheme } from "@/lib/theme";
import { AppButton } from "@/components/app-ui/AppButton";
import { AppInput } from "@/components/app-ui/AppInput";
import { AppCard } from "@/components/app-ui/AppCard";

type TabId = "public" | "domain" | "notifications" | "seo" | "legal" | "usage" | "billing";

function cn(...classes: Array<string | false | null | undefined>) {
  return classes.filter(Boolean).join(" ");
}

const TAB_ACTIVE = "border-transparent bg-[#dbf676] text-black";
const TAB_INACTIVE = "text-foreground hover:bg-[#dbf676] hover:text-black";

function SideItem({
  active,
  title,
  description,
  onClick,
}: {
  active: boolean;
  title: string;
  description: string;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        "w-full rounded-xl border px-3 py-2 text-left transition",
        "hover:-translate-y-[1px] hover:shadow-sm",
        active ? TAB_ACTIVE : `bg-transparent ${TAB_INACTIVE}`
      )}
    >
      <div className="text-sm font-medium">{title}</div>
      <div className="mt-0.5 text-xs text-muted-foreground">{description}</div>
    </button>
  );
}

function CardHeader({
  title,
  description,
}: {
  title: string;
  description?: React.ReactNode;
}) {
  return (
    <div className="space-y-1">
      <div className="text-base font-semibold">{title}</div>
      {description ? (
        <div className="text-sm text-muted-foreground">{description}</div>
      ) : null}
    </div>
  );
}

export default function SettingsClient({
  tenant,
  isSuperadmin,
}: {
  tenant: string;
  isSuperadmin: boolean;
}) {
  const searchParams = useSearchParams();
  const [tab, setTab] = useState<TabId>("public");

  // Support deep-links like /settings?tab=legal
  useEffect(() => {
    const raw = searchParams.get("tab") as TabId | null;
    if (!raw) return;
    const allowed: TabId[] = ["public", "domain", "notifications", "seo", "legal", "usage", "billing"];
    if (allowed.includes(raw)) setTab(raw);
  }, [searchParams]);

  const [theme, setTheme] = useState<TenantTheme>(defaultTheme);
  const [customDomain, setCustomDomain] = useState<string>("");
  const [customDomainVerifiedAt, setCustomDomainVerifiedAt] = useState<string | null>(null);
  const [msg, setMsg] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [domainLoading, setDomainLoading] = useState(false);
  const [saving, setSaving] = useState(false);

  const [planInfo, setPlanInfo] = useState<{ plan: string } | null>(null);
  const [usageInfo, setUsageInfo] = useState<any>(null);
  const [usageLoading, setUsageLoading] = useState(false);
  const [upgradeMsg, setUpgradeMsg] = useState<string | null>(null);
  const [upgradeLoading, setUpgradeLoading] = useState(false);
  const [desiredPlan, setDesiredPlan] = useState<"BUSINESS" | "AGENCY">("BUSINESS");
  const [domainsCount, setDomainsCount] = useState<number>(1);
  const [contactEmail, setContactEmail] = useState<string>("");
  const [upgradeNotes, setUpgradeNotes] = useState<string>("");

  const navItems = useMemo(() => theme.navigation?.primary ?? [], [theme.navigation?.primary]);

  useEffect(() => {
    if (tab !== "usage") return;
    (async () => {
      setUsageLoading(true);
      try {
        const r = await fetch(`/api/app/usage?tenant=${encodeURIComponent(tenant)}`, { cache: "no-store" });
        const j = await r.json();
        if (j?.ok) setUsageInfo(j);
        else setUsageInfo(null);
      } catch {
        setUsageInfo(null);
      } finally {
        setUsageLoading(false);
      }
    })();
  }, [tab, tenant]);

  useEffect(() => {
    (async () => {
      setLoading(true);
      setMsg(null);
      try {
        const res = await fetch(`/api/app/settings/theme?tenant=${encodeURIComponent(tenant)}`, {
          cache: "no-store",
        });
        const data = await res.json();
        if (data.ok && data.theme) setTheme(data.theme as TenantTheme);
        else setTheme(defaultTheme);
      } catch {
        setTheme(defaultTheme);
        setMsg("No se pudo cargar el theme (usando defaults).");
      } finally {
        setLoading(false);
      }
    })();
  }, [tenant]);

  useEffect(() => {
    (async () => {
      try {
        const res = await fetch(`/api/app/settings/plan?tenant=${encodeURIComponent(tenant)}`, { cache: "no-store" });
        const data = await res.json();
        if (data?.ok) setPlanInfo({ plan: String(data.plan ?? "COMPLIANCE") });
      } catch {
        // ignore
      }
    })();
  }, [tenant]);

  useEffect(() => {
    (async () => {
      setDomainLoading(true);
      try {
        const res = await fetch(`/api/app/settings/domain?tenant=${encodeURIComponent(tenant)}`, {
          cache: "no-store",
        });
        const data = await res.json();
        if (data.ok) {
          setCustomDomain(data.customDomain ?? "");
          setCustomDomainVerifiedAt(data.customDomainVerifiedAt ?? null);
        }
      } finally {
        setDomainLoading(false);
      }
    })();
  }, [tenant]);

  const saveTheme = async () => {
    setMsg(null);
    setSaving(true);
    try {
      // 🔐 Save only safe theme keys here. Sensitive keys go through dedicated endpoints.
      const safe: any = { ...(theme as any) };
      delete safe.legal;
      delete safe.legalDocs;
      delete safe.seo;
      delete safe.siteBuilder;

      const res = await fetch("/api/app/settings/theme", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ tenant, theme: safe }),
      });
      const data = await res.json();
      if (!data.ok) {
        setMsg(`Error: ${data.error ?? "error"}`);
        return;
      }

      // Sensitive writes (only superadmin)
      if (isSuperadmin) {
        if ((theme as any).legal !== undefined || (theme as any).legalDocs !== undefined) {
          const r2 = await fetch("/api/app/settings/legal", {
            method: "POST",
            headers: { "content-type": "application/json" },
            body: JSON.stringify({
              tenant,
              legal: (theme as any).legal ?? null,
              legalDocs: (theme as any).legalDocs ?? null,
            }),
          });
          const d2 = await r2.json();
          if (!d2.ok) {
            setMsg(`Saved theme, but Legal failed: ${d2.error ?? "error"}`);
            return;
          }
        }

        if ((theme as any).seo !== undefined) {
          const r3 = await fetch("/api/app/settings/seo", {
            method: "POST",
            headers: { "content-type": "application/json" },
            body: JSON.stringify({ tenant, seo: (theme as any).seo ?? null }),
          });
          const d3 = await r3.json();
          if (!d3.ok) {
            setMsg(`Saved theme, but SEO failed: ${d3.error ?? "error"}`);
            return;
          }
        }
      }

      setMsg("Saved ✅");
    } catch {
      setMsg("Error: could not save");
    } finally {
      setSaving(false);
    }
  };

  const saveCustomDomain = async () => {
    setMsg(null);
    setDomainLoading(true);
    try {
      const res = await fetch(`/api/app/settings/domain`, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ tenant, customDomain: customDomain.trim() ? customDomain.trim() : null }),
      });
      const data = await res.json();
      if (!data.ok) {
        setMsg(`No se pudo guardar el dominio: ${data.error ?? "error"}`);
        return;
      }
      setCustomDomain(data.customDomain ?? "");
      setCustomDomainVerifiedAt(data.customDomainVerifiedAt ?? null);
      setMsg("Dominio guardado. Ahora verifica DNS.");
      setTab("domain");
    } catch {
      setMsg("No se pudo guardar el dominio.");
    } finally {
      setDomainLoading(false);
    }
  };

  const verifyCustomDomain = async () => {
    setMsg(null);
    setDomainLoading(true);
    try {
      const res = await fetch(`/api/app/settings/domain/verify`, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ tenant }),
      });
      const data = await res.json();
      if (!data.ok) {
        setMsg(`Verificación fallida: ${data.error ?? "error"}`);
        return;
      }
      setCustomDomainVerifiedAt(data.customDomainVerifiedAt ?? null);
      setMsg("Dominio verificado ✅");
    } catch {
      setMsg("No se pudo verificar el dominio.");
    } finally {
      setDomainLoading(false);
    }
  };

  const setHero = (patch: Partial<NonNullable<TenantTheme["hero"]>>) => {
    setTheme((t) => ({
      ...t,
      hero: { ...(t.hero ?? { headline: "" }), ...patch },
    }));
  };

  const setSeo = (patch: Partial<NonNullable<TenantTheme["seo"]>>) => {
    setTheme((t) => ({
      ...t,
      seo: { ...(t.seo ?? {}), ...patch },
    }));
  };

  const setContact = (patch: Partial<NonNullable<NonNullable<TenantTheme["pages"]>["contact"]>>) => {
    setTheme((t) => ({
      ...t,
      pages: {
        ...(t.pages ?? {}),
        contact: { ...((t.pages?.contact ?? {}) as any), ...patch },
      },
    }));
  };

  const setFooter = (patch: Partial<NonNullable<TenantTheme["footer"]>>) => {
    setTheme((t) => ({
      ...t,
      footer: { ...(t.footer ?? {}), ...patch },
    }));
  };

  const setLegalDocs = (patch: Partial<NonNullable<TenantTheme["legalDocs"]>>) => {
    setTheme((t) => ({
      ...t,
      legalDocs: { ...(t.legalDocs ?? {}), ...patch },
    }));
  };

  const setLegal = (patch: Partial<NonNullable<TenantTheme["legal"]>>) => {
    setTheme((t) => ({
      ...t,
      legal: { ...(t.legal ?? {}), ...patch },
    }));
  };

  const setNavItem = (idx: number, patch: Partial<(typeof navItems)[number]>) => {
    setTheme((t) => {
      const cur = t.navigation?.primary ?? [];
      const next = cur.map((it, i) => (i === idx ? { ...it, ...patch } : it));
      return {
        ...t,
        navigation: {
          ...(t.navigation ?? {}),
          primary: next,
        },
      };
    });
  };

  const addNavItem = () => {
    setTheme((t) => {
      const cur = t.navigation?.primary ?? [];
      if (cur.length >= 8) return t;
      return {
        ...t,
        navigation: {
          ...(t.navigation ?? {}),
          primary: [...cur, { label: "Nuevo", href: "/" }],
        },
      };
    });
  };

  const removeNavItem = (idx: number) => {
    setTheme((t) => {
      const cur = t.navigation?.primary ?? [];
      return {
        ...t,
        navigation: {
          ...(t.navigation ?? {}),
          primary: cur.filter((_, i) => i !== idx),
        },
      };
    });
  };

  return (
    <main className="mx-auto max-w-7xl space-y-6">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold">Settings</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Todo lo necesario para tu tenant <span className="font-mono">{tenant}</span>: web pública, dominio, SEO, legal y avisos.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <AppButton onClick={saveTheme} disabled={saving} className="shadow-sm">
            {saving ? "Saving…" : "Save changes"}
          </AppButton>
        </div>
      </div>

      {msg ? <div className="glass rounded-xl px-4 py-3 text-sm">{msg}</div> : null}

      {/* Mobile: compact tab bar */}
      <div className="glass -mx-1 flex gap-2 overflow-x-auto rounded-2xl p-2 lg:hidden">
        <button
          type="button"
          onClick={() => setTab("public")}
          className={cn("shrink-0 rounded-xl border px-3 py-2 text-sm transition", tab === "public" ? TAB_ACTIVE : TAB_INACTIVE)}
        >
          Public
        </button>
        <button
          type="button"
          onClick={() => setTab("domain")}
          className={cn("shrink-0 rounded-xl border px-3 py-2 text-sm transition", tab === "domain" ? TAB_ACTIVE : TAB_INACTIVE)}
        >
          Domain
        </button>
        <button
          type="button"
          onClick={() => setTab("seo")}
          className={cn("shrink-0 rounded-xl border px-3 py-2 text-sm transition", tab === "seo" ? TAB_ACTIVE : TAB_INACTIVE)}
        >
          SEO
        </button>
        <button
          type="button"
          onClick={() => setTab("notifications")}
          className={cn("shrink-0 rounded-xl border px-3 py-2 text-sm transition", tab === "notifications" ? TAB_ACTIVE : TAB_INACTIVE)}
        >
          Avisos
        </button>
        <button
          type="button"
          onClick={() => setTab("billing")}
          className={cn("shrink-0 rounded-xl border px-3 py-2 text-sm transition", tab === "billing" ? TAB_ACTIVE : TAB_INACTIVE)}
        >
          Plan
        </button>
        {isSuperadmin ? (
          <button
            type="button"
            onClick={() => setTab("legal")}
            className={cn("shrink-0 rounded-xl border px-3 py-2 text-sm transition", tab === "legal" ? TAB_ACTIVE : TAB_INACTIVE)}
          >
            Legal
          </button>
        ) : null}
      </div>

      <div className="grid gap-6 lg:grid-cols-12">
        {/* Left settings navigation */}
        <aside className="hidden lg:block lg:col-span-3">
          <div className="glass sticky top-4 rounded-2xl p-3">
            <div className="mb-3 px-1">
              <div className="text-xs font-medium text-muted-foreground">Configuración</div>
            </div>

            <div className="space-y-2">
              <SideItem active={tab === "public"} title="Public site" description="Branding, hero y navegación" onClick={() => setTab("public")} />
              <SideItem active={tab === "domain"} title="Custom domain" description="Conecta y verifica DNS" onClick={() => setTab("domain")} />
              <SideItem active={tab === "seo"} title="SEO" description="Title, description, OG y favicon" onClick={() => setTab("seo")} />
              <SideItem active={tab === "notifications"} title="Notificaciones" description="Emails para tickets y monitor" onClick={() => setTab("notifications")} />
              <SideItem active={tab === "usage"} title="Usage" description="Límites, consumo y señales de conversión" onClick={() => setTab("usage")} />
              <SideItem active={tab === "billing"} title="Plan" description="Upgrade y límites de evidencia" onClick={() => setTab("billing")} />
              {isSuperadmin ? (
                <SideItem active={tab === "legal"} title="Legal" description="Aviso legal, privacidad y cookies" onClick={() => setTab("legal")} />
              ) : null}
            </div>

            <div className="mt-3 rounded-xl border bg-muted/30 p-3 text-xs text-muted-foreground">
              Consejo: usa <span className="font-mono">#cefe82</span> como accent y <span className="font-mono">#506a75</span> como primary para una estética limpia.
            </div>
          </div>
        </aside>

        {/* Content */}
        <section className="lg:col-span-9">
          {loading ? (
            <AppCard className="p-5">
              <CardHeader title="Cargando…" description="Preparando settings." />
              <div className="mt-4 h-24 animate-pulse rounded-xl bg-muted/50" />
            </AppCard>
          ) : null}

          {tab === "usage" ? (
            <div className="space-y-6">
              <AppCard className="p-5">
                <CardHeader title="Usage & Limits" description="Lo que importa para decidir qué construir." />
                <div className="mt-4">
                  {usageLoading ? (
                    <div className="h-24 animate-pulse rounded-xl bg-muted/50" />
                  ) : usageInfo ? (
                    <div className="grid gap-3 md:grid-cols-2">
                      <div className="rounded-xl border bg-bg2/30 p-3">
                        <div className="text-xs text-muted-foreground">Plan</div>
                        <div className="mt-1 text-sm font-semibold">{String(usageInfo.plan)}</div>
                      </div>
                      <div className="rounded-xl border bg-bg2/30 p-3">
                        <div className="text-xs text-muted-foreground">Domains</div>
                        <div className="mt-1 text-sm font-semibold">{usageInfo.usage.domains} / {usageInfo.limits.maxDomains}</div>
                      </div>
                      <div className="rounded-xl border bg-bg2/30 p-3">
                        <div className="text-xs text-muted-foreground">Clients (Agency)</div>
                        <div className="mt-1 text-sm font-semibold">{usageInfo.usage.clients} / {usageInfo.limits.maxClients}</div>
                      </div>
                      <div className="rounded-xl border bg-bg2/30 p-3">
                        <div className="text-xs text-muted-foreground">Evidence Packs</div>
                        <div className="mt-1 text-sm font-semibold">{usageInfo.usage.evidencePacks}</div>
                      </div>
                      <div className="rounded-xl border bg-bg2/30 p-3 md:col-span-2">
                        <div className="text-xs text-muted-foreground">Events (last 24h)</div>
                        <div className="mt-1 text-sm">Audit: <span className="font-semibold">{usageInfo.usage.events24h.audit}</span> · Alerts: <span className="font-semibold">{usageInfo.usage.events24h.alerts}</span> · Monitor: <span className="font-semibold">{usageInfo.usage.events24h.monitor}</span></div>
                        <div className="mt-2 text-xs text-muted-foreground">Retention target: {usageInfo.limits.retentionDays} days</div>
                      </div>
                    </div>
                  ) : (
                    <div className="text-sm text-muted-foreground">No usage data yet.</div>
                  )}
                </div>
              </AppCard>
            </div>
          ) : null}
          {tab === "billing" ? (
            <div className="space-y-6">
              <AppCard className="p-5">
                <CardHeader
                  title="Plan & billing"
                  description="Starter limita export y retención de evidencia. Aquí capturamos intención real de upgrade (sin Stripe)."
                />

                <div className="mt-4 grid gap-4 md:grid-cols-2">
                  <div className="rounded-2xl border border-border bg-bg1/60 p-4">
                    <div className="text-xs text-muted-foreground">Current plan</div>
                    <div className="mt-1 text-2xl font-semibold">
                      {String(planInfo?.plan ?? "COMPLIANCE").toUpperCase() === "CONTROL" ? "Starter" : String(planInfo?.plan ?? "").toUpperCase() === "ASSURED" ? "Agency" : "Business"}
                    </div>
                    <div className="mt-1 text-sm text-muted-foreground">
                      Evidence retention: {String(planInfo?.plan ?? "COMPLIANCE").toUpperCase() === "CONTROL" ? "7 days" : String(planInfo?.plan ?? "").toUpperCase() === "ASSURED" ? "365 days" : "90 days"}
                    </div>
                  </div>

                  <div className="rounded-2xl border border-border bg-bg1/60 p-4">
                    <div className="text-xs text-muted-foreground">Upgrade benefits</div>
                    <ul className="mt-2 list-disc space-y-1 pl-5 text-sm text-muted-foreground">
                      <li>Unlock Evidence Bundle export (PDF/JSON workflows)</li>
                      <li>Longer evidence retention (audit-ready)</li>
                      <li>Agency: multi-client mode + white-label</li>
                    </ul>
                  </div>
                </div>

                <div className="mt-6 rounded-2xl border border-border bg-bg1/60 p-4">
                  <div className="text-sm font-semibold">Request upgrade</div>
                  <div className="mt-1 text-sm text-muted-foreground">We’ll get back to you and enable the plan manually. No billing setup required yet.</div>

                  {upgradeMsg ? <div className="mt-3 rounded-xl border bg-muted/30 px-3 py-2 text-sm">{upgradeMsg}</div> : null}

                  <div className="mt-4 grid gap-3 md:grid-cols-2">
                    <label className="text-sm">
                      Desired plan
                      <select
                        className="mt-1 w-full rounded-xl border border-border bg-bg2/60 px-3 py-2 text-sm"
                        value={desiredPlan}
                        onChange={(e) => setDesiredPlan(e.target.value as any)}
                      >
                        <option value="BUSINESS">Business</option>
                        <option value="AGENCY">Agency</option>
                      </select>
                    </label>

                    <label className="text-sm">
                      Approx. domains / clients
                      <AppInput
                        className="mt-1"
                        type="number"
                        min={1}
                        max={500}
                        value={String(domainsCount)}
                        onChange={(e) => setDomainsCount(Math.max(1, Math.min(500, Number(e.target.value || 1))))}
                      />
                    </label>

                    <label className="text-sm md:col-span-2">
                      Contact email (optional)
                      <AppInput className="mt-1" value={contactEmail} onChange={(e) => setContactEmail(e.target.value)} placeholder="you@company.com" />
                    </label>

                    <label className="text-sm md:col-span-2">
                      Notes (optional)
                      <textarea
                        className="mt-1 w-full rounded-xl border border-border bg-bg2/60 px-3 py-2 text-sm"
                        rows={4}
                        value={upgradeNotes}
                        onChange={(e) => setUpgradeNotes(e.target.value)}
                        placeholder="What do you need? (export format, retention, #clients...)"
                      />
                    </label>
                  </div>

                  <div className="mt-4">
                    <AppButton
                      type="button"
                      disabled={upgradeLoading}
                      onClick={async () => {
                        setUpgradeLoading(true);
                        setUpgradeMsg(null);
                        try {
                          const res = await fetch("/api/app/billing/request-upgrade", {
                            method: "POST",
                            headers: { "content-type": "application/json" },
                            body: JSON.stringify({
                              tenant,
                              desiredPlan,
                              domainsCount,
                              contactEmail: contactEmail.trim() ? contactEmail.trim() : undefined,
                              message: upgradeNotes.trim() ? upgradeNotes.trim() : undefined,
                            }),
                          });
                          const data = await res.json();
                          if (!data?.ok) {
                            setUpgradeMsg(`Error: ${data?.error ?? "request_failed"}`);
                          } else {
                            setUpgradeMsg("Request sent ✅ We’ll contact you shortly.");
                          }
                        } catch {
                          setUpgradeMsg("Error: could not send request");
                        } finally {
                          setUpgradeLoading(false);
                        }
                      }}
                    >
                      {upgradeLoading ? "Sending…" : "Request upgrade"}
                    </AppButton>
                  </div>
                </div>
              </AppCard>
            </div>
          ) : null}

          {tab === "public" ? (
            <div className="space-y-6">
              <AppCard className="p-5">
                <CardHeader title="Branding" description="Nombre, logo y colores de marca del site público." />
                <div className="mt-4 grid gap-4 md:grid-cols-2">
                  <label className="text-sm">
                    Brand name
                    <AppInput
                      className="mt-1"
                      value={theme.brandName ?? ""}
                      onChange={(e) => setTheme({ ...theme, brandName: e.target.value })}
                    />
                  </label>
                  <label className="text-sm">
                    Tagline
                    <AppInput
                      className="mt-1"
                      value={theme.tagline ?? ""}
                      onChange={(e) => setTheme({ ...theme, tagline: e.target.value })}
                    />
                  </label>
                  <label className="text-sm md:col-span-2">
                    Logo URL
                    <AppInput
                      className="mt-1"
                      value={theme.logoUrl ?? ""}
                      onChange={(e) => setTheme({ ...theme, logoUrl: e.target.value })}
                      placeholder="https://..."
                    />
                  </label>
                  <label className="text-sm">
                    Primary
                    <AppInput
                      className="mt-1"
                      value={theme.primary ?? ""}
                      onChange={(e) => setTheme({ ...theme, primary: e.target.value })}
                      placeholder="#506a75"
                    />
                  </label>
                  <label className="text-sm">
                    Accent
                    <AppInput
                      className="mt-1"
                      value={theme.accent ?? ""}
                      onChange={(e) => setTheme({ ...theme, accent: e.target.value })}
                      placeholder="#cefe82"
                    />
                  </label>
                </div>
              </AppCard>

              <AppCard className="p-5">
                <CardHeader title="Hero" description="El primer bloque visible al entrar en la web." />
                <div className="mt-4 grid gap-4 md:grid-cols-2">
                  <label className="text-sm md:col-span-2">
                    Headline
                    <AppInput className="mt-1" value={theme.hero?.headline ?? ""} onChange={(e) => setHero({ headline: e.target.value })} />
                  </label>
                  <label className="text-sm md:col-span-2">
                    Subheadline
                    <AppInput className="mt-1" value={theme.hero?.subheadline ?? ""} onChange={(e) => setHero({ subheadline: e.target.value })} />
                  </label>
                  <label className="text-sm">
                    CTA text
                    <AppInput className="mt-1" value={theme.hero?.ctaText ?? ""} onChange={(e) => setHero({ ctaText: e.target.value })} />
                  </label>
                  <label className="text-sm">
                    CTA href
                    <AppInput className="mt-1" value={theme.hero?.ctaHref ?? ""} onChange={(e) => setHero({ ctaHref: e.target.value })} placeholder="/contacto" />
                  </label>
                </div>
              </AppCard>

              <AppCard className="p-5">
                <CardHeader
                  title="Navegación pública"
                  description={
                    <>
                      Links del header en <span className="font-mono">/t/{tenant}</span>. Usa rutas internas (ej.{" "}
                      <span className="font-mono">/servicios</span>).
                    </>
                  }
                />
                <div className="mt-4 space-y-3">
                  {navItems.map((it, idx) => (
                    <div key={idx} className="grid grid-cols-1 gap-2 md:grid-cols-5">
                      <AppInput
                        className="md:col-span-2"
                        value={it.label ?? ""}
                        onChange={(e) => setNavItem(idx, { label: e.target.value })}
                        placeholder="Label"
                      />
                      <AppInput
                        className="md:col-span-2"
                        value={it.href ?? ""}
                        onChange={(e) => setNavItem(idx, { href: e.target.value })}
                        placeholder="/ruta"
                      />
                      <AppButton
                        type="button"
                        variant="secondary"
                        className="md:col-span-1"
                        onClick={() => removeNavItem(idx)}
                      >
                        Quitar
                      </AppButton>
                    </div>
                  ))}

                  <div className="flex flex-wrap gap-2">
                    <AppButton type="button" variant="secondary" onClick={addNavItem}>
                      + Añadir link
                    </AppButton>
                    <a
                      href={`/t/${encodeURIComponent(tenant)}`}
                      target="_blank"
                      rel="noreferrer"
                      className="inline-flex items-center rounded-xl border bg-muted/20 px-3 py-2 text-sm hover:bg-sidebar-accent/40"
                    >
                      Ver site ↗
                    </a>
                  </div>
                </div>
              </AppCard>

              <AppCard className="p-5">
                <CardHeader title="Contacto" description="Se muestra en la página de contacto del site público." />
                <div className="mt-4 grid gap-4 md:grid-cols-2">
                  <label className="text-sm">
                    Email
                    <AppInput className="mt-1" value={theme.pages?.contact?.email ?? ""} onChange={(e) => setContact({ email: e.target.value })} />
                  </label>
                  <label className="text-sm">
                    Phone
                    <AppInput className="mt-1" value={theme.pages?.contact?.phone ?? ""} onChange={(e) => setContact({ phone: e.target.value })} />
                  </label>
                  <label className="text-sm md:col-span-2">
                    Address
                    <AppInput className="mt-1" value={theme.pages?.contact?.address ?? ""} onChange={(e) => setContact({ address: e.target.value })} />
                  </label>
                </div>
              </AppCard>

              <AppCard className="p-5">
                <CardHeader
                  title="Footer"
                  description="Pie de página en 2 columnas (texto + contacto). Los links legales se generan automáticamente."
                />
                <div className="mt-4 grid gap-4 md:grid-cols-2">
                  <label className="text-sm md:col-span-2">
                    Texto (izquierda)
                    <textarea
                      className="mt-1 min-h-[96px] w-full rounded-2xl border border-border bg-bg2/50 p-3 text-sm text-foreground backdrop-blur transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand/30 focus-visible:border-brand2"
                      value={theme.footer?.aboutText ?? ""}
                      onChange={(e) => setFooter({ aboutText: e.target.value })}
                      placeholder="Cuenta en 2–3 frases qué hace la empresa…"
                    />
                  </label>

                  <label className="text-sm">
                    Email (derecha)
                    <AppInput className="mt-1" value={theme.footer?.email ?? theme.pages?.contact?.email ?? ""} onChange={(e) => setFooter({ email: e.target.value })} />
                  </label>
                  <label className="text-sm">
                    Teléfono
                    <AppInput className="mt-1" value={theme.footer?.phone ?? theme.pages?.contact?.phone ?? ""} onChange={(e) => setFooter({ phone: e.target.value })} />
                  </label>
                  <label className="text-sm md:col-span-2">
                    Ubicación
                    <AppInput className="mt-1" value={theme.footer?.location ?? ""} onChange={(e) => setFooter({ location: e.target.value })} placeholder="Madrid, España" />
                  </label>
                  <label className="text-sm md:col-span-2">
                    Copyright (opcional)
                    <AppInput className="mt-1" value={theme.footer?.copyright ?? ""} onChange={(e) => setFooter({ copyright: e.target.value })} placeholder="© 2026 Nombre. All rights reserved." />
                  </label>
                </div>
              </AppCard>
            </div>
          ) : null}

          {tab === "domain" ? (
            <AppCard className="p-5">
              <CardHeader
                title="Custom domain"
                description={
                  <>
                    Conecta un dominio (ej. <span className="font-mono">www.cliente.com</span>) para servir el site sin{" "}
                    <span className="font-mono">/t/{tenant}</span>.
                  </>
                }
              />
              <div className="mt-4 space-y-4">
                <label className="block text-sm">
                  Domain
                  <AppInput className="mt-1" value={customDomain} onChange={(e) => setCustomDomain(e.target.value)} placeholder="www.client.com" />
                </label>

                <div className="flex flex-wrap items-center gap-2">
                  <AppButton onClick={saveCustomDomain} disabled={domainLoading}>
                    {domainLoading ? "Saving…" : "Save"}
                  </AppButton>
                  <AppButton variant="secondary" onClick={verifyCustomDomain} disabled={domainLoading || !customDomain.trim()}>
                    Verify DNS
                  </AppButton>

                  <span className={customDomainVerifiedAt ? "text-xs text-emerald-600" : "text-xs text-muted-foreground"}>
                    {customDomainVerifiedAt ? "Verified" : "Not verified"}
                  </span>
                </div>

                <div className="rounded-2xl border bg-muted/30 p-4 text-sm">
                  <div className="font-medium">DNS recomendado (MVP)</div>
                  <ul className="mt-2 list-disc space-y-1 pl-5 text-muted-foreground">
                    <li>
                      Subdominio (ej. <span className="font-mono">www</span>): crea un <b>CNAME</b> hacia el target de la plataforma.
                    </li>
                    <li>
                      Dominio raíz: normalmente requiere <b>A record</b> (depende de tu DNS provider).
                    </li>
                  </ul>
                </div>
              </div>
            </AppCard>
          ) : null}

          {tab === "notifications" ? (
            <AppCard className="p-5">
              <CardHeader
                title="Notificaciones"
                description="Emails que reciben avisos. Si lo dejas vacío, se enviará a OWNER/ADMIN del tenant. Formato: separados por coma."
              />
              <div className="mt-4 grid gap-4 md:grid-cols-2">
                <label className="text-sm">
                  Emails para tickets
                  <AppInput
                    className="mt-1"
                    value={(theme.notifications?.ticketEmails ?? []).join(", ")}
                    onChange={(e) =>
                      setTheme({
                        ...theme,
                        notifications: {
                          ...(theme.notifications ?? {}),
                          ticketEmails: e.target.value
                            .split(",")
                            .map((s) => s.trim())
                            .filter(Boolean),
                        },
                      })
                    }
                    placeholder="it@empresa.com, secops@empresa.com"
                  />
                </label>

                <label className="text-sm">
                  Emails para monitor
                  <AppInput
                    className="mt-1"
                    value={(theme.notifications?.monitorEmails ?? []).join(", ")}
                    onChange={(e) =>
                      setTheme({
                        ...theme,
                        notifications: {
                          ...(theme.notifications ?? {}),
                          monitorEmails: e.target.value
                            .split(",")
                            .map((s) => s.trim())
                            .filter(Boolean),
                        },
                      })
                    }
                    placeholder="alerts@empresa.com"
                  />
                </label>
              </div>
            </AppCard>
          ) : null}

          {tab === "seo" ? (
            <AppCard className="p-5">
              <CardHeader title="SEO" description="Metadata básica para el site público." />
              <div className="mt-4 grid gap-4 md:grid-cols-2">
                <label className="text-sm md:col-span-2">
                  Title
                  <AppInput className="mt-1" value={theme.seo?.title ?? ""} onChange={(e) => setSeo({ title: e.target.value })} />
                </label>
                <label className="text-sm md:col-span-2">
                  Description
                  <AppInput className="mt-1" value={theme.seo?.description ?? ""} onChange={(e) => setSeo({ description: e.target.value })} />
                </label>
                <label className="text-sm">
                  OG image URL
                  <AppInput className="mt-1" value={theme.seo?.ogImageUrl ?? ""} onChange={(e) => setSeo({ ogImageUrl: e.target.value })} placeholder="https://..." />
                </label>
                <label className="text-sm">
                  Favicon URL
                  <AppInput className="mt-1" value={theme.seo?.faviconUrl ?? ""} onChange={(e) => setSeo({ faviconUrl: e.target.value })} placeholder="https://..." />
                </label>
              </div>
            </AppCard>
          ) : null}

          {tab === "legal" ? (
            <AppCard className="p-5">
              <CardHeader
                title="Legal"
                description={
                  <>
                    Datos de la empresa + textos para <span className="font-mono">Aviso legal</span>,{" "}
                    <span className="font-mono">Privacidad</span> y <span className="font-mono">Cookies</span>.
                  </>
                }
              />
              <div className="mt-4 grid gap-4 md:grid-cols-2">
                <label className="text-sm">
                  Company name
                  <AppInput className="mt-1" value={theme.legal?.companyName ?? ""} onChange={(e) => setLegal({ companyName: e.target.value })} />
                </label>
                <label className="text-sm">
                  Trade name
                  <AppInput className="mt-1" value={theme.legal?.tradeName ?? ""} onChange={(e) => setLegal({ tradeName: e.target.value })} />
                </label>
                <label className="text-sm">
                  CIF/NIF
                  <AppInput className="mt-1" value={theme.legal?.cifNif ?? ""} onChange={(e) => setLegal({ cifNif: e.target.value })} />
                </label>
                <label className="text-sm">
                  Country
                  <AppInput className="mt-1" value={theme.legal?.country ?? ""} onChange={(e) => setLegal({ country: e.target.value })} />
                </label>
                <label className="text-sm md:col-span-2">
                  Address
                  <AppInput className="mt-1" value={theme.legal?.address ?? ""} onChange={(e) => setLegal({ address: e.target.value })} />
                </label>
                <label className="text-sm">
                  Email
                  <AppInput className="mt-1" value={theme.legal?.email ?? ""} onChange={(e) => setLegal({ email: e.target.value })} />
                </label>
                <label className="text-sm">
                  Phone
                  <AppInput className="mt-1" value={theme.legal?.phone ?? ""} onChange={(e) => setLegal({ phone: e.target.value })} />
                </label>
                <label className="text-sm">
                  Analytics provider
                  <AppInput className="mt-1" value={theme.legal?.analyticsProvider ?? ""} onChange={(e) => setLegal({ analyticsProvider: e.target.value })} placeholder="Google Analytics" />
                </label>
                <label className="text-sm">
                  Analytics ID
                  <AppInput className="mt-1" value={theme.legal?.analyticsId ?? ""} onChange={(e) => setLegal({ analyticsId: e.target.value })} placeholder="G-XXXXXXX" />
                </label>
                <label className="text-sm md:col-span-2">
                  Last updated
                  <AppInput className="mt-1" value={theme.legal?.lastUpdated ?? ""} onChange={(e) => setLegal({ lastUpdated: e.target.value })} placeholder="2026-01-10" />
                </label>

                <div className="md:col-span-2">
                  <div className="mb-1 text-xs font-medium text-muted-foreground">Aviso legal (texto)</div>
                  <textarea
                    className="min-h-[140px] w-full rounded-2xl border border-border bg-bg2/50 p-3 text-sm text-foreground backdrop-blur transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand/30 focus-visible:border-brand2"
                    value={theme.legalDocs?.avisoLegal ?? ""}
                    onChange={(e) => setLegalDocs({ avisoLegal: e.target.value })}
                    placeholder="Escribe aquí el aviso legal (texto libre / Markdown simple)."
                  />
                  <div className="mt-1 text-[11px] text-muted-foreground">Si lo dejas vacío, se usará un template base.</div>
                </div>

                <div className="md:col-span-2">
                  <div className="mb-1 text-xs font-medium text-muted-foreground">Política de privacidad (texto)</div>
                  <textarea
                    className="min-h-[140px] w-full rounded-2xl border border-border bg-bg2/50 p-3 text-sm text-foreground backdrop-blur transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand/30 focus-visible:border-brand2"
                    value={theme.legalDocs?.privacidad ?? ""}
                    onChange={(e) => setLegalDocs({ privacidad: e.target.value })}
                    placeholder="Escribe aquí la política de privacidad (texto libre)."
                  />
                </div>

                <div className="md:col-span-2">
                  <div className="mb-1 text-xs font-medium text-muted-foreground">Política de cookies (texto)</div>
                  <textarea
                    className="min-h-[140px] w-full rounded-2xl border border-border bg-bg2/50 p-3 text-sm text-foreground backdrop-blur transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand/30 focus-visible:border-brand2"
                    value={theme.legalDocs?.cookies ?? ""}
                    onChange={(e) => setLegalDocs({ cookies: e.target.value })}
                    placeholder="Escribe aquí la política de cookies (texto libre)."
                  />
                </div>
              </div>
            </AppCard>
          ) : null}
        </section>
      </div>
    </main>
  );
}
