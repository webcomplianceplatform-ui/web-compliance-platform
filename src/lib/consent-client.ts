"use client";

export type ConsentState = "unset" | "accepted" | "rejected";

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

export function getConsent(): ConsentState {
  try {
    const raw = parseCookies()[COOKIE_NAME];
    if (!raw) return "unset";
    if (raw === "accepted" || raw === "rejected") return raw;
    return "unset";
  } catch {
    return "unset";
  }
}

export function setConsent(state: Exclude<ConsentState, "unset">) {
  // 180 días (MVP). Ajustable.
  const days = 180;
  const maxAge = 60 * 60 * 24 * days;
  document.cookie = `${encodeURIComponent(COOKIE_NAME)}=${encodeURIComponent(state)}; Max-Age=${maxAge}; Path=/; SameSite=Lax`;
  try {
    window.dispatchEvent(new Event("wcp_consent_change"));
  } catch {}
}

export function clearConsent() {
  document.cookie = `${encodeURIComponent(COOKIE_NAME)}=; Max-Age=0; Path=/; SameSite=Lax`;
  try {
    window.dispatchEvent(new Event("wcp_consent_change"));
  } catch {}
}
