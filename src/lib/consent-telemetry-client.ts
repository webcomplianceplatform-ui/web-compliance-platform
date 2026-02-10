"use client";

import type { ConsentState, ConsentCategories } from "@/lib/consent-client";
import { getConsentCategories } from "@/lib/consent-client";

/**
 * Best-effort server-side logging of consent decisions (for evidence).
 * Uses sendBeacon when available; falls back to fetch.
 */
export async function logPublicConsent(args: {
  tenant: string;
  state: ConsentState;
  source: "cookie_banner" | "consent_manager";
  categories?: ConsentCategories | null;
}) {
  try {
    const { tenant, state, source } = args;
    if (!tenant) return;

    const categories = args.categories ?? getConsentCategories();

    const payload = {
      state,
      source,
      categories,
      path: typeof window !== "undefined" ? window.location.pathname : null,
      referrer: typeof document !== "undefined" ? document.referrer : null,
    };

    const url = `/api/t/${encodeURIComponent(tenant)}/consent`;

    // sendBeacon is more reliable during navigation.
    const json = JSON.stringify(payload);
    const nav: any = typeof navigator !== "undefined" ? navigator : null;
    if (nav?.sendBeacon) {
      const blob = new Blob([json], { type: "application/json" });
      nav.sendBeacon(url, blob);
      return;
    }

    await fetch(url, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: json,
      keepalive: true,
    });
  } catch {
    // best-effort
  }
}
