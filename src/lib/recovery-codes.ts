import crypto from "crypto";

export type StoredRecoveryCode = {
  hash: string;
  usedAt: string | null;
};

function getPepper() {
  return (
    process.env.RECOVERY_CODES_PEPPER ||
    process.env.NEXTAUTH_SECRET ||
    process.env.AUTH_SECRET ||
    process.env.SECRET ||
    ""
  );
}

export function generateRecoveryCodes(count = 10) {
  // Human-friendly, avoids ambiguous chars.
  const alphabet = "23456789ABCDEFGHJKLMNPQRSTUVWXYZ";
  const codes: string[] = [];
  for (let i = 0; i < count; i++) {
    const bytes = crypto.randomBytes(10);
    let raw = "";
    for (let j = 0; j < bytes.length; j++) {
      raw += alphabet[bytes[j] % alphabet.length];
    }
    // Format: XXXX-XXXX-XXXX
    codes.push(`${raw.slice(0, 4)}-${raw.slice(4, 8)}-${raw.slice(8, 12)}`);
  }
  return codes;
}

export function normalizeRecoveryCode(input: string) {
  return input.toUpperCase().replace(/\s/g, "").replace(/_/g, "-");
}

export function hashRecoveryCode(code: string, userId: string) {
  const pepper = getPepper();
  if (!pepper) throw new Error("Missing RECOVERY_CODES_PEPPER/NEXTAUTH_SECRET");
  const normalized = normalizeRecoveryCode(code);
  return crypto
    .createHmac("sha256", pepper)
    .update(`${userId}:${normalized}`)
    .digest("hex");
}

export function prepareStoredRecoveryCodes(codes: string[], userId: string): StoredRecoveryCode[] {
  return codes.map((c) => ({ hash: hashRecoveryCode(c, userId), usedAt: null }));
}

export function consumeRecoveryCode(
  stored: StoredRecoveryCode[] | null | undefined,
  userId: string,
  code: string
) {
  if (!stored?.length) return { ok: false as const, updated: stored ?? [] };
  const h = hashRecoveryCode(code, userId);
  const idx = stored.findIndex((x) => x.hash === h && x.usedAt == null);
  if (idx === -1) return { ok: false as const, updated: stored };
  const updated = stored.map((x, i) => (i === idx ? { ...x, usedAt: new Date().toISOString() } : x));
  return { ok: true as const, updated };
}

export function recoveryCodesSummary(stored: any): { total: number; remaining: number } {
  const arr: StoredRecoveryCode[] = Array.isArray(stored) ? stored : [];
  const total = arr.length;
  const remaining = arr.filter((x) => !x.usedAt).length;
  return { total, remaining };
}
