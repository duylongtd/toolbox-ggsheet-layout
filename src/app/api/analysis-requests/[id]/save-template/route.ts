import { route } from "@/server/http/route";
import { ok } from "@/server/http/responses";
import { saveTemplateSchema } from "@/lib/validation/schemas";
import { createAnalysisService } from "@/server/services/analysisService";

export const runtime = "nodejs";

/** Saves the configuration that produced this analysis as a reusable template. */
export const POST = route(
  { bodySchema: saveTemplateSchema },
  async ({ user, params, body, repositories, requestId }) => {
    const service = createAnalysisService(repositories);
    const result = await service.saveAsTemplate({
      requestId: String(params.id),
      ownerId: user.id,
      mode: body.mode,
      templateId: body.templateId ?? null,
      name: body.name,
      description: body.description,
      category: body.category,
      changeNote: body.changeNote,
      saveSampleData: body.saveSampleData,
    });
    return ok(result, requestId, 201);
  },
);
