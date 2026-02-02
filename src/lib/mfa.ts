import crypto from "crypto";

// We sign MFA verification cookies so they can't be forged.
// Uses NEXTAUTH_SECRET (or AUTH_SECRET) as HMAC key.
function getSecret() {
  return (
    process.env.NEXTAUTH_SECRET ||
    process.env.AUTH_SECRET ||
    process.env.SECRET ||
    ""
  );
}

export type MfaCookiePayload = {
  uid: string;
  tenantId: string;
  iat?: number; // unix ms
  exp: number; // unix ms
};

// Global (superadmin/account-wide) MFA verification cookie uses a sentinel tenant id.
export const MFA_GLOBAL_TENANT_ID = "__global__";

function b64url(input: Buffer | string) {
  const b = Buffer.isBuffer(input) ? input : Buffer.from(input);
  return b
    .toString("base64")
    .replace(/\+/g, "-")
    .replace(/\//g, "_")
    .replace(/=+$/g, "");
}

function unb64url(input: string) {
  const pad = input.length % 4 === 0 ? "" : "=".repeat(4 - (input.length % 4));
  const s = input.replace(/-/g, "+").replace(/_/g, "/") + pad;
  return Buffer.from(s, "base64");
}

export function signMfaCookie(
  payload: Partial<MfaCookiePayload> & { uid: string; tenantId: string },
  opts?: { ttlMs?: number },
) {
  const secret = getSecret();
  if (!secret) throw new Error("Missing NEXTAUTH_SECRET for MFA signing");

  const now = Date.now();
  const ttlMs = typeof opts?.ttlMs === "number" ? opts.ttlMs : 12 * 60 * 60 * 1000;
  const full: MfaCookiePayload = {
    uid: payload.uid,
    tenantId: payload.tenantId,
    iat: typeof payload.iat === "number" ? payload.iat : now,
    exp: typeof payload.exp === "number" ? payload.exp : now + ttlMs,
  };

  const body = b64url(JSON.stringify(full));
  const sig = b64url(crypto.createHmac("sha256", secret).update(body).digest());
  return `${body}.${sig}`;
}

export function verifyMfaCookie(value: string): MfaCookiePayload | null {
  const secret = getSecret();
  if (!secret) return null;
  const [body, sig] = value.split(".");
  if (!body || !sig) return null;
  const expected = b64url(crypto.createHmac("sha256", secret).update(body).digest());
  // constant-time compare
  const a = Buffer.from(expected);
  const b = Buffer.from(sig);
  if (a.length !== b.length) return null;
  if (!crypto.timingSafeEqual(a, b)) return null;

  try {
    const payload = JSON.parse(unb64url(body).toString("utf8")) as MfaCookiePayload;
    if (!payload?.uid || !payload?.tenantId || !payload?.exp) return null;
    if (Date.now() > Number(payload.exp)) return null;
    return payload;
  } catch {
    return null;
  }
}

export function mfaVerifiedRecently(payload: MfaCookiePayload, maxAgeMs: number) {
  const now = Date.now();
  const iat = typeof payload.iat === "number" ? payload.iat : payload.exp - 12 * 60 * 60 * 1000;
  return now - iat <= maxAgeMs;
}

export function mfaCookieName(tenantId: string) {
  // per-tenant verification (policy is tenant-scoped)
  return `wc_mfa_ok_${tenantId}`;
}

// Global MFA verification cookie (for superadmin area and account-wide reauth)
export function mfaCookieNameGlobal() {
  return mfaCookieName(MFA_GLOBAL_TENANT_ID);
}

export function isGlobalMfaPayload(p: MfaCookiePayload | null | undefined) {
  return !!p && p.tenantId === MFA_GLOBAL_TENANT_ID;
}
