import { NextResponse } from "next/server";
import { getBaseUrl } from "@/lib/seo";

export async function GET() {
  const base = getBaseUrl();

  // Nota: el sitemap es por-tenant, en /t/{tenant}/sitemap.xml
  const body =
    `User-agent: *\n` +
    `Allow: /\n` +
    `Disallow: /app/\n` +
    `Disallow: /api/\n` +
    `\n` +
    `# Sitemaps are per-tenant: ${base}/t/{tenant}/sitemap.xml\n`;

  return new NextResponse(body, {
    headers: {
      "content-type": "text/plain; charset=utf-8",
      "cache-control": "public, max-age=0, s-maxage=3600",
    },
  });
}
