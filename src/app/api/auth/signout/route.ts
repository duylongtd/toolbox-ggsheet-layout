import { getAuthProvider } from "@/server/infrastructure/auth";
import { getRepositories } from "@/server/infrastructure/database";
import { route } from "@/server/http/route";
import { ok } from "@/server/http/responses";
import { AuditActions, createAuditService } from "@/server/services/auditService";

export const runtime = "nodejs";

export const POST = route({ auth: false, rateLimit: "auth" }, async ({ requestId }) => {
  const provider = getAuthProvider();
  const current = await provider.getCurrentUser();
  await provider.signOut();

  if (current) {
    await createAuditService(getRepositories()).record({
      actorId: current.id,
      action: AuditActions.USER_LOGOUT,
      entityType: "user",
      entityId: current.id,
    });
  }
  return ok({ signedOut: true }, requestId);
});
