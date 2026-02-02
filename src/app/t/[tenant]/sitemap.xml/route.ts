import { NextResponse } from "next/server";
import { getPublicTenant } from "@/lib/public-tenant";
import { getBaseUrl } from "@/lib/seo";

function xmlEscape(s: string) {
  return s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
}

export async function GET(_req: Request, ctx: any) {
  const params = await ctx.params;

  const { tenant } = params;
  const data = await getPublicTenant(tenant);
  if (!data) return new NextResponse("Not found", { status: 404 });

  const base = getBaseUrl();
  const now = new Date().toISOString();

  const urls = [
    `${base}/t/${tenant}`,
    `${base}/t/${tenant}/servicios`,
    `${base}/t/${tenant}/sobre`,
    `${base}/t/${tenant}/contacto`,
    `${base}/t/${tenant}/legal/aviso-legal`,
    `${base}/t/${tenant}/legal/privacidad`,
    `${base}/t/${tenant}/legal/cookies`,
  ];

  const xml = `<?xml version="1.0" encoding="UTF-8"?>\n` +
    `<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n` +
    urls
      .map((loc) => {
        return `  <url>\n    <loc>${xmlEscape(loc)}</loc>\n    <lastmod>${now}</lastmod>\n  </url>`;
      })
      .join("\n") +
    `\n</urlset>\n`;

  return new NextResponse(xml, {
    headers: {
      "content-type": "application/xml; charset=utf-8",
      // cache on edge/CDN
      "cache-control": "public, max-age=0, s-maxage=3600",
    },
  });
}
