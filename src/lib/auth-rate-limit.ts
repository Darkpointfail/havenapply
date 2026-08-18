/**
 * In-memory sliding-window rate limiter for auth endpoints.
 * Suitable for single-instance / edge isolate; pair with WAF/CDN limits in production.
 */

export type RateLimitResult = {
  allowed: boolean;
  remaining: number;
  retryAfterSec: number;
};

type Bucket = { timestamps: number[] };

const buckets = new Map<string, Bucket>();

export function rateLimit(input: {
  key: string;
  limit: number;
  windowMs: number;
  now?: number;
}): RateLimitResult {
  const now = input.now ?? Date.now();
  const bucket = buckets.get(input.key) ?? { timestamps: [] };
  const cutoff = now - input.windowMs;
  bucket.timestamps = bucket.timestamps.filter((t) => t > cutoff);

  if (bucket.timestamps.length >= input.limit) {
    const oldest = bucket.timestamps[0] ?? now;
    const retryAfterSec = Math.max(1, Math.ceil((oldest + input.windowMs - now) / 1000));
    buckets.set(input.key, bucket);
    return { allowed: false, remaining: 0, retryAfterSec };
  }

  bucket.timestamps.push(now);
  buckets.set(input.key, bucket);
  return {
    allowed: true,
    remaining: Math.max(0, input.limit - bucket.timestamps.length),
    retryAfterSec: 0,
  };
}

/** Test helper */
export function resetRateLimits() {
  buckets.clear();
}

export function clientKeyFromRequest(request: Request, action: string): string {
  const forwarded = request.headers.get("x-forwarded-for");
  const ip = forwarded?.split(",")[0]?.trim() || request.headers.get("x-real-ip") || "unknown";
  return `${action}:${ip}`;
}
