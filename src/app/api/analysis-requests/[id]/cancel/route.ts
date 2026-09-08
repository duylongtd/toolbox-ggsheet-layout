import { route } from "@/server/http/route";
import { ok } from "@/server/http/responses";
import { createAnalysisService } from "@/server/services/analysisService";

export const runtime = "nodejs";

export const POST = route({}, async ({ user, params, repositories, requestId }) => {
  const service = createAnalysisService(repositories);
  return ok({ request: await service.cancel(String(params.id), user.id) }, requestId);
});
