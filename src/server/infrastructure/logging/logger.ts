import "server-only";
import { serverEnv } from "@/server/infrastructure/config/env";

/**
 * Structured logging. One JSON object per line, with a correlation id on every
 * entry. Credentials and dataset values are never written.
 */

type Level = "debug" | "info" | "warn" | "error";

const LEVEL_ORDER: Record<Level, number> = { debug: 10, info: 20, warn: 30, error: 40 };

const REDACTED_KEYS = new Set([
  "authorization",
  "cookie",
  "password",
  "token",
  "secret",
  "apikey",
  "api_key",
  "x-signature",
  "contentBase64",
  "sampleRows",
]);

export interface LogContext {
  requestId?: string;
  userId?: string;
  analysisRequestId?: string;
  [key: string]: unknown;
}

function redact(value: unknown): unknown {
  if (Array.isArray(value)) return value.map(redact);
  if (value && typeof value === "object") {
    return Object.fromEntries(
      Object.entries(value as Record<string, unknown>).map(([key, item]) =>
        REDACTED_KEYS.has(key.toLowerCase()) ? [key, "[redacted]"] : [key, redact(item)],
      ),
    );
  }
  return value;
}

function write(level: Level, message: string, context: LogContext = {}): void {
  if (LEVEL_ORDER[level] < LEVEL_ORDER[serverEnv.LOG_LEVEL]) return;
  const entry = {
    timestamp: new Date().toISOString(),
    level: level.toUpperCase(),
    message,
    ...(redact(context) as Record<string, unknown>),
  };
  const line = JSON.stringify(entry);
  if (level === "error") console.error(line);
  else if (level === "warn") console.warn(line);
  else console.log(line);
}

export const logger = {
  debug: (message: string, context?: LogContext) => write("debug", message, context),
  info: (message: string, context?: LogContext) => write("info", message, context),
  warn: (message: string, context?: LogContext) => write("warn", message, context),
  error: (message: string, context?: LogContext) => write("error", message, context),
};
