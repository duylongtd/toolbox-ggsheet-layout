/**
 * Structured errors.
 *
 * Every failure surfaced to a client carries a stable code, a sentence a
 * non technical user can act on, and optional machine readable details.
 * Stack traces never leave the server.
 */

export class AppError extends Error {
  constructor(
    public readonly code: string,
    message: string,
    public readonly status: number = 400,
    public readonly details: Record<string, unknown> = {},
    options?: { cause?: unknown },
  ) {
    // The cause is for logs only. It never reaches a response body.
    super(message, options);
    this.name = "AppError";
  }

  /**
   * Whether a value is one of these, by shape rather than by identity.
   *
   * The job worker is started from the instrumentation hook, which imports
   * its modules through a separate graph, so it holds a second copy of this
   * class. An error thrown by the analysis client and caught by the worker
   * failed instanceof against that copy and was recorded as a generic
   * failure with no code and no details. On the first deployment that turned
   * a processing timeout, complete with its limit, into "could not be
   * completed", and the cause had to be reconstructed from timestamps.
   */
  static is(value: unknown): value is AppError {
    if (value instanceof AppError) return true;
    if (typeof value !== "object" || value === null) return false;
    const candidate = value as Partial<AppError> & { name?: unknown };
    return (
      candidate.name === "AppError" &&
      typeof candidate.code === "string" &&
      typeof candidate.status === "number" &&
      typeof candidate.message === "string"
    );
  }

  toJSON(requestId: string) {
    return {
      error: {
        code: this.code,
        message: this.message,
        details: this.details,
        requestId,
      },
    };
  }
}

export const ErrorCodes = {
  UNAUTHORIZED: "UNAUTHORIZED",
  FORBIDDEN: "FORBIDDEN",
  NOT_FOUND: "NOT_FOUND",
  VALIDATION_FAILED: "VALIDATION_FAILED",
  RATE_LIMITED: "RATE_LIMITED",
  PAYLOAD_TOO_LARGE: "PAYLOAD_TOO_LARGE",
  UNSUPPORTED_MEDIA_TYPE: "UNSUPPORTED_MEDIA_TYPE",
  CONFLICT: "CONFLICT",
  INTERNAL_ERROR: "INTERNAL_ERROR",
  TEMPLATE_IN_USE: "TEMPLATE_IN_USE",
  INVALID_STATE: "INVALID_STATE",
  FEATURE_NOT_CONFIGURED: "FEATURE_NOT_CONFIGURED",
} as const;

export const unauthorized = (message = "Please sign in to continue.") =>
  new AppError(ErrorCodes.UNAUTHORIZED, message, 401);

export const forbidden = (message = "You do not have access to this item.") =>
  new AppError(ErrorCodes.FORBIDDEN, message, 403);

export const notFound = (message = "The requested item was not found.") =>
  new AppError(ErrorCodes.NOT_FOUND, message, 404);

export const invalidState = (message: string, details: Record<string, unknown> = {}) =>
  new AppError(ErrorCodes.INVALID_STATE, message, 409, details);

export const validationFailed = (message: string, details: Record<string, unknown> = {}) =>
  new AppError(ErrorCodes.VALIDATION_FAILED, message, 400, details);
