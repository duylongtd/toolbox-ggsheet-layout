/**
 * Rate limiting abstraction.
 *
 * The in-memory implementation is correct for a single process. Replacing it
 * with a Redis backed limiter for a multi instance deployment means adding one
 * implementation of this interface.
 */

export interface RateLimitDecision {
  allowed: boolean;
  limit: number;
  remaining: number;
  resetAt: number;
}

export interface RateLimiter {
  check(key: string, limit: number, windowSeconds: number): Promise<RateLimitDecision>;
}
