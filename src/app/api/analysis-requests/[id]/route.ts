import { route } from "@/server/http/route";
import { ok } from "@/server/http/responses";
import { createAnalysisService } from "@/server/services/analysisService";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export const GET = route({}, async ({ user, params, repositories, requestId }) => {
  const service = createAnalysisService(repositories);
  return ok(await service.detail(String(params.id), user.id), requestId);
});
