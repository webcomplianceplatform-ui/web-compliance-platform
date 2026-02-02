import { NextResponse, type NextRequest } from "next/server";

const CSP_REPORT_ONLY =
  "default-src 'self'; " +
  "base-uri 'self'; " +
  "object-src 'none'; " +
  "frame-ancestors 'none'; " +
  "img-src 'self' data: https:; " +
  "font-src 'self' data: https:; " +
  "style-src 'self' 'unsafe-inline' https:; " +
  "script-src 'self' 'unsafe-inline' 'unsafe-eval' https:; " +
  "connect-src 'self' https: wss:; " +
  "report-uri /api/security/csp-report";

export function middleware(req: NextRequest) {
  // Only set CSP headers on document/navigation requests.
  const accept = req.headers.get("accept") ?? "";
  if (!accept.includes("text/html")) {
    return NextResponse.next();
  }

  const res = NextResponse.next();
  res.headers.set("Content-Security-Policy-Report-Only", CSP_REPORT_ONLY);
  res.headers.set("X-Content-Type-Options", "nosniff");
  res.headers.set("Referrer-Policy", "strict-origin-when-cross-origin");
  return res;
}

export const config = {
  matcher: [
    "/((?!_next/static|_next/image|favicon.ico|robots.txt|sitemap.xml).*)",
  ],
};
