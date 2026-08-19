/**
 * In-memory sliding-window rate limiter.
 * One instance per server process. Good enough for stdio + a single HTTP node.
 * If you need multi-node rate limiting, swap the store for Redis or Supabase.
 */
export class RateLimiter {
  private hits: number[] = [];
  constructor(private readonly perMinute: number) {}

  check(): { allowed: boolean; retryAfterMs: number } {
    const now = Date.now();
    const windowStart = now - 60_000;
    this.hits = this.hits.filter((t) => t > windowStart);
    if (this.hits.length >= this.perMinute) {
      const retryAfterMs = Math.max(0, this.hits[0]! + 60_000 - now);
      return { allowed: false, retryAfterMs };
    }
    this.hits.push(now);
    return { allowed: true, retryAfterMs: 0 };
  }
}
