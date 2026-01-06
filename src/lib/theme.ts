export type TenantTheme = {
brandName?: string | null;
  logoUrl?: string | null;
  tagline?: string | null;
  primary?: string | null;
  accent?: string | null;

  hero?: {
    headline?: string | null;
    subheadline?: string | null;
    ctaText?: string | null;
    ctaHref?: string | null;
  } | null;

  seo?: {
    title?: string | null;
    description?: string | null;
    ogImageUrl?: string | null;
    faviconUrl?: string | null;
  } | null;

 pages?: {
  services?: { title: string; description: string }[];
  about?: { title?: string | null; body?: string | null } | null;
  contact?: {
    title?: string | null;
    email?: string | null;
    phone?: string | null;
    address?: string | null;
  } | null;
} | null;


  // ✅ NUEVO: Legal
  legal?: {
    companyName?: string | null;
    tradeName?: string | null; // si usan nombre comercial
    cifNif?: string | null;
    address?: string | null;
    city?: string | null;
    country?: string | null;
    email?: string | null;
    phone?: string | null;

    // cookies / analytics
    usesAnalytics?: boolean | null; // Google Analytics, etc
    analyticsProvider?: string | null; // "Google Analytics", "Plausible", etc
    analyticsId?: string | null; // ej: GA4 Measurement ID (G-XXXX) o similar

    // info legal
    lastUpdated?: string | null; // ej: "2026-01-05" o "January 5, 2026"
  } | null;

  notifications?: {
    ticketEmails?: string[] | null;
    monitorEmails?: string[] | null;
  } | null;

  // ✅ NUEVO: navegación pública editable
  navigation?: {
    // links del header (desktop + mobile). href debe ser path relativo tipo "/", "/servicios", etc.
    primary?: { label: string; href: string }[] | null;
  } | null;
};
export function sanitizeTheme(input: any) {
  const t = input ?? {};
  return {
    brandName: t.brandName ?? null,
    logoUrl: t.logoUrl ?? null,
    tagline: t.tagline ?? null,
    primary: t.primary ?? null,
    accent: t.accent ?? null,
    hero: t.hero ?? null,
    seo: t.seo ?? null,
    pages: t.pages ?? null,

    navigation: t.navigation ?? null,

    // ✅ NUEVO
    legal: {
      companyName: t.legal?.companyName ?? null,
      tradeName: t.legal?.tradeName ?? null,
      cifNif: t.legal?.cifNif ?? null,
      address: t.legal?.address ?? null,
      city: t.legal?.city ?? null,
      country: t.legal?.country ?? null,
      email: t.legal?.email ?? null,
      phone: t.legal?.phone ?? null,
      usesAnalytics: !!t.legal?.usesAnalytics,
      analyticsProvider: t.legal?.analyticsProvider ?? null,
      analyticsId: t.legal?.analyticsId ?? null,

      lastUpdated: t.legal?.lastUpdated ?? null,
    },
  };
}

export const defaultTheme: TenantTheme = {
  brandName: "Tu negocio",
  tagline: "Web corporativa legal y profesional",
  primary: "#111111",
  accent: "#F59E0B",
  hero: {
    headline: "Impulsamos tu negocio con una web profesional",
    subheadline: "Rápida, legal y lista para convertir.",
    ctaText: "Contactar",
    ctaHref: "/contacto",
  },
  pages: {
    services: [
      { title: "Web corporativa", description: "Rápida, moderna y enfocada a conversión." },
      { title: "Legal + cookies", description: "Estructura preparada para cumplimiento." },
      { title: "Mantenimiento", description: "Tickets, cambios y monitorización." },
    ],
    about: {
      title: "Sobre nosotros",
      body: "Describe aquí tu propuesta de valor. Esto luego puede ir a CMS.",
    },
    contact: { title: "Contacto", email: "contacto@tu-negocio.com" },
  },
  seo: {
    title: "Web corporativa profesional",
    description: "Sitio rápido, SEO-ready y con base legal.",
    faviconUrl: "",
  },
  legal: {
    companyName: "",
    tradeName: "",
    cifNif: "",
    address: "",
    city: "",
    country: "España",
    email: "",
    phone: "",
    usesAnalytics: false,
    analyticsProvider: "Google Analytics",
    analyticsId: "",

    lastUpdated: "",
  },

  notifications: {
    ticketEmails: [],
    monitorEmails: [],
  },

  navigation: {
    primary: [
      { label: "Inicio", href: "/" },
      { label: "Servicios", href: "/servicios" },
      { label: "Sobre", href: "/sobre" },
      { label: "Contacto", href: "/contacto" },
    ],
  },
};

