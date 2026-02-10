"use client";

import Script from "next/script";
import { useEffect, useMemo, useState } from "react";
import { getConsentCategories } from "@/lib/consent-client";

type Props = {
  usesAnalytics: boolean;
  provider?: string | null;
  analyticsId?: string | null;
};

function normalizeProvider(p?: string | null) {
  const s = (p ?? "").toLowerCase();
  if (s.includes("google")) return "ga4";
  if (s.includes("ga4")) return "ga4";
  if (s.includes("plausible")) return "plausible";
  return "custom";
}

export default function AnalyticsLoader({ usesAnalytics, provider, analyticsId }: Props) {
  const [allowed, setAllowed] = useState(false);

  useEffect(() => {
    if (!usesAnalytics) return;
    const sync = () => setAllowed(!!getConsentCategories()?.analytics);
    sync();
    window.addEventListener("wcp_consent_change", sync);
    return () => window.removeEventListener("wcp_consent_change", sync);
  }, [usesAnalytics]);

  const kind = useMemo(() => normalizeProvider(provider), [provider]);
  const id = (analyticsId ?? "").trim();

  if (!usesAnalytics) return null;
  if (!allowed) return null;
  if (!id) return null;

  // MVP: GA4 support (Measurement ID). Others can be added later.
  if (kind === "ga4") {
    return (
      <>
        <Script
          id="ga4-src"
          src={`https://www.googletagmanager.com/gtag/js?id=${encodeURIComponent(id)}`}
          strategy="afterInteractive"
        />
        <Script id="ga4-init" strategy="afterInteractive">
          {`
            window.dataLayer = window.dataLayer || [];
            function gtag(){dataLayer.push(arguments);}
            gtag('js', new Date());
            gtag('config', '${id}', { anonymize_ip: true });
          `}
        </Script>
      </>
    );
  }

  // Plausible: analyticsId should be the domain, e.g. "example.com".
  if (kind === "plausible") {
    return (
      <Script
        id="plausible-src"
        strategy="afterInteractive"
        src="https://plausible.io/js/script.js"
        data-domain={id}
      />
    );
  }

  // Unknown provider: don't load anything by default (safer).
  return null;
}
