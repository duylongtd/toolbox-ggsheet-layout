import "server-only";
import { readdir, readFile } from "node:fs/promises";
import path from "node:path";
import { getPool } from "./client";
import { logger } from "@/server/infrastructure/logging/logger";

/**
 * Applies the SQL files in database/migrations that have not been applied yet.
 *
 * The files ship with the application and run when it starts, so a deployment
 * that needs a new column cannot come up against a database that lacks it.
 * Before this, migrations were a manual step in a hosted console, and a
 * feature that added a column would have broken every run the moment the
 * new code deployed, until someone remembered.
 *
 * Every file is written to be safe to run twice (IF NOT EXISTS throughout),
 * which is what lets this runner adopt a database whose earlier files were
 * applied by hand: it re-runs them harmlessly and records them.
 *
 * Several replicas may start at once; an advisory lock makes one of them do
 * the work while the others wait and then find nothing left to do.
 */

const MIGRATIONS_DIR = path.join(process.cwd(), "database", "migrations");

// Any fixed number; it only has to be the same in every replica.
const LOCK_KEY = 7_420_113;

export async function applyMigrations(): Promise<{ applied: string[] }> {
  const files = (await readdir(MIGRATIONS_DIR))
    .filter((name) => name.endsWith(".sql"))
    .sort();

  const client = await getPool().connect();
  const applied: string[] = [];
  try {
    await client.query("SELECT pg_advisory_lock($1)", [LOCK_KEY]);
    await client.query(
      `CREATE TABLE IF NOT EXISTS schema_migrations (
         name       text PRIMARY KEY,
         applied_at timestamptz NOT NULL DEFAULT now()
       )`,
    );
    const done = new Set(
      (await client.query<{ name: string }>("SELECT name FROM schema_migrations")).rows.map(
        (row) => row.name,
      ),
    );

    for (const name of files) {
      if (done.has(name)) continue;
      const sql = await readFile(path.join(MIGRATIONS_DIR, name), "utf-8");
      await client.query("BEGIN");
      try {
        await client.query(sql);
        await client.query("INSERT INTO schema_migrations (name) VALUES ($1)", [name]);
        await client.query("COMMIT");
      } catch (error) {
        await client.query("ROLLBACK");
        logger.error("Migration failed", {
          migration: name,
          message: error instanceof Error ? error.message : String(error),
        });
        throw error;
      }
      applied.push(name);
      logger.info("Migration applied", { migration: name });
    }
  } finally {
    await client.query("SELECT pg_advisory_unlock($1)", [LOCK_KEY]).catch(() => undefined);
    client.release();
  }

  if (applied.length === 0) {
    logger.info("Database schema is current", { migrations: files.length });
  }
  return { applied };
}
