import "server-only";
import { Pool, type PoolClient, type QueryResultRow } from "pg";
import { serverEnv } from "@/server/infrastructure/config/env";

/**
 * PostgreSQL connection pool.
 *
 * Plain SQL is used deliberately so the schema stays portable across
 * Supabase, self hosted PostgreSQL and any other server that speaks the wire
 * protocol. This module is the only place that knows about `pg`.
 */

let pool: Pool | null = null;

export function getPool(): Pool {
  if (pool) return pool;
  if (!serverEnv.DATABASE_URL) {
    throw new Error("DATABASE_DRIVER=postgres requires DATABASE_URL");
  }
  pool = new Pool({
    connectionString: serverEnv.DATABASE_URL,
    max: serverEnv.DATABASE_POOL_MAX,
    // Managed providers terminate plaintext connections; the certificate chain
    // is not verifiable from inside a container without extra configuration.
    ssl: serverEnv.DATABASE_SSL ? { rejectUnauthorized: false } : undefined,
  });
  return pool;
}

/** Runs a parameterised query. Values are never interpolated into SQL text. */
export async function query<T extends QueryResultRow>(
  text: string,
  values: unknown[] = [],
): Promise<T[]> {
  const result = await getPool().query<T>(text, values);
  return result.rows;
}

export async function queryOne<T extends QueryResultRow>(
  text: string,
  values: unknown[] = [],
): Promise<T | null> {
  const rows = await query<T>(text, values);
  return rows[0] ?? null;
}

/** Runs a unit of work inside a transaction, rolling back on any error. */
export async function withTransaction<T>(
  handler: (client: PoolClient) => Promise<T>,
): Promise<T> {
  const client = await getPool().connect();
  try {
    await client.query("BEGIN");
    const result = await handler(client);
    await client.query("COMMIT");
    return result;
  } catch (error) {
    await client.query("ROLLBACK");
    throw error;
  } finally {
    client.release();
  }
}

export async function closePool(): Promise<void> {
  if (pool) {
    await pool.end();
    pool = null;
  }
}
