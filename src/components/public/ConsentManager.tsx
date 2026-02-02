"use client";

import { useEffect, useMemo, useState } from "react";
import { useSearchParams } from "next/navigation";
import { clearConsent, getConsent, setConsent, type ConsentState } from "@/lib/consent-client";

export default function ConsentManager({
  usesAnalytics,
}: {
  usesAnalytics: boolean;
}) {
  const params = useSearchParams();
  const [consent, setConsentState] = useState<ConsentState>("unset");

  useEffect(() => {
    const sync = () => setConsentState(getConsent());
    sync();
    window.addEventListener("wcp_consent_change", sync);
    return () => window.removeEventListener("wcp_consent_change", sync);
  }, []);

  const open = useMemo(() => params.get("manage") === "1", [params]);

  if (!usesAnalytics) {
    return (
      <div className="rounded border bg-white p-4">
        <div className="text-sm font-medium">Preferencias de cookies</div>
        <p className="mt-1 text-sm text-muted-foreground">
          Este sitio no utiliza cookies de analítica. No hay preferencias que gestionar.
        </p>
      </div>
    );
  }

  if (!open) {
    return (
      <div className="rounded border bg-white p-4">
        <div className="text-sm font-medium">Preferencias de cookies</div>
        <p className="mt-1 text-sm text-muted-foreground">
          Puedes cambiar tu consentimiento en cualquier momento.
        </p>
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

      <div className="mt-3 flex flex-wrap gap-2">
        <button
          type="button"
          className="rounded border px-3 py-2 text-sm"
          onClick={() => {
            setConsent("rejected");
            setConsentState("rejected");
          }}
        >
          Rechazar analítica
        </button>
        <button
          type="button"
          className="rounded bg-black px-3 py-2 text-sm text-white"
          onClick={() => {
            setConsent("accepted");
            setConsentState("accepted");
          }}
        >
          Aceptar analítica
        </button>
        <button
          type="button"
          className="rounded border px-3 py-2 text-sm"
          onClick={() => {
            clearConsent();
            setConsentState("unset");
          }}
        >
          Restablecer
        </button>
      </div>

      <p className="mt-3 text-xs text-muted-foreground">
        Nota: al rechazar, no se cargará ningún script de analítica. Al aceptar, se cargará el proveedor configurado.
      </p>
    </div>
  );
}
