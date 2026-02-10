"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import {
  getConsent,
  getConsentCategories,
  setConsentPrefs,
  type ConsentState,
  type ConsentCategories,
} from "@/lib/consent-client";
import { logPublicConsent } from "@/lib/consent-telemetry-client";

function Modal({
  open,
  onClose,
  children,
}: {
  open: boolean;
  onClose: () => void;
  children: React.ReactNode;
}) {
  if (!open) return null;
  return (
    <div className="fixed inset-0 z-[60] flex items-end justify-center p-4 md:items-center">
      <div className="absolute inset-0 bg-black/40" onClick={onClose} />
      <div className="relative w-full max-w-lg rounded-xl border border-black/10 bg-white p-4 text-slate-900 shadow-xl">
        {children}
      </div>
    </div>
  );
}

export default function CookieBanner({
  tenant,
  usesAnalytics,
}: {
  tenant: string;
  usesAnalytics: boolean;
}) {
  const [consent, setConsentState] = useState<ConsentState>("unset");
  const [mounted, setMounted] = useState(false);
  const [prefsOpen, setPrefsOpen] = useState(false);
  const [analytics, setAnalytics] = useState(false);
  const [marketing, setMarketing] = useState(false);

  useEffect(() => {
    setMounted(true);
    setConsentState(getConsent());
    const cats = getConsentCategories();
    setAnalytics(!!cats?.analytics);
    setMarketing(!!cats?.marketing);
  }, []);

  // Show whenever consent is not set yet.
  const show = mounted && consent === "unset";
  const cookiesHref = useMemo(() => `/t/${tenant}/legal/cookies`, [tenant]);

  if (!show) return null;

  const savePrefs = (state: Exclude<ConsentState, "unset">, cats: ConsentCategories) => {
    setConsentPrefs({ state, categories: cats });
    setConsentState(state);
    void logPublicConsent({ tenant, state, source: "cookie_banner", categories: cats });
  };

  const acceptAll = () => {
    const cats: ConsentCategories = { necessary: true, analytics: true, marketing: true };
    savePrefs("accepted", cats);
  };

  const rejectAll = () => {
    const cats: ConsentCategories = { necessary: true, analytics: false, marketing: false };
    savePrefs("rejected", cats);
  };

  const saveCustom = () => {
    const cats: ConsentCategories = { necessary: true, analytics: !!analytics, marketing: !!marketing };
    // If matches all true/false, keep accepted/rejected for clarity.
    const state: Exclude<ConsentState, "unset"> =
      cats.analytics && cats.marketing ? "accepted" : !cats.analytics && !cats.marketing ? "rejected" : "custom";
    savePrefs(state, cats);
    setPrefsOpen(false);
  };

  return (
    <>
      <div className="fixed inset-x-0 bottom-0 z-50">
        <div className="mx-auto max-w-5xl p-4">
          {/* Force readable colors even when rendered inside a dark shell (e.g. LandingClient uses text-white). */}
          <div className="rounded-lg border border-black/10 bg-white p-4 text-slate-900 shadow-sm">
            <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
              <div className="text-sm">
                <div className="font-medium">Cookies</div>
                <p className="mt-1 text-slate-600">
                  Usamos cookies necesarias para que el sitio funcione.{" "}
                  {usesAnalytics ? "Opcionalmente, puedes permitir analítica y marketing." : ""} Consulta la{" "}
                  <Link className="underline" href={cookiesHref}>
                    política de cookies
                  </Link>
                  .
                </p>
              </div>

              <div className="flex flex-wrap gap-2">
                <button
                  type="button"
                  className="rounded border border-slate-300 px-3 py-2 text-sm text-slate-900 hover:bg-slate-50"
                  onClick={rejectAll}
                >
                  Rechazar
                </button>
                <button
                  type="button"
                  className="rounded border border-slate-300 px-3 py-2 text-sm text-slate-900 hover:bg-slate-50"
                  onClick={() => setPrefsOpen(true)}
                >
                  Configurar
                </button>
                <button
                  type="button"
                  className="rounded bg-black px-3 py-2 text-sm text-white hover:bg-black/90"
                  onClick={acceptAll}
                >
                  Aceptar
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>

      <Modal
        open={prefsOpen}
        onClose={() => {
          setPrefsOpen(false);
        }}
      >
        <div className="flex items-start justify-between gap-4">
          <div>
            <div className="text-base font-semibold">Preferencias de cookies</div>
            <p className="mt-1 text-sm text-slate-600">
              Las cookies necesarias están siempre activas. Puedes elegir si permitir analítica y marketing.
            </p>
          </div>
          <button
            type="button"
            className="rounded-md border border-slate-200 px-2 py-1 text-sm hover:bg-slate-50"
            onClick={() => setPrefsOpen(false)}
          >
            Cerrar
          </button>
        </div>

        <div className="mt-4 space-y-3">
          <label className="flex items-center justify-between gap-3 rounded-lg border border-slate-200 p-3">
            <div>
              <div className="text-sm font-medium">Necesarias</div>
              <div className="text-xs text-slate-600">Imprescindibles para que el sitio funcione.</div>
            </div>
            <input type="checkbox" checked readOnly />
          </label>

          <label className="flex items-center justify-between gap-3 rounded-lg border border-slate-200 p-3">
            <div>
              <div className="text-sm font-medium">Analítica</div>
              <div className="text-xs text-slate-600">Nos ayuda a medir el uso del sitio.</div>
            </div>
            <input
              type="checkbox"
              checked={analytics}
              disabled={!usesAnalytics}
              onChange={(e) => setAnalytics(e.target.checked)}
            />
          </label>

          <label className="flex items-center justify-between gap-3 rounded-lg border border-slate-200 p-3">
            <div>
              <div className="text-sm font-medium">Marketing</div>
              <div className="text-xs text-slate-600">Personalización y campañas.</div>
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
          <button type="button" className="rounded border border-slate-300 px-3 py-2 text-sm" onClick={rejectAll}>
            Rechazar todo
          </button>
          <button type="button" className="rounded border border-slate-300 px-3 py-2 text-sm" onClick={acceptAll}>
            Aceptar todo
          </button>
          <button type="button" className="ml-auto rounded bg-black px-3 py-2 text-sm text-white" onClick={saveCustom}>
            Guardar preferencias
          </button>
        </div>

        <p className="mt-3 text-xs text-slate-500">
          Puedes cambiar estas preferencias en cualquier momento desde la{" "}
          <Link className="underline" href={cookiesHref}>
            política de cookies
          </Link>
          .
        </p>
      </Modal>
    </>
  );
}
