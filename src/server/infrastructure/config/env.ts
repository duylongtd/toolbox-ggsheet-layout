import "server-only";
import { z } from "zod";

/**
 * Server side configuration.
 *
 * `server-only` makes importing this module from a client component a build
 * error, so a secret can never be bundled into browser JavaScript by accident.
 * Every limit is configurable; nothing that bounds resource usage is hard coded
 * at a call site.
 */

const booleanFromString = z
  .string()
  .optional()
  .transform((value) => value === "true" || value === "1");

const numberFromString = (fallback: number) =>
  z
    .string()
    .optional()
    .transform((value) => {
      const parsed = Number(value);
      return Number.isFinite(parsed) && parsed > 0 ? parsed : fallback;
    });

const schema = z.object({
  NODE_ENV: z.enum(["development", "test", "production"]).default("development"),
  APP_URL: z.string().default("http://localhost:3000"),

  DATABASE_DRIVER: z.enum(["postgres", "memory"]).default("memory"),
  DATABASE_URL: z.string().optional(),
  DATABASE_SSL: booleanFromString,
  DATABASE_POOL_MAX: numberFromString(10),

  AUTH_PROVIDER: z.enum(["supabase", "dev"]).default("dev"),
  AUTH_SESSION_SECRET: z.string().default("development-session-secret-change-me"),
  SUPABASE_URL: z.string().optional(),
  SUPABASE_ANON_KEY: z.string().optional(),
  SUPABASE_SERVICE_ROLE_KEY: z.string().optional(),

  STORAGE_DRIVER: z.enum(["supabase", "local"]).default("local"),
  STORAGE_BUCKET: z.string().default("datainsight"),
  STORAGE_LOCAL_DIR: z.string().default("./.runtime/storage"),

  PYTHON_SERVICE_URL: z.string().default("http://127.0.0.1:8000"),
  PYTHON_SERVICE_SECRET: z.string().default(""),
  INTERNAL_SERVICE_ID: z.string().default("datainsight-web"),
  PYTHON_SERVICE_TIMEOUT_MS: numberFromString(180_000),

  MAX_UPLOAD_SIZE_MB: numberFromString(20),
  MAX_REQUEST_BODY_MB: numberFromString(25),

  RATE_LIMIT_ENABLED: z
    .string()
    .optional()
    .transform((value) => value !== "false"),
  RATE_LIMIT_WINDOW_SECONDS: numberFromString(60),
  RATE_LIMIT_DEFAULT_MAX: numberFromString(120),
  RATE_LIMIT_UPLOAD_MAX: numberFromString(10),
  RATE_LIMIT_RUN_MAX: numberFromString(20),
  RATE_LIMIT_AUTH_MAX: numberFromString(10),
  RATE_LIMIT_DOWNLOAD_MAX: numberFromString(60),

  JOB_WORKER_ENABLED: z
    .string()
    .optional()
    .transform((value) => value !== "false"),
  JOB_POLL_INTERVAL_MS: numberFromString(1_000),

  REPORT_RETENTION_DAYS: numberFromString(365),
  LOG_LEVEL: z.enum(["debug", "info", "warn", "error"]).default("info"),
});

type RawEnv = z.infer<typeof schema>;

function load(): RawEnv {
  const parsed = schema.safeParse(process.env);
  if (!parsed.success) {
    throw new Error(
      `Invalid server configuration: ${parsed.error.issues
        .map((issue) => `${issue.path.join(".")} ${issue.message}`)
        .join("; ")}`,
    );
  }
  return parsed.data;
}

const raw = load();

export const serverEnv = {
  ...raw,
  isProduction: raw.NODE_ENV === "production",
  maxUploadSizeBytes: raw.MAX_UPLOAD_SIZE_MB * 1024 * 1024,
  maxRequestBodyBytes: raw.MAX_REQUEST_BODY_MB * 1024 * 1024,
} as const;

/**
 * Fails fast on configurations that are unsafe in production instead of
 * degrading silently at runtime.
 *
 * The check guards a running server, not the compiler. `next build` runs with
 * NODE_ENV=production but without deployment configuration, so the build phase
 * is skipped; the assertion runs again at boot from the instrumentation hook.
 */
export function assertProductionConfiguration(): void {
  if (!serverEnv.isProduction) return;
  if (process.env.NEXT_PHASE === "phase-production-build") return;

  const problems: string[] = [];
  if (serverEnv.AUTH_PROVIDER === "dev") {
    problems.push("AUTH_PROVIDER=dev is a development only provider");
  }
  if (serverEnv.DATABASE_DRIVER === "memory") {
    problems.push("DATABASE_DRIVER=memory does not persist data");
  }
  if (!serverEnv.PYTHON_SERVICE_SECRET) {
    problems.push("PYTHON_SERVICE_SECRET is required to sign internal requests");
  }
  if (serverEnv.AUTH_SESSION_SECRET.includes("change-me")) {
    problems.push("AUTH_SESSION_SECRET still uses the development default");
  }
  if (problems.length > 0) {
    throw new Error(`Unsafe production configuration: ${problems.join("; ")}`);
  }
}

assertProductionConfiguration();
