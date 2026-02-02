export type SiteSection =
  | {
      id: string;
      type: "hero";
      headline?: string | null;
      subheadline?: string | null;
      ctaText?: string | null;
      ctaHref?: string | null;
      /** Optional visual upgrades */
      imageUrl?: string | null; // side illustration (corporate SaaS)
      backgroundUrl?: string | null; // full background illustration
      layout?: "split" | "background" | null;
    }
  | {
      id: string;
      type: "features";
      title?: string | null;
      items?: { title: string; description?: string | null; icon?: string | null }[] | null;
    }
  | {
      id: string;
      type: "services";
      title?: string | null;
      items?: { title: string; description?: string | null; icon?: string | null }[] | null;
    }
  | {
      id: string;
      type: "imageText";
      eyebrow?: string | null;
      title?: string | null;
      body?: string | null;
      imageUrl?: string | null;
      imageAlt?: string | null;
      imageSide?: "left" | "right" | null;
    }
  | { id: string; type: "about"; title?: string | null; body?: string | null }
  | {
      id: string;
      type: "contact";
      title?: string | null;
      email?: string | null;
      phone?: string | null;
      address?: string | null;
    }
  | {
      id: string;
      type: "cta";
      title?: string | null;
      text?: string | null;
      buttonText?: string | null;
      buttonHref?: string | null;
    };

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

  // ✅ NUEVO: documentos legales (texto editable por tenant)
  legalDocs?: {
    avisoLegal?: string | null;
    privacidad?: string | null;
    cookies?: string | null;
  } | null;

  // ✅ NUEVO: footer público (2 columnas + links legales)
  footer?: {
    aboutText?: string | null;
    email?: string | null;
    phone?: string | null;
    location?: string | null;
    copyright?: string | null;
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

  // ✅ NUEVO: builder por bloques (landing)
  siteBuilder?: {
    pages?: {
      home?: SiteSection[] | null;
      services?: SiteSection[] | null;
      about?: SiteSection[] | null;
      contact?: SiteSection[] | null;
    } | null;
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

    notifications: t.notifications ?? null,

    siteBuilder: t.siteBuilder ?? null,

    siteBuilder: t.siteBuilder ?? null,

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
  // Defaults aligned with the platform brand palette
  primary: "#506a75",
  accent: "#cefe82",
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

  legalDocs: {
    avisoLegal: "",
    privacidad: "",
    cookies: "",
  },

  footer: {
    aboutText: "",
    email: "",
    phone: "",
    location: "",
    copyright: "",
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

  siteBuilder: {
    pages: {
      home: [
        {
          id: "hero-1",
          type: "hero",
          layout: "split",
          headline: "Tu web corporativa, con look premium y base legal",
          subheadline:
            "WebCompliance te da un site moderno por bloques + soporte por tickets + monitoring Uptime/SSL.",
          ctaText: "Pedir demo",
          ctaHref: "/contacto",
          imageUrl: "/builder/corp-hero.svg",
        },
        {
          id: "features-1",
          type: "features",
          title: "Por qué funciona",
          items: [
            { title: "Rápida", icon: "Zap", description: "Carga rápido y se siente producto." },
            { title: "Legal-ready", icon: "Shield", description: "Avisos, privacidad y cookies por tenant." },
            { title: "Operable", icon: "Wrench", description: "Tickets + roles + auditoría." },
          ],
        },
        {
          id: "imagetext-1",
          type: "imageText",
          eyebrow: "Diseño + operación",
          title: "Un builder simple, pero con resultado de agencia",
          body:
            "Edita el hero, servicios y secciones visuales sin tocar código. Mantén control en dominio, SEO y legal desde Settings.",
          imageUrl: "/builder/corp-abstract-1.svg",
          imageAlt: "Abstract SaaS illustration",
          imageSide: "right",
        },
        {
          id: "services-1",
          type: "services",
          title: "Servicios",
          items: [
            { title: "Web corporativa", icon: "Layout", description: "Landing premium con componentes." },
            { title: "Compliance", icon: "Scale", description: "Legal + cookies con control centralizado." },
            { title: "Mantenimiento", icon: "Ticket", description: "Solicitudes y cambios por ticket." },
          ],
        },
        {
          id: "cta-1",
          type: "cta",
          title: "¿Listo para una demo real?",
          text: "Te preparo un tenant con tu marca y una landing lista para enseñar.",
          buttonText: "Crear ticket",
          buttonHref: "/contacto",
        },
      ],
      services: [
        {
          id: "services-1",
          type: "services",
          title: "Servicios",
          items: [
            { title: "Web corporativa", icon: "Layout", description: "Landing premium con componentes." },
            { title: "Compliance", icon: "Scale", description: "Legal + cookies con control centralizado." },
            { title: "Mantenimiento", icon: "Ticket", description: "Solicitudes y cambios por ticket." },
          ],
        },
      ],
      about: [
        {
          id: "about-1",
          type: "about",
          title: "Sobre nosotros",
          body: "Describe aquí tu propuesta de valor.\n\nEsto se puede editar por tenant desde el panel.",
        },
      ],
      contact: [
        {
          id: "contact-1",
          type: "contact",
          title: "Contacto",
          email: "contacto@tu-negocio.com",
        },
      ],
    },
  },
};

