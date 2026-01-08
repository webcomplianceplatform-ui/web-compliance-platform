import { NextResponse } from "next/server";

export function devUnauthorized() {
  return NextResponse.json({ ok: false, error: "unauthorized" }, { status: 401 });
}

export function devForbidden() {
  return NextResponse.json({ ok: false, error: "forbidden" }, { status: 403 });
}

/**
 * Allows dev endpoints only in non-production, and optionally requires a secret.
 * - Production: always blocked
 * - Non-production: allowed only if secret matches (if DEV_SECRET is set)
 */
export function requireDevAccess(req: Request) {
  if (process.env.NODE_ENV === "production") {
    return { ok: false as const, res: devForbidden() };
  }

  const expected = (process.env.DEV_SECRET || "").trim();
  if (!expected) {
    // If you don't set DEV_SECRET locally, we allow (still safe because prod is blocked)
    return { ok: true as const };
  }

  const url = new URL(req.url);
  const provided =
    req.headers.get("x-dev-secret") ??
    url.searchParams.get("secret") ??
    "";

  if (provided !== expected) {
    return { ok: false as const, res: devUnauthorized() };
  }

  return { ok: true as const };
}
