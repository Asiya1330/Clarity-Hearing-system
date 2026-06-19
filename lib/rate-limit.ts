/**
 * Lightweight in-memory fixed-window rate limiter.
 *
 * IMPORTANT: state lives in the module scope of a single server instance. On a
 * serverless / multi-instance deployment (e.g. Vercel) this is therefore
 * best-effort PER INSTANCE, not a globally consistent limit, and it resets on
 * cold starts. It meaningfully raises the cost of brute-force/DoS against a
 * single instance — enough to blunt token-guessing on the public intake route —
 * but for hard guarantees at scale, back this with a shared store such as
 * Upstash Redis or Vercel KV (swap the `buckets` map for the shared store and
 * keep the same interface).
 */

type Bucket = { count: number; resetAt: number };

const buckets = new Map<string, Bucket>();

export interface RateLimitResult {
  allowed: boolean;
  remaining: number;
  /** Seconds until the window resets; suitable for a Retry-After header. */
  retryAfterSeconds: number;
}

/**
 * Fixed-window counter. Returns whether this hit is allowed under `limit`
 * requests per `windowMs`.
 */
export function rateLimit(
  key: string,
  limit: number,
  windowMs: number,
): RateLimitResult {
  const now = Date.now();
  const existing = buckets.get(key);

  if (!existing || existing.resetAt <= now) {
    buckets.set(key, { count: 1, resetAt: now + windowMs });

    // Opportunistic cleanup so an attacker rotating keys can't grow the map
    // without bound.
    if (buckets.size > 10_000) {
      for (const [k, b] of buckets) {
        if (b.resetAt <= now) buckets.delete(k);
      }
    }

    return { allowed: true, remaining: limit - 1, retryAfterSeconds: 0 };
  }

  if (existing.count >= limit) {
    return {
      allowed: false,
      remaining: 0,
      retryAfterSeconds: Math.max(1, Math.ceil((existing.resetAt - now) / 1000)),
    };
  }

  existing.count += 1;
  return {
    allowed: true,
    remaining: limit - existing.count,
    retryAfterSeconds: 0,
  };
}

/** Best-effort client IP from common proxy headers. */
export function clientIp(request: Request): string {
  const xff = request.headers.get("x-forwarded-for");
  if (xff) {
    const first = xff.split(",")[0]?.trim();
    if (first) return first;
  }
  return request.headers.get("x-real-ip") ?? "unknown";
}
