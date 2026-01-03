import { TenantTheme, defaultTheme } from "@/lib/theme";

function isObject(v: unknown): v is Record<string, any> {
  return !!v && typeof v === "object" && !Array.isArray(v);
}

function deepMerge<T>(base: T, patch: any): T {
  if (!isObject(patch)) return base;

  const out: any = Array.isArray(base) ? [...(base as any)] : { ...(base as any) };
  for (const [k, v] of Object.entries(patch)) {
    if (v === undefined) continue;

    if (isObject(v) && isObject((out as any)[k])) out[k] = deepMerge((out as any)[k], v);
    else out[k] = v;
  }
  return out;
}

// Opcional: sanea URLs básicas para evitar `javascript:`
function safeUrl(u?: string) {
  if (!u) return u;
  const s = u.trim();
  if (s.startsWith("javascript:")) return "";
  return s;
}

export function sanitizeTheme(input: any): TenantTheme {
  // whitelist “manual” (lo suficiente para MVP)
  const theme: any = {};

  if (typeof input?.brandName === "string") theme.brandName = input.brandName;
  if (typeof input?.tagline === "string") theme.tagline = input.tagline;
  if (typeof input?.logoUrl === "string") theme.logoUrl = safeUrl(input.logoUrl);

  if (typeof input?.primary === "string") theme.primary = input.primary;
  if (typeof input?.accent === "string") theme.accent = input.accent;

  if (isObject(input?.hero)) {
    theme.hero = {};
    if (typeof input.hero.headline === "string") theme.hero.headline = input.hero.headline;
    if (typeof input.hero.subheadline === "string") theme.hero.subheadline = input.hero.subheadline;
    if (typeof input.hero.ctaText === "string") theme.hero.ctaText = input.hero.ctaText;
    if (typeof input.hero.ctaHref === "string") theme.hero.ctaHref = safeUrl(input.hero.ctaHref);
  }

  if (isObject(input?.pages)) {
    theme.pages = {};
    if (Array.isArray(input.pages.services)) {
      theme.pages.services = input.pages.services
        .filter((x: any) => typeof x?.title === "string" && typeof x?.description === "string")
        .slice(0, 12);
    }
    if (isObject(input.pages.about)) {
      theme.pages.about = {};
      if (typeof input.pages.about.title === "string") theme.pages.about.title = input.pages.about.title;
      if (typeof input.pages.about.body === "string") theme.pages.about.body = input.pages.about.body;
    }
    if (isObject(input.pages.contact)) {
      theme.pages.contact = {};
      if (typeof input.pages.contact.title === "string") theme.pages.contact.title = input.pages.contact.title;
      if (typeof input.pages.contact.email === "string") theme.pages.contact.email = input.pages.contact.email;
      if (typeof input.pages.contact.phone === "string") theme.pages.contact.phone = input.pages.contact.phone;
      if (typeof input.pages.contact.address === "string") theme.pages.contact.address = input.pages.contact.address;
    }
  }

  if (isObject(input?.seo)) {
    theme.seo = {};
    if (typeof input.seo.title === "string") theme.seo.title = input.seo.title;
    if (typeof input.seo.description === "string") theme.seo.description = input.seo.description;
    if (typeof input.seo.ogImageUrl === "string") theme.seo.ogImageUrl = safeUrl(input.seo.ogImageUrl);
  }

  return deepMerge(defaultTheme, theme);
}
