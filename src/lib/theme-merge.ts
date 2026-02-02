import { TenantTheme, defaultTheme } from "@/lib/theme";

function isObject(v: unknown): v is Record<string, any> {
  return !!v && typeof v === "object" && !Array.isArray(v);
}


function sanitizeEmailList(list: unknown): string[] {
  if (!Array.isArray(list)) return [];
  const out: string[] = [];
  for (const v of list) {
    if (typeof v !== "string") continue;
    const s = v.trim();
    if (!s) continue;
    // Simple email sanity check (MVP)
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(s)) continue;
    out.push(s.toLowerCase());
  }
  // de-dup
  return Array.from(new Set(out)).slice(0, 10);
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

// Paths internos del site público. MVP: solo permitimos rutas relativas ("/contacto", etc.)
function safePath(p?: string) {
  if (!p) return p;
  const s = p.trim();
  if (!s.startsWith("/")) return "";
  if (s.startsWith("//")) return "";
  // evita esquemas tipo "/\njavascript:..." o cosas raras
  if (s.toLowerCase().includes("javascript:")) return "";
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
    if (typeof input.seo.faviconUrl === "string") theme.seo.faviconUrl = safeUrl(input.seo.faviconUrl);
  }

  if (isObject(input?.navigation)) {
    theme.navigation = {};
    if (Array.isArray(input.navigation.primary)) {
      theme.navigation.primary = input.navigation.primary
        .filter((x: any) => typeof x?.label === "string" && typeof x?.href === "string")
        .map((x: any) => ({
          label: String(x.label).slice(0, 40),
          href: safePath(String(x.href)),
        }))
        .filter((x: any) => x.href)
        .slice(0, 12);
    }
  }

  if (isObject(input?.legal)) {
    theme.legal = {};
    if (typeof input.legal.companyName === "string") theme.legal.companyName = input.legal.companyName;
    if (typeof input.legal.tradeName === "string") theme.legal.tradeName = input.legal.tradeName;
    if (typeof input.legal.cifNif === "string") theme.legal.cifNif = input.legal.cifNif;
    if (typeof input.legal.address === "string") theme.legal.address = input.legal.address;
    if (typeof input.legal.city === "string") theme.legal.city = input.legal.city;
    if (typeof input.legal.country === "string") theme.legal.country = input.legal.country;
    if (typeof input.legal.email === "string") theme.legal.email = input.legal.email;
    if (typeof input.legal.phone === "string") theme.legal.phone = input.legal.phone;

    if (typeof input.legal.usesAnalytics === "boolean") theme.legal.usesAnalytics = input.legal.usesAnalytics;
    if (typeof input.legal.analyticsProvider === "string") theme.legal.analyticsProvider = input.legal.analyticsProvider;
    if (typeof input.legal.analyticsId === "string") theme.legal.analyticsId = input.legal.analyticsId;

    if (typeof input.legal.lastUpdated === "string") theme.legal.lastUpdated = String(input.legal.lastUpdated).slice(0, 40);
  }

  if (isObject(input?.legalDocs)) {
    theme.legalDocs = {};
    if (typeof input.legalDocs.avisoLegal === "string") theme.legalDocs.avisoLegal = input.legalDocs.avisoLegal.slice(0, 20000);
    if (typeof input.legalDocs.privacidad === "string") theme.legalDocs.privacidad = input.legalDocs.privacidad.slice(0, 20000);
    if (typeof input.legalDocs.cookies === "string") theme.legalDocs.cookies = input.legalDocs.cookies.slice(0, 20000);
  }

  if (isObject(input?.footer)) {
    theme.footer = {};
    if (typeof input.footer.aboutText === "string") theme.footer.aboutText = input.footer.aboutText.slice(0, 800);
    if (typeof input.footer.email === "string") theme.footer.email = input.footer.email.slice(0, 120);
    if (typeof input.footer.phone === "string") theme.footer.phone = input.footer.phone.slice(0, 80);
    if (typeof input.footer.location === "string") theme.footer.location = input.footer.location.slice(0, 120);
    if (typeof input.footer.copyright === "string") theme.footer.copyright = input.footer.copyright.slice(0, 120);
  }

if (isObject(input?.notifications)) {
  theme.notifications = {
    ticketEmails: sanitizeEmailList((input.notifications as any).ticketEmails),
    monitorEmails: sanitizeEmailList((input.notifications as any).monitorEmails),
  };
}

  return deepMerge(defaultTheme, theme);
}
