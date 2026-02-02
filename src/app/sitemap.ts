import type { MetadataRoute } from "next";
import { prisma } from "@/lib/db";

const baseUrl = process.env.NEXT_PUBLIC_BASE_URL ?? "http://localhost:3000";

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const tenants = await prisma.tenant.findMany({
    select: { slug: true, updatedAt: true },
    take: 500,
  });

  const staticPages = ["", "/servicios", "/sobre", "/contacto", "/legal/aviso", "/legal/privacidad", "/legal/cookies"];

  const out: MetadataRoute.Sitemap = [];

  for (const t of tenants) {
    for (const p of staticPages) {
      out.push({
        url: `${baseUrl}/t/${t.slug}${p}`,
        lastModified: t.updatedAt,
      });
    }
  }

  return out;
}
