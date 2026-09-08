import { route } from "@/server/http/route";
import { ok } from "@/server/http/responses";
import { createTemplateService } from "@/server/services/templateService";

export const runtime = "nodejs";

/** Records usage and returns the version that should be applied. */
export const POST = route({}, async ({ user, params, repositories, requestId }) => {
  const service = createTemplateService(repositories);
  return ok(await service.use(String(params.id), user.id), requestId);
});
