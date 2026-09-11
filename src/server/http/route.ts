import "server-only";
import { createHash, randomUUID } from "node:crypto";
import { NextResponse, type NextRequest } from "next/server";
import { ZodError, type ZodType, type ZodTypeDef } from "zod";
import { serverEnv } from "@/server/infrastructure/config/env";
import { getAuthProvider } from "@/server/infrastructure/auth";
import { getRepositories } from "@/server/infrastructure/database";
import { logger } from "@/server/infrastructure/logging/logger";
import { getRateLimiter } from "@/server/infrastructure/ratelimit";
import type { Repositories } from "@/server/repositories";
import type { User } from "@/types";
import { AppError, ErrorCodes, unauthorized } from "./errors";

/**
 * Shared request pipeline for every route handler.
 *
 * Order: correlation id, body size guard, authentication, rate limiting,
 * schema validation, handler, structured error translation, access log.
 * A handler therefore only contains business intent.
 */

export type RateLimitBucket = "default" | "auth" | "upload" | "run" | "download";

export interface RouteContext<TBody = unknown> {
  request: NextRequest;
  requestId: string;
  user: User;
  body: TBody;
  params: Record<string, string>;
  repositories: Repositories;
  clientHash: string;
}

interface RouteOptions<TBody> {
  /** Defaults to true. Only the session and sign in routes opt out. */
  auth?: boolean;
  /** Typed by the schema's output, so parsed defaults are not optional. */
  bodySchema?: ZodType<TBody, ZodTypeDef, unknown>;
  rateLimit?: RateLimitBucket;
  /** Skips JSON parsing for multipart uploads, which the handler reads itself. */
  rawBody?: boolean;
}

type Handler<TBody> = (context: RouteContext<TBody>) => Promise<NextResponse>;

const RATE_LIMITS: Record<RateLimitBucket, () => number> = {
  default: () => serverEnv.RATE_LIMIT_DEFAULT_MAX,
  auth: () => serverEnv.RATE_LIMIT_AUTH_MAX,
  upload: () => serverEnv.RATE_LIMIT_UPLOAD_MAX,
  run: () => serverEnv.RATE_LIMIT_RUN_MAX,
  download: () => serverEnv.RATE_LIMIT_DOWNLOAD_MAX,
};

export function route<TBody = unknown>(
  options: RouteOptions<TBody>,
  handler: Handler<TBody>,
): (
  request: NextRequest,
  context: RouteSegmentContext,
) => Promise<NextResponse> {
  return async (request, context) => {
    const requestId = request.headers.get("x-request-id") ?? randomUUID();
    const startedAt = Date.now();
    const clientHash = hashClient(request);

    try {
      assertBodySize(request);

      const repositories = getRepositories();
      const user = options.auth === false ? anonymousUser() : await resolveUser(repositories);

      await enforceRateLimit(options.rateLimit ?? "default", user.id, clientHash, requestId);

      const body = options.rawBody
        ? (undefined as TBody)
        : await parseBody(request, options.bodySchema);

      const params = normalizeParams(await context?.params);

      const response = await handler({
        request,
        requestId,
        user,
        body,
        params,
        repositories,
        clientHash,
      });

      response.headers.set("X-Request-Id", requestId);
      logger.info("request", {
        requestId,
        userId: user.id,
        method: request.method,
        path: new URL(request.url).pathname,
        status: response.status,
        durationMs: Date.now() - startedAt,
      });
      return response;
    } catch (error) {
      return toErrorResponse(error, requestId, request, startedAt);
    }
  };
}

/** The shape Next.js passes as the second argument to a route handler. */
interface RouteSegmentContext {
  params: Promise<Record<string, string | string[] | undefined>>;
}

/**
 * Route parameters are always single values in this application. A repeated
 * segment collapses to its first value rather than reaching a service as an
 * array.
 */
function normalizeParams(
  raw: Record<string, string | string[] | undefined> | undefined,
): Record<string, string> {
  const params: Record<string, string> = {};
  for (const [key, value] of Object.entries(raw ?? {})) {
    if (Array.isArray(value)) {
      if (value[0] !== undefined) params[key] = value[0];
    } else if (value !== undefined) {
      params[key] = value;
    }
  }
  return params;
}

function anonymousUser(): User {
  return {
    id: "anonymous",
    email: "",
    displayName: null,
    avatarUrl: null,
    role: "user",
    createdAt: new Date(0).toISOString(),
    lastLoginAt: null,
  };
}

/** Resolves the session and mirrors the identity into the local user table. */
async function resolveUser(repositories: Repositories): Promise<User> {
  const authenticated = await getAuthProvider().getCurrentUser();
  if (!authenticated) throw unauthorized();
  return repositories.users.upsertFromAuth({
    id: authenticated.id,
    email: authenticated.email,
    displayName: authenticated.displayName,
    avatarUrl: authenticated.avatarUrl,
  });
}

function assertBodySize(request: NextRequest): void {
  const declared = Number(request.headers.get("content-length") ?? 0);
  if (declared > serverEnv.maxRequestBodyBytes) {
    throw new AppError(
      ErrorCodes.PAYLOAD_TOO_LARGE,
      `The request is larger than the allowed limit of ${serverEnv.MAX_REQUEST_BODY_MB} MB.`,
      413,
      { limitBytes: serverEnv.maxRequestBodyBytes },
    );
  }
}

async function parseBody<TBody>(
  request: NextRequest,
  schema?: ZodType<TBody, ZodTypeDef, unknown>,
): Promise<TBody> {
  if (!schema) return undefined as TBody;
  if (request.method === "GET" || request.method === "DELETE") {
    return schema.parse({});
  }

  let raw: unknown = {};
  try {
    const text = await request.text();
    raw = text ? JSON.parse(text) : {};
  } catch {
    throw new AppError(ErrorCodes.VALIDATION_FAILED, "The request body is not valid JSON.", 400);
  }
  return schema.parse(raw);
}

async function enforceRateLimit(
  bucket: RateLimitBucket,
  userId: string,
  clientHash: string,
  requestId: string,
): Promise<void> {
  if (!serverEnv.RATE_LIMIT_ENABLED) return;
  const identity = userId === "anonymous" ? `ip:${clientHash}` : `user:${userId}`;
  const decision = await getRateLimiter().check(
    `${bucket}:${identity}`,
    RATE_LIMITS[bucket](),
    serverEnv.RATE_LIMIT_WINDOW_SECONDS,
  );
  if (!decision.allowed) {
    logger.warn("Rate limit exceeded", { requestId, bucket, identity });
    throw new AppError(
      ErrorCodes.RATE_LIMITED,
      "Too many requests. Please wait a moment and try again.",
      429,
      { retryAfterSeconds: Math.max(1, Math.ceil((decision.resetAt - Date.now()) / 1000)) },
    );
  }
}

/** The address is only ever stored hashed, never in clear text. */
function hashClient(request: NextRequest): string {
  const forwarded = request.headers.get("x-forwarded-for") ?? "";
  const address = forwarded.split(",")[0]?.trim() || "unknown";
  return createHash("sha256")
    .update(`${address}|${serverEnv.AUTH_SESSION_SECRET}`)
    .digest("hex")
    .slice(0, 32);
}

function toErrorResponse(
  error: unknown,
  requestId: string,
  request: NextRequest,
  startedAt: number,
): NextResponse {
  const path = new URL(request.url).pathname;

  if (error instanceof ZodError) {
    const details = {
      issues: error.issues.map((issue) => ({
        field: issue.path.join("."),
        message: issue.message,
      })),
    };
    logger.warn("Request validation failed", { requestId, path, ...details });
    return respond(
      new AppError(ErrorCodes.VALIDATION_FAILED, "Some fields are not valid.", 400, details),
      requestId,
    );
  }

  if (AppError.is(error)) {
    logger.warn("Handled error", {
      requestId,
      path,
      code: error.code,
      status: error.status,
      durationMs: Date.now() - startedAt,
    });
    return respond(error, requestId);
  }

  // Unexpected failures never expose their message or stack to the client.
  logger.error("Unhandled error", {
    requestId,
    path,
    errorType: error instanceof Error ? error.name : "Unknown",
    durationMs: Date.now() - startedAt,
  });
  if (!serverEnv.isProduction && error instanceof Error) {
    console.error(error);
  }
  return respond(
    new AppError(
      ErrorCodes.INTERNAL_ERROR,
      "Something went wrong while processing the request.",
      500,
    ),
    requestId,
  );
}

function respond(error: AppError, requestId: string): NextResponse {
  const response = NextResponse.json(error.toJSON(requestId), { status: error.status });
  response.headers.set("X-Request-Id", requestId);
  response.headers.set("Cache-Control", "no-store");
  return response;
}
