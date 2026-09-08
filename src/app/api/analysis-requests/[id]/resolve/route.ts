import { route } from "@/server/http/route";
import { ok } from "@/server/http/responses";
import { resolutionSchema } from "@/lib/validation/schemas";
import { createAnalysisService } from "@/server/services/analysisService";

export const runtime = "nodejs";

/**
 * Records the user's decisions about renames and extra columns.
 * Nothing is changed on the template unless the user chose to add columns.
 */
export const POST = route(
  { bodySchema: resolutionSchema },
  async ({ user, params, body, repositories, requestId }) => {
    const service = createAnalysisService(repositories);
    const result = await service.resolve({
      requestId: String(params.id),
      ownerId: user.id,
      resolution: body,
    });
    return ok(result, requestId);
  },
);
