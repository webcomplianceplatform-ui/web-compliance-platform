"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { getConsent, setConsent, type ConsentState } from "@/lib/consent-client";

export default function CookieBanner({
  tenant,
  usesAnalytics,
}: {
  tenant: string;
  usesAnalytics: boolean;
}) {
  const [consent, setConsentState] = useState<ConsentState>("unset");
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
    setConsentState(getConsent());
  }, []);

  const show = mounted && usesAnalytics && consent === "unset";
  const cookiesHref = useMemo(() => `/t/${tenant}/legal/cookies?manage=1`, [tenant]);

  if (!show) return null;

  return (
    <div className="fixed inset-x-0 bottom-0 z-50">
      <div className="mx-auto max-w-5xl p-4">
        <div className="rounded-lg border bg-white p-4 shadow-sm">
          <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
            <div className="text-sm">
              <div className="font-medium">Cookies y analítica</div>
              <p className="mt-1 text-muted-foreground">
                Usamos cookies para medir el uso del sitio (analítica). Puedes aceptar o rechazar.
                Consulta la {" "}
                <Link className="underline" href={`/t/${tenant}/legal/cookies`}>
                  política de cookies
                </Link>
                .
              </p>
            </div>

            <div className="flex flex-wrap gap-2">
              <button
                type="button"
                className="rounded border px-3 py-2 text-sm"
                onClick={() => {
                  setConsent("rejected");
                  setConsentState("rejected");
                }}
              >
                Rechazar
              </button>
              <Link className="rounded border px-3 py-2 text-sm" href={cookiesHref}>
                Configurar
              </Link>
              <button
                type="button"
                className="rounded bg-black px-3 py-2 text-sm text-white"
                onClick={() => {
                  setConsent("accepted");
                  setConsentState("accepted");
                }}
              >
                Aceptar
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
