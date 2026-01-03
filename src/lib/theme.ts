export type TenantTheme = {
  brandName: string;
  tagline?: string;
  logoUrl?: string;

  primary?: string;
  accent?: string;

  hero?: {
    headline: string;
    subheadline?: string;
    ctaText?: string;
    ctaHref?: string;
  };

  pages?: {
    services?: { title: string; description: string }[];
    about?: { title: string; body: string };
    contact?: { title?: string; email?: string; phone?: string; address?: string };
  };

  seo?: {
    title?: string;
    description?: string;
    ogImageUrl?: string;
  };
};

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
  },
};
