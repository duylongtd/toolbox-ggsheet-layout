import { NextResponse, type NextRequest } from "next/server";
import { serverEnv } from "@/server/infrastructure/config/env";
import { getAuthProvider } from "@/server/infrastructure/auth";
import { getRepositories } from "@/server/infrastructure/database";
import { logger } from "@/server/infrastructure/logging/logger";
import { AuditActions, createAuditService } from "@/server/services/auditService";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * OAuth callback.
 *
 * The provider code is exchanged for a session here, the local user record is
 * created or refreshed, and the browser is sent to a same-origin path only.
 */
export async function GET(request: NextRequest): Promise<NextResponse> {
  const url = new URL(request.url);
  const code = url.searchParams.get("code");
  const requested = url.searchParams.get("next") ?? "/";
  const next = requested.startsWith("/") ? requested : "/";

  if (!code) {
    return NextResponse.redirect(new URL("/login?error=missing_code", serverEnv.APP_URL));
  }

  try {
    const authenticated = await getAuthProvider().completeSignIn(code);
    const repositories = getRepositories();
    const user = await repositories.users.upsertFromAuth(authenticated);
    await repositories.users.recordLogin(user.id);
    await createAuditService(repositories).record({
      actorId: user.id,
      action: AuditActions.USER_LOGIN,
      entityType: "user",
      entityId: user.id,
    });
    return NextResponse.redirect(new URL(next, serverEnv.APP_URL));
  } catch (error) {
    logger.warn("Sign in callback failed", {
      errorType: error instanceof Error ? error.name : "Unknown",
    });
    return NextResponse.redirect(new URL("/login?error=sign_in_failed", serverEnv.APP_URL));
  }
}
