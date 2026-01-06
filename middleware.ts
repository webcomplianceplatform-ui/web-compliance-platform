import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

const BYPASS_PREFIXES = ["/t", "/t/", "/app", "/api", "/login", "/_next", "/favicon.ico"];

function isBypassedPath(pathname: string) {
  return BYPASS_PREFIXES.some((p) => pathname === p || pathname.startsWith(p));
}

function getHost(req: NextRequest) {
  const raw = req.headers.get("x-forwarded-host") || req.headers.get("host") || "";
  return (raw.split(":")[0] || "").toLowerCase();
}

export async function middleware(req: NextRequest) {
  const url = req.nextUrl;
  const host = getHost(req);

  // Debug para comprobar que el middleware corre
  // (lo verás en Network → Response headers)
  const addDebug = (res: NextResponse) => {
    res.headers.set("x-mw", "1");
    res.headers.set("x-mw-host", host);
    return res;
  };

  // No tocar internos
  if (!host || host.includes("localhost") || host.includes("127.0.0.1") || isBypassedPath(url.pathname)) {
    return addDebug(NextResponse.next());
  }

  // Resolver tenant (Node API route)
  const resolveUrl = new URL("/api/domain/resolve", url.origin);
  resolveUrl.searchParams.set("host", host);

  try {
    const r = await fetch(resolveUrl, {
      headers: { "x-internal": "1" },
      cache: "no-store", // en dev, mejor evitar caches raras
    });

    if (!r.ok) return addDebug(NextResponse.next());

    const data = (await r.json()) as any;

    const tenant = data?.tenant ?? data?.data?.tenant ?? data?.result?.tenant ?? null;
    const ok = data?.ok ?? true;

    if (!ok || !tenant) return addDebug(NextResponse.next());

    // "/" -> "/t/demo" (sin barra extra)
    const path = url.pathname === "/" ? "" : url.pathname;

    const rewritten = url.clone();
    rewritten.pathname = `/t/${tenant}${path}`;

    const res = NextResponse.rewrite(rewritten);
    res.headers.set("x-wc-tenant", String(tenant));
    res.headers.set("x-wc-rewrite", rewritten.pathname);
    return addDebug(res);
  } catch {
    return addDebug(NextResponse.next());
  }
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico).*)"],
};
