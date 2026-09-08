import "server-only";

/**
 * Process wide singleton registry.
 *
 * The bundler compiles each route into its own module graph, and hot reloading
 * re-evaluates modules, so a plain module level variable is not one value per
 * process. Anything that must be shared across routes, such as the in-memory
 * repositories, the rate limiter buckets or the job worker timer, is registered
 * here instead.
 */

const REGISTRY = Symbol.for("datainsight.singletons");

type Registry = Map<string, unknown>;

function registry(): Registry {
  const host = globalThis as typeof globalThis & { [REGISTRY]?: Registry };
  if (!host[REGISTRY]) host[REGISTRY] = new Map();
  return host[REGISTRY];
}

/** Returns the existing instance, or creates and stores it on first use. */
export function singleton<T>(key: string, factory: () => T): T {
  const store = registry();
  if (!store.has(key)) store.set(key, factory());
  return store.get(key) as T;
}

/** Replaces or clears an entry. Used by the database factory and by tests. */
export function setSingleton(key: string, value: unknown): void {
  if (value === null || value === undefined) registry().delete(key);
  else registry().set(key, value);
}

/** Mutable shared state, for values that are updated rather than replaced. */
export function sharedState<T extends object>(key: string, initial: () => T): T {
  return singleton(key, initial);
}
