export function getBaseUrl() {
  const env = process.env.NEXT_PUBLIC_BASE_URL?.trim();
  return env && env.length > 0 ? env.replace(/\/$/, "") : "http://localhost:3000";
}

// Canonical para rutas públicas de un tenant.
// path: "" | "/servicios" | "/legal/cookies" ...
export function publicCanonical(tenant: string, path: string = "") {
  const base = getBaseUrl();
  const clean = path === "/" ? "" : path;
  return `${base}/t/${tenant}${clean}`;
}
