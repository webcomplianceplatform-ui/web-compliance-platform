"use client";

import { useEffect, useState } from "react";
import { defaultTheme, TenantTheme } from "@/lib/theme";

export default function SettingsClient({ tenant }: { tenant: string }) {
  const [theme, setTheme] = useState<TenantTheme>(defaultTheme);
  const [msg, setMsg] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

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

  return (
    <main className="max-w-2xl space-y-6">
      <h1 className="text-2xl font-semibold">Settings</h1>

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
