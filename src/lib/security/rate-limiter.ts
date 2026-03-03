/**
 * Sliding-window rate limiter — in-memory, Edge-compatible.
 *
 * ⚠️  Per-process only. On serverless runtimes each cold start gets its own
 *     store, so limits are approximate under high concurrency across many
 *     instances. For fully distributed limiting, swap the store for
 *     @upstash/ratelimit + Upstash Redis (drop-in replacement).
 */

interface Entry {
  count: number;
  resetAt: number; // epoch ms
}

const store = new Map<string, Entry>();

// Prune stale entries every 5 minutes so the Map doesn't grow unbounded.
if (typeof setInterval !== "undefined") {
  setInterval(
    () => {
      const now = Date.now();
      for (const [key, entry] of store) {
        if (now >= entry.resetAt) store.delete(key);
      }
    },
    5 * 60 * 1_000,
  );
}

export interface RateLimitResult {
  /** Whether the request is within the allowed limit. */
  allowed: boolean;
  /** Remaining requests in this window. */
  remaining: number;
  /** Seconds until the window resets (0 when allowed). */
  retryAfter: number;
}

/**
 * Check (and increment) the counter for `key`.
 *
 * @param key           Unique bucket key, e.g. `"ml:ip:1.2.3.4"`
 * @param limit         Max requests per window
 * @param windowSeconds Window length in seconds
 */
export function rateLimit(
  key: string,
  { limit, windowSeconds }: { limit: number; windowSeconds: number },
): RateLimitResult {
  const now = Date.now();
  const entry = store.get(key);

  if (!entry || now >= entry.resetAt) {
    store.set(key, { count: 1, resetAt: now + windowSeconds * 1_000 });
    return { allowed: true, remaining: limit - 1, retryAfter: 0 };
  }

  if (entry.count >= limit) {
    return {
      allowed: false,
      remaining: 0,
      retryAfter: Math.ceil((entry.resetAt - now) / 1_000),
    };
  }

  entry.count += 1;
  return { allowed: true, remaining: limit - entry.count, retryAfter: 0 };
}
