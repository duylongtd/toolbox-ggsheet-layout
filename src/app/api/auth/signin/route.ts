import { z } from "zod";
import { getAuthProvider } from "@/server/infrastructure/auth";
import { route } from "@/server/http/route";
import { ok } from "@/server/http/responses";

export const runtime = "nodejs";

const schema = z.object({
  redirectTo: z.string().max(500).default("/"),
});

/**
 * Starts the Google login flow.
 *
 * Only login scopes are requested. The application never asks for Google Sheets
 * or Drive permissions.
 */
export const POST = route(
  { auth: false, rateLimit: "auth", bodySchema: schema },
  async ({ body, requestId }) => {
    // Only same-origin paths are accepted, so the flow cannot be redirected away.
    const redirectTo = body.redirectTo.startsWith("/") ? body.redirectTo : "/";
    const target = await getAuthProvider().getSignInTarget(redirectTo);
    return ok(target, requestId);
  },
);
