import { getAuthProvider } from "@/server/infrastructure/auth";
import { getRepositories } from "@/server/infrastructure/database";
import { route } from "@/server/http/route";
import { ok } from "@/server/http/responses";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/** Returns the current user, or null when there is no session. */
export const GET = route({ auth: false, rateLimit: "auth" }, async ({ requestId }) => {
  const authenticated = await getAuthProvider().getCurrentUser();
  if (!authenticated) return ok({ user: null }, requestId);

  const user = await getRepositories().users.upsertFromAuth(authenticated);
  return ok({ user }, requestId);
});
