import "server-only";
import { singleton } from "@/server/infrastructure/singleton";
import { InMemoryRateLimiter } from "./memory";
import type { RateLimiter } from "./types";

/**
 * Process wide limiter.
 *
 * Counters live in the shared registry so every route sees the same buckets.
 * A Redis backed implementation would additionally share them across instances.
 */
export function getRateLimiter(): RateLimiter {
  return singleton<RateLimiter>("rateLimiter", () => new InMemoryRateLimiter());
}

export type { RateLimitDecision, RateLimiter } from "./types";
