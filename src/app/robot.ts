import type { MetadataRoute } from "next";

export default function robots(): MetadataRoute.Robots {
  // En MVP: permitimos todo. Más adelante, si quieres bloquear /app
  return {
    rules: [
      {
        userAgent: "*",
        allow: "/",
        disallow: ["/app/"],
      },
    ],
    sitemap: `${process.env.NEXT_PUBLIC_BASE_URL ?? "http://localhost:3000"}/sitemap.xml`,
  };
}
