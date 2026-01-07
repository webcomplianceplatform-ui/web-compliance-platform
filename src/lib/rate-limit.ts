type Bucket = {
  resetAt: number;
  remaining: number;
};

// Best-effort, in-memory rate limiter.
// In serverless this is per-instance, but it's still useful for basic abuse prevention.
const buckets = new Map<string, Bucket>();

export type RateLimitOk = { ok: true };
export type RateLimitBlocked = { ok: false; retryAfterSec: number };
export type RateLimitResult = RateLimitOk | RateLimitBlocked;

export function rateLimit(opts: { key: string; limit: number; windowMs: number }): RateLimitResult {
  const now = Date.now();
  const b = buckets.get(opts.key);

  if (!b || now >= b.resetAt) {
    buckets.set(opts.key, { resetAt: now + opts.windowMs, remaining: opts.limit - 1 });
    return { ok: true };
  }

  if (b.remaining <= 0) {
    const retryAfterSec = Math.max(1, Math.ceil((b.resetAt - now) / 1000));
    return { ok: false, retryAfterSec };
  }

  b.remaining -= 1;
  buckets.set(opts.key, b);
  return { ok: true };
}
