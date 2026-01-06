"use client";

import { useEffect, useState } from "react";
import { defaultTheme, TenantTheme } from "@/lib/theme";

export default function SettingsClient({ tenant }: { tenant: string }) {
  const [theme, setTheme] = useState<TenantTheme>(defaultTheme);
  const [customDomain, setCustomDomain] = useState<string>("");
  const [customDomainVerifiedAt, setCustomDomainVerifiedAt] = useState<string | null>(null);
  const [msg, setMsg] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [domainLoading, setDomainLoading] = useState(false);

  useEffect(() => {
    (async () => {
      setLoading(true);
      setMsg(null);

      try {
        const res = await fetch(`/api/app/settings/theme?tenant=${encodeURIComponent(tenant)}`, {
          cache: "no-store",
        });
        const data = await res.json();

        // si API devuelve null (sin theme guardado aún), usamos defaultTheme
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

  const navItems = theme.navigation?.primary ?? [];
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
    <main className="max-w-2xl space-y-6">
      <h1 className="text-2xl font-semibold">Settings</h1>

      <section className="space-y-3 rounded border p-4">
        <div className="text-sm font-medium">Custom domain</div>
        <p className="text-xs text-muted-foreground">
          Conecta un dominio (ej: <span className="font-mono">www.cliente.com</span>) para servir la web pública sin
          <span className="font-mono">/t/{tenant}</span>.
        </p>

        <label className="block text-sm">
          Dominio
          <input
            className="mt-1 w-full rounded border p-2"
            value={customDomain}
            onChange={(e) => setCustomDomain(e.target.value)}
            placeholder="www.cliente.com"
          />
        </label>

        <div className="flex flex-wrap gap-2">
          <button
            className="rounded bg-black px-3 py-2 text-sm text-white"
            onClick={saveCustomDomain}
            disabled={domainLoading}
          >
            Guardar
          </button>
          <button
            className="rounded border px-3 py-2 text-sm"
            onClick={verifyCustomDomain}
            disabled={domainLoading || !customDomain.trim()}
          >
            Verificar DNS
          </button>
          {customDomainVerifiedAt ? (
            <span className="text-xs text-green-700">Verificado</span>
          ) : (
            <span className="text-xs text-muted-foreground">No verificado</span>
          )}
        </div>

        <div className="rounded bg-muted/50 p-3 text-xs">
          <div className="font-medium">DNS recomendado (MVP)</div>
          <ul className="mt-2 list-disc space-y-1 pl-4">
            <li>
              Si el dominio es un subdominio (p.ej. <span className="font-mono">www</span>): crea un <b>CNAME</b> hacia tu
              dominio de la plataforma.
            </li>
            <li>
              Si es el dominio raíz: normalmente es un <b>A record</b>. (depende del proveedor)
            </li>
          </ul>
        </div>
      </section>

      <section className="space-y-3 rounded border p-4">
        {loading ? <div className="text-sm text-muted-foreground">Cargando…</div> : null}

        <div className="text-sm font-medium">Brand</div>

        <label className="block text-sm">
          Brand name
          <input
            className="mt-1 w-full rounded border p-2"
            value={theme.brandName ?? ""}
            onChange={(e) => setTheme({ ...theme, brandName: e.target.value })}
          />
        </label>

        <label className="block text-sm">
          Tagline
          <input
            className="mt-1 w-full rounded border p-2"
            value={theme.tagline ?? ""}
            onChange={(e) => setTheme({ ...theme, tagline: e.target.value })}
          />
        </label>

        <label className="block text-sm">
          Logo URL
          <input
            className="mt-1 w-full rounded border p-2"
            value={theme.logoUrl ?? ""}
            onChange={(e) => setTheme({ ...theme, logoUrl: e.target.value })}
            placeholder="https://..."
          />
        </label>

        <div className="grid grid-cols-2 gap-3">
          <label className="block text-sm">
            Primary color
            <input
              className="mt-1 w-full rounded border p-2"
              value={theme.primary ?? ""}
              onChange={(e) => setTheme({ ...theme, primary: e.target.value })}
              placeholder="#111111"
            />
          </label>

          <label className="block text-sm">
            Accent color
            <input
              className="mt-1 w-full rounded border p-2"
              value={theme.accent ?? ""}
              onChange={(e) => setTheme({ ...theme, accent: e.target.value })}
              placeholder="#F59E0B"
            />
          </label>
        </div>

        <div className="mt-4 text-sm font-medium">Hero</div>

        <label className="block text-sm">
          Headline
          <input
            className="mt-1 w-full rounded border p-2"
            value={theme.hero?.headline ?? ""}
            onChange={(e) => setHero({ headline: e.target.value })}
          />
        </label>

        <label className="block text-sm">
          Subheadline
          <input
            className="mt-1 w-full rounded border p-2"
            value={theme.hero?.subheadline ?? ""}
            onChange={(e) => setHero({ subheadline: e.target.value })}
          />
        </label>

        <div className="grid grid-cols-2 gap-3">
          <label className="block text-sm">
            CTA text
            <input
              className="mt-1 w-full rounded border p-2"
              value={theme.hero?.ctaText ?? ""}
              onChange={(e) => setHero({ ctaText: e.target.value })}
            />
          </label>

          <label className="block text-sm">
            CTA href
            <input
              className="mt-1 w-full rounded border p-2"
              value={theme.hero?.ctaHref ?? ""}
              onChange={(e) => setHero({ ctaHref: e.target.value })}
            />
          </label>
        </div>

        
<div className="mt-6 text-sm font-medium">Notificaciones (emails)</div>
<p className="text-xs text-muted-foreground">
  Opcional. Si lo dejas vacío, se enviará a OWNER/ADMIN del tenant. Formato: emails separados por coma.
</p>

<div className="mt-2 grid gap-3 md:grid-cols-2">
  <label className="text-sm">
    Emails para tickets
    <input
      className="mt-1 w-full rounded border p-2"
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
    <input
      className="mt-1 w-full rounded border p-2"
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

<div className="mt-4 text-sm font-medium">Navigation (pública)</div>
        <p className="text-xs text-muted-foreground">
          Estos links aparecen en el header de /t/[tenant]. Usa rutas internas tipo <span className="font-mono">/</span>, <span className="font-mono">/servicios</span>...
        </p>

        <div className="space-y-3">
          {navItems.map((it, idx) => (
            <div key={idx} className="grid grid-cols-5 gap-2">
              <input
                className="col-span-2 rounded border p-2 text-sm"
                value={it.label ?? ""}
                onChange={(e) => setNavItem(idx, { label: e.target.value })}
                placeholder="Label"
              />
              <input
                className="col-span-2 rounded border p-2 text-sm"
                value={it.href ?? ""}
                onChange={(e) => setNavItem(idx, { href: e.target.value })}
                placeholder="/ruta"
              />
              <button
                type="button"
                className="rounded border px-2 text-sm"
                onClick={() => removeNavItem(idx)}
              >
                Quitar
              </button>
            </div>
          ))}

          <button type="button" className="rounded border px-3 py-2 text-sm" onClick={addNavItem}>
            + Añadir link
          </button>
        </div>

        <div className="mt-4 text-sm font-medium">Contact</div>

        <div className="grid grid-cols-2 gap-3">
          <label className="block text-sm">
            Email
            <input
              className="mt-1 w-full rounded border p-2"
              value={theme.pages?.contact?.email ?? ""}
              onChange={(e) => setContact({ email: e.target.value })}
            />
          </label>

          <label className="block text-sm">
            Phone
            <input
              className="mt-1 w-full rounded border p-2"
              value={theme.pages?.contact?.phone ?? ""}
              onChange={(e) => setContact({ phone: e.target.value })}
            />
          </label>
        </div>

        <label className="block text-sm">
          Address
          <input
            className="mt-1 w-full rounded border p-2"
            value={theme.pages?.contact?.address ?? ""}
            onChange={(e) => setContact({ address: e.target.value })}
          />
        </label>

        <div className="mt-4 text-sm font-medium">SEO</div>

        <label className="block text-sm">
          SEO Title
          <input
            className="mt-1 w-full rounded border p-2"
            value={theme.seo?.title ?? ""}
            onChange={(e) => setSeo({ title: e.target.value })}
          />
        </label>

        <label className="block text-sm">
          SEO Description
          <textarea
            className="mt-1 w-full rounded border p-2"
            rows={3}
            value={theme.seo?.description ?? ""}
            onChange={(e) => setSeo({ description: e.target.value })}
          />
        </label>

        <label className="block text-sm">
          OG Image URL
          <input
            className="mt-1 w-full rounded border p-2"
            value={theme.seo?.ogImageUrl ?? ""}
            onChange={(e) => setSeo({ ogImageUrl: e.target.value })}
            placeholder="https://..."
          />
        </label>

        <label className="block text-sm">
          Favicon URL (optional)
          <input
            className="mt-1 w-full rounded border p-2"
            value={theme.seo?.faviconUrl ?? ""}
            onChange={(e) => setSeo({ faviconUrl: e.target.value })}
            placeholder="https://.../favicon.ico"
          />
          <div className="mt-1 text-xs text-muted-foreground">
            If empty, the default /favicon.ico will be used.
          </div>
        </label>
<div className="mt-6 text-sm font-medium">Legal</div>

<div className="grid grid-cols-1 gap-3 md:grid-cols-2">
  <label className="block text-sm">
    Razón social (Company)
    <input
      className="mt-1 w-full rounded border p-2"
      value={theme.legal?.companyName ?? ""}
      onChange={(e) =>
        setTheme({ ...theme, legal: { ...(theme.legal ?? {}), companyName: e.target.value } })
      }
      placeholder="Empresa S.L."
    />
  </label>

  <label className="block text-sm">
    Nombre comercial (opcional)
    <input
      className="mt-1 w-full rounded border p-2"
      value={theme.legal?.tradeName ?? ""}
      onChange={(e) =>
        setTheme({ ...theme, legal: { ...(theme.legal ?? {}), tradeName: e.target.value } })
      }
      placeholder="Marca / Nombre comercial"
    />
  </label>

  <label className="block text-sm">
    CIF/NIF
    <input
      className="mt-1 w-full rounded border p-2"
      value={theme.legal?.cifNif ?? ""}
      onChange={(e) =>
        setTheme({ ...theme, legal: { ...(theme.legal ?? {}), cifNif: e.target.value } })
      }
      placeholder="B12345678"
    />
  </label>

  <label className="block text-sm">
    Email legal/soporte
    <input
      className="mt-1 w-full rounded border p-2"
value={theme.legal?.email ?? theme.pages?.contact?.email ?? ""}
      onChange={(e) =>
        setTheme({ ...theme, legal: { ...(theme.legal ?? {}), email: e.target.value } })
      }
      placeholder="info@empresa.com"
    />
  </label>

  <label className="block text-sm md:col-span-2">
    Dirección
    <input
      className="mt-1 w-full rounded border p-2"
      value={theme.legal?.address ?? ""}
      onChange={(e) =>
        setTheme({ ...theme, legal: { ...(theme.legal ?? {}), address: e.target.value } })
      }
      placeholder="Calle / número / piso"
    />
  </label>

  <label className="block text-sm">
    Ciudad
    <input
      className="mt-1 w-full rounded border p-2"
      value={theme.legal?.city ?? ""}
      onChange={(e) =>
        setTheme({ ...theme, legal: { ...(theme.legal ?? {}), city: e.target.value } })
      }
      placeholder="Madrid"
    />
  </label>

  <label className="block text-sm">
    País
    <input
      className="mt-1 w-full rounded border p-2"
      value={theme.legal?.country ?? "España"}
      onChange={(e) =>
        setTheme({ ...theme, legal: { ...(theme.legal ?? {}), country: e.target.value } })
      }
      placeholder="España"
    />
  </label>

  <label className="block text-sm md:col-span-2">
    Última actualización legal (opcional)
    <input
      className="mt-1 w-full rounded border p-2"
      value={theme.legal?.lastUpdated ?? ""}
      onChange={(e) =>
        setTheme({ ...theme, legal: { ...(theme.legal ?? {}), lastUpdated: e.target.value } })
      }
      placeholder='Ej: 2026-01-05'
    />
    <p className="mt-1 text-xs text-muted-foreground">
      Se muestra en las páginas legales como “Última actualización”.
    </p>
  </label>

  <label className="flex items-center gap-2 text-sm md:col-span-2">
    <input
      type="checkbox"
      checked={!!theme.legal?.usesAnalytics}
      onChange={(e) =>
        setTheme({ ...theme, legal: { ...(theme.legal ?? {}), usesAnalytics: e.target.checked } })
      }
    />
    Usa analítica / medición (cookies)
  </label>

  {theme.legal?.usesAnalytics ? (
    <>
      <label className="block text-sm md:col-span-2">
        Proveedor de analítica
        <input
          className="mt-1 w-full rounded border p-2"
          value={theme.legal?.analyticsProvider ?? "Google Analytics"}
          onChange={(e) =>
            setTheme({ ...theme, legal: { ...(theme.legal ?? {}), analyticsProvider: e.target.value } })
          }
          placeholder="Google Analytics"
        />
      </label>

      <label className="block text-sm md:col-span-2">
        Analytics ID (opcional)
        <input
          className="mt-1 w-full rounded border p-2"
          value={theme.legal?.analyticsId ?? ""}
          onChange={(e) =>
            setTheme({ ...theme, legal: { ...(theme.legal ?? {}), analyticsId: e.target.value } })
          }
          placeholder="Ej: G-XXXXXXXXXX"
        />
        <p className="mt-1 text-xs text-muted-foreground">
          Se usará para cargar el script del proveedor (por ejemplo GA4). Si lo dejas vacío, no se cargará nada aunque el usuario acepte.
        </p>
      </label>
    </>
  ) : null}
</div>

        <button
          className="rounded bg-black px-3 py-2 text-sm text-white"
          onClick={async () => {
            setMsg(null);
            const res = await fetch("/api/app/settings/theme", {
              method: "POST", // ✅ tu API soporta POST
              headers: { "content-type": "application/json" },
              body: JSON.stringify({ tenant, theme }),
            });
            const data = await res.json();
            setMsg(data.ok ? "Saved ✅" : `Error: ${data.error ?? "error"}`);
          }}
        >
          Save
        </button>

        {msg && <div className="text-xs text-muted-foreground">{msg}</div>}
      </section>
    </main>
  );
}
