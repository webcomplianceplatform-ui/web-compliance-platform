"use client";

import { useEffect, useMemo, useState } from "react";
import { useSearchParams } from "next/navigation";
import {
  clearConsent,
  getConsent,
  getConsentCategories,
  setConsentPrefs,
  type ConsentCategories,
  type ConsentState,
} from "@/lib/consent-client";
import { logPublicConsent } from "@/lib/consent-telemetry-client";

export default function ConsentManager({
  tenant,
  usesAnalytics,
}: {
  tenant: string;
  usesAnalytics: boolean;
}) {
  const params = useSearchParams();
  const [consent, setConsentState] = useState<ConsentState>("unset");
  const [analytics, setAnalytics] = useState(false);
  const [marketing, setMarketing] = useState(false);

  useEffect(() => {
    const sync = () => {
      setConsentState(getConsent());
      const cats = getConsentCategories();
      setAnalytics(!!cats?.analytics);
      setMarketing(!!cats?.marketing);
    };
    sync();
    window.addEventListener("wcp_consent_change", sync);
    return () => window.removeEventListener("wcp_consent_change", sync);
  }, []);

  const open = useMemo(() => params.get("manage") === "1", [params]);

  const save = (state: Exclude<ConsentState, "unset">, cats: ConsentCategories, source: "consent_manager") => {
    setConsentPrefs({ state, categories: cats });
    setConsentState(state);
    void logPublicConsent({ tenant, state, source, categories: cats });
  };

  const acceptAll = () => save("accepted", { necessary: true, analytics: true, marketing: true }, "consent_manager");
  const rejectAll = () => save("rejected", { necessary: true, analytics: false, marketing: false }, "consent_manager");

  const saveCustom = () => {
    const cats: ConsentCategories = { necessary: true, analytics: !!analytics, marketing: !!marketing };
    const state: Exclude<ConsentState, "unset"> =
      cats.analytics && cats.marketing ? "accepted" : !cats.analytics && !cats.marketing ? "rejected" : "custom";
    save(state, cats, "consent_manager");
  };

  if (!open) {
    return (
      <div className="rounded border bg-white p-4">
        <div className="text-sm font-medium">Preferencias de cookies</div>
        <p className="mt-1 text-sm text-muted-foreground">Puedes cambiar tu consentimiento en cualquier momento.</p>
        <a className="mt-2 inline-block text-sm underline" href="?manage=1">
          Gestionar consentimiento
        </a>
      </div>
    );
  }

  return (
    <div className="rounded border bg-white p-4">
      <div className="text-sm font-medium">Preferencias de cookies</div>
      <p className="mt-1 text-sm text-muted-foreground">
        Estado actual: <span className="font-medium">{consent === "unset" ? "No decidido" : consent}</span>
      </p>

      <div className="mt-4 space-y-3">
        <label className="flex items-center justify-between gap-3 rounded border p-3">
          <div>
            <div className="text-sm font-medium">Necesarias</div>
            <div className="text-xs text-muted-foreground">Imprescindibles para que el sitio funcione.</div>
          </div>
          <input type="checkbox" checked readOnly />
        </label>

        <label className="flex items-center justify-between gap-3 rounded border p-3">
          <div>
            <div className="text-sm font-medium">Analítica</div>
            <div className="text-xs text-muted-foreground">Medición de uso del sitio.</div>
          </div>
          <input
            type="checkbox"
            checked={analytics}
            disabled={!usesAnalytics}
            onChange={(e) => setAnalytics(e.target.checked)}
          />
        </label>

        <label className="flex items-center justify-between gap-3 rounded border p-3">
          <div>
            <div className="text-sm font-medium">Marketing</div>
            <div className="text-xs text-muted-foreground">Personalización y campañas.</div>
          </div>
          <input
            type="checkbox"
            checked={marketing}
            disabled={!usesAnalytics}
            onChange={(e) => setMarketing(e.target.checked)}
          />
        </label>
      </div>

      <div className="mt-4 flex flex-wrap gap-2">
        <button type="button" className="rounded border px-3 py-2 text-sm" onClick={rejectAll}>
          Rechazar todo
        </button>
        <button type="button" className="rounded border px-3 py-2 text-sm" onClick={acceptAll}>
          Aceptar todo
        </button>
        <button type="button" className="ml-auto rounded bg-black px-3 py-2 text-sm text-white" onClick={saveCustom}>
          Guardar preferencias
        </button>
        <button
          type="button"
          className="rounded border px-3 py-2 text-sm"
          onClick={() => {
            clearConsent();
            setConsentState("unset");
            void logPublicConsent({ tenant, state: "unset", source: "consent_manager", categories: null });
          }}
        >
          Restablecer
        </button>
      </div>

      <p className="mt-3 text-xs text-muted-foreground">
        Nota: si desactivas analítica, no se cargará ningún script de analítica.
      </p>
    </div>
  );
}
