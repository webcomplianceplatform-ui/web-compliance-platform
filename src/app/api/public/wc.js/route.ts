import { NextResponse } from "next/server";

// Public, embeddable script.
// Minimal purpose for now:
// - phone-home once when the website loads (creates evidence.source.connected)
// - does NOT set cookies / banners yet (kept intentionally small for P0 activation)

export async function GET(req: Request) {
  const url = new URL(req.url);
  const tenant = url.searchParams.get("tenant");
  if (!tenant) {
    return new NextResponse("/* missing tenant */", {
      status: 400,
      headers: { "content-type": "application/javascript; charset=utf-8" },
    });
  }

  const origin = `${url.protocol}//${url.host}`;
  const endpoint = `${origin}/api/public/evidence/connected`;

  const js = `(() => {
  const TENANT = ${JSON.stringify(tenant)};
  const ENDPOINT = ${JSON.stringify(endpoint)};

  function payload() {
    return {
      tenant: TENANT,
      host: window.location.host,
      href: window.location.href,
      referrer: document.referrer || null,
      ua: navigator.userAgent || null,
      ts: Date.now(),
    };
  }

  function send() {
    try {
      const body = JSON.stringify(payload());
      // Best-effort delivery even on page unload.
      if (navigator.sendBeacon) {
        const blob = new Blob([body], { type: "application/json" });
        navigator.sendBeacon(ENDPOINT, blob);
        return;
      }
      fetch(ENDPOINT, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body,
        keepalive: true,
      }).catch(() => {});
    } catch (_) {}
  }

  try {
    // Send on load, and again when the tab becomes visible (covers some caching / bfcache cases).
    send();
    document.addEventListener("visibilitychange", () => {
      if (document.visibilityState === "visible") send();
    });
    // Fallback retry once after 3s (covers transient network/CSP quirks).
    setTimeout(() => send(), 3000);
  } catch (_) {}
})();`;

  return new NextResponse(js, {
    status: 200,
    headers: {
      "content-type": "application/javascript; charset=utf-8",
      "cache-control": "no-store",
    },
  });
}
