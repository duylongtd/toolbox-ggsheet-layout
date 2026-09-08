import { route } from "@/server/http/route";
import { ok } from "@/server/http/responses";
import { createTemplateVersionSchema } from "@/lib/validation/schemas";
import { createTemplateService } from "@/server/services/templateService";
import type { TemplateDefinition } from "@/types";

export const runtime = "nodejs";

/** Creates a new immutable version. Earlier versions stay exactly as they were. */
export const POST = route(
  { bodySchema: createTemplateVersionSchema },
  async ({ user, params, body, repositories, requestId }) => {
    const service = createTemplateService(repositories);
    const version = await service.createVersion({
      templateId: String(params.id),
      ownerId: user.id,
      definition: body.definition as unknown as TemplateDefinition,
      changeNote: body.changeNote,
    });
    return ok({ version }, requestId, 201);
  },
);
