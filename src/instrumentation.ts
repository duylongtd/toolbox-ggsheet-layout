/**
 * Process startup hook.
 *
 * Next.js compiles this file for every runtime. The Node.js only imports sit
 * inside a positive `NEXT_RUNTIME` comparison: the bundler substitutes that
 * value per runtime and eliminates the whole branch, which keeps native Node
 * modules such as the PostgreSQL driver and `node:crypto` out of the edge
 * module graph. An early return with the negated comparison is not eliminated.
 */
export async function register(): Promise<void> {
  if (process.env.NEXT_RUNTIME === "nodejs") {
    // Refuse to serve traffic with a configuration that is unsafe in production.
    const { assertProductionConfiguration } = await import(
      "@/server/infrastructure/config/env"
    );
    assertProductionConfiguration();

    // The schema is brought up to date before any request or job can touch
    // it. A failure here stops the boot, which is the right outcome: serving
    // traffic against a database missing a column fails every request with
    // a worse message.
    const { serverEnv } = await import("@/server/infrastructure/config/env");
    if (serverEnv.DATABASE_DRIVER === "postgres") {
      const { applyMigrations } = await import(
        "@/server/infrastructure/database/postgres/migrate"
      );
      await applyMigrations();
    }

    const { startJobWorker } = await import("@/server/services/jobService");
    startJobWorker();
  }
}
