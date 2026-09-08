import type { RateLimitDecision, RateLimiter } from "./types";

interface Bucket {
  count: number;
  resetAt: number;
}

/** Fixed window counter held in process memory. */
export class InMemoryRateLimiter implements RateLimiter {
  private readonly buckets = new Map<string, Bucket>();
  private lastSweep = Date.now();

  async check(key: string, limit: number, windowSeconds: number): Promise<RateLimitDecision> {
    const now = Date.now();
    this.sweep(now);

    const existing = this.buckets.get(key);
    if (!existing || existing.resetAt <= now) {
      const bucket: Bucket = { count: 1, resetAt: now + windowSeconds * 1000 };
      this.buckets.set(key, bucket);
      return { allowed: true, limit, remaining: limit - 1, resetAt: bucket.resetAt };
    }

    existing.count += 1;
    return {
      allowed: existing.count <= limit,
      limit,
      remaining: Math.max(0, limit - existing.count),
      resetAt: existing.resetAt,
    };
  }

  /** Drops expired buckets so the map cannot grow without bound. */
  private sweep(now: number): void {
    if (now - this.lastSweep < 30_000) return;
    this.lastSweep = now;
    for (const [key, bucket] of this.buckets) {
      if (bucket.resetAt <= now) this.buckets.delete(key);
    }
  }
}
