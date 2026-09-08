import { NextResponse } from "next/server";

/** Success envelope. Every payload is wrapped so clients parse one shape. */
export function ok<T>(data: T, requestId: string, status = 200): NextResponse {
  const response = NextResponse.json({ data }, { status });
  response.headers.set("X-Request-Id", requestId);
  response.headers.set("Cache-Control", "no-store");
  return response;
}

export function accepted<T>(data: T, requestId: string): NextResponse {
  return ok(data, requestId, 202);
}

export function noContent(requestId: string): NextResponse {
  const response = new NextResponse(null, { status: 204 });
  response.headers.set("X-Request-Id", requestId);
  return response;
}
