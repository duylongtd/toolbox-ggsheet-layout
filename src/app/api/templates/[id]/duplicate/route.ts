import { route } from "@/server/http/route";
import { ok } from "@/server/http/responses";
import { duplicateTemplateSchema } from "@/lib/validation/schemas";
import { createTemplateService } from "@/server/services/templateService";

export const runtime = "nodejs";

export const POST = route(
  { bodySchema: duplicateTemplateSchema },
  async ({ user, params, body, repositories, requestId }) => {
    const service = createTemplateService(repositories);
    return ok(await service.duplicate(String(params.id), user.id, body.name), requestId, 201);
  },
);
