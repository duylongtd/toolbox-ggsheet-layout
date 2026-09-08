import "server-only";
import { serverEnv } from "@/server/infrastructure/config/env";
import { setSingleton, singleton } from "@/server/infrastructure/singleton";
import type { Repositories } from "@/server/repositories";
import { createMemoryRepositories } from "./memory/repositories";
import { createPostgresRepositories } from "./postgres/repositories";

const KEY = "repositories";

/**
 * Selects the persistence implementation.
 *
 * Adding another relational database means adding one folder next to
 * `postgres/` and one branch here. No service or route handler changes.
 *
 * The instance is held in the process wide registry because the bundler gives
 * each route its own module graph, and the in-memory driver must be shared.
 */
export function getRepositories(): Repositories {
  return singleton<Repositories>(KEY, () =>
    serverEnv.DATABASE_DRIVER === "postgres"
      ? createPostgresRepositories()
      : createMemoryRepositories(),
  );
}

/** Used by tests to inject an isolated implementation. */
export function setRepositories(repositories: Repositories | null): void {
  setSingleton(KEY, repositories);
}
