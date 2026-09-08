"use client";

/**
 * Browser API client.
 *
 * Every response is unwrapped from the shared envelope, and every failure is
 * turned into an `ApiError` carrying the server's structured code, so the UI can
 * show an actionable message instead of a raw status.
 */

export class ApiError extends Error {
  constructor(
    public readonly code: string,
    message: string,
    public readonly status: number,
    public readonly details: Record<string, unknown> = {},
    public readonly requestId?: string,
  ) {
    super(message);
    this.name = "ApiError";
  }
}

interface Envelope<T> {
  data?: T;
  error?: {
    code: string;
    message: string;
    details?: Record<string, unknown>;
    requestId?: string;
  };
}

async function parse<T>(response: Response): Promise<T> {
  const text = await response.text();
  const body: Envelope<T> = text ? JSON.parse(text) : {};

  if (!response.ok || body.error) {
    const error = body.error;
    throw new ApiError(
      error?.code ?? "REQUEST_FAILED",
      error?.message ?? "The request could not be completed.",
      response.status,
      error?.details ?? {},
      error?.requestId,
    );
  }
  return body.data as T;
}

export async function apiGet<T>(path: string, signal?: AbortSignal): Promise<T> {
  const response = await fetch(path, { method: "GET", cache: "no-store", signal });
  return parse<T>(response);
}

export async function apiPost<T>(path: string, body?: unknown, signal?: AbortSignal): Promise<T> {
  const response = await fetch(path, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: body === undefined ? undefined : JSON.stringify(body),
    signal,
  });
  return parse<T>(response);
}

export async function apiPatch<T>(path: string, body: unknown): Promise<T> {
  const response = await fetch(path, {
    method: "PATCH",
    headers: { "content-type": "application/json" },
    body: JSON.stringify(body),
  });
  return parse<T>(response);
}

export async function apiUpload<T>(path: string, form: FormData): Promise<T> {
  // The browser sets the multipart boundary; setting content-type would break it.
  const response = await fetch(path, { method: "POST", body: form });
  return parse<T>(response);
}
