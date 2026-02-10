"use client";

export type ConsentState = "unset" | "accepted" | "rejected" | "custom";

export type ConsentCategories = {
  necessary: true; // always true
  analytics: boolean;
  marketing: boolean;
};

export type ConsentPrefs = {
  v: 1;
  state: Exclude<ConsentState, "unset">;
  categories: ConsentCategories;
};

const COOKIE_NAME = "wcp_consent";

function parseCookies(): Record<string, string> {
  if (typeof document === "undefined") return {};
  return document.cookie
    .split(";")
    .map((c) => c.trim())
    .filter(Boolean)
    .reduce((acc, cur) => {
      const idx = cur.indexOf("=");
      if (idx === -1) return acc;
      const k = decodeURIComponent(cur.slice(0, idx).trim());
      const v = decodeURIComponent(cur.slice(idx + 1).trim());
      acc[k] = v;
      return acc;
    }, {} as Record<string, string>);
}

function safeJsonParse(raw: string): any | null {
  try {
    return JSON.parse(raw);
  } catch {
    return null;
  }
}

export function getConsentPrefs(): ConsentPrefs | null {
  const raw = parseCookies()[COOKIE_NAME];
  if (!raw) return null;

  // Backward compatible: old cookie stored a simple string.
  if (raw === "accepted") {
    return { v: 1, state: "accepted", categories: { necessary: true, analytics: true, marketing: true } };
  }
  if (raw === "rejected") {
    return { v: 1, state: "rejected", categories: { necessary: true, analytics: false, marketing: false } };
  }

  const obj = safeJsonParse(raw);
  if (!obj || obj.v !== 1) return null;

  const state = obj.state;
  if (state !== "accepted" && state !== "rejected" && state !== "custom") return null;

  const c = obj.categories ?? {};
  const analytics = !!c.analytics;
  const marketing = !!c.marketing;

  return { v: 1, state, categories: { necessary: true, analytics, marketing } };
}

export function getConsent(): ConsentState {
  const p = getConsentPrefs();
  if (!p) return "unset";
  return p.state;
}

export function getConsentCategories(): ConsentCategories | null {
  return getConsentPrefs()?.categories ?? null;
}

function setCookie(value: string) {
  // 180 días (MVP). Ajustable.
  const days = 180;
  const maxAge = 60 * 60 * 24 * days;
  document.cookie = `${encodeURIComponent(COOKIE_NAME)}=${encodeURIComponent(value)}; Max-Age=${maxAge}; Path=/; SameSite=Lax`;
  try {
    window.dispatchEvent(new Event("wcp_consent_change"));
  } catch {}
}

export function setConsent(state: Exclude<ConsentState, "unset">) {
  // Backward-compatible helper.
  if (state === "accepted") {
    setConsentPrefs({ state: "accepted", categories: { necessary: true, analytics: true, marketing: true } });
    return;
  }
  if (state === "rejected") {
    setConsentPrefs({ state: "rejected", categories: { necessary: true, analytics: false, marketing: false } });
    return;
  }
  // custom requires categories; keep current categories if any, otherwise default to analytics=false.
  const prev = getConsentPrefs();
  setConsentPrefs({
    state: "custom",
    categories: prev?.categories ?? { necessary: true, analytics: false, marketing: false },
  });
}

export function setConsentPrefs(input: { state: Exclude<ConsentState, "unset">; categories: Omit<ConsentCategories, "necessary"> | ConsentCategories }) {
  const cats = input.categories as any;
  const prefs: ConsentPrefs = {
    v: 1,
    state: input.state,
    categories: {
      necessary: true,
      analytics: !!cats.analytics,
      marketing: !!cats.marketing,
    },
  };
  setCookie(JSON.stringify(prefs));
}

export function clearConsent() {
  document.cookie = `${encodeURIComponent(COOKIE_NAME)}=; Max-Age=0; Path=/; SameSite=Lax`;
  try {
    window.dispatchEvent(new Event("wcp_consent_change"));
  } catch {}
}
