import { route } from "@/server/http/route";
import { ok } from "@/server/http/responses";
import { validateRequestSchema } from "@/lib/validation/schemas";
import { createAnalysisService } from "@/server/services/analysisService";

export const runtime = "nodejs";

/** Compares the ingested dataset with a template version. */
export const POST = route(
  { bodySchema: validateRequestSchema },
  async ({ user, params, body, repositories, requestId }) => {
    const service = createAnalysisService(repositories);
    const result = await service.validateAgainstTemplate({
      requestId: String(params.id),
      ownerId: user.id,
      templateId: body.templateId,
      templateVersionId: body.templateVersionId ?? null,
    });
    return ok(result, requestId);
  },
);
