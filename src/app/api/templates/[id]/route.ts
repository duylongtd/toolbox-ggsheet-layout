import { route } from "@/server/http/route";
import { ok } from "@/server/http/responses";
import { updateTemplateSchema } from "@/lib/validation/schemas";
import { createTemplateService } from "@/server/services/templateService";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export const GET = route({}, async ({ user, params, repositories, requestId }) => {
  const service = createTemplateService(repositories);
  return ok(await service.detail(String(params.id), user.id), requestId);
});

export const PATCH = route(
  { bodySchema: updateTemplateSchema },
  async ({ user, params, body, repositories, requestId }) => {
    const service = createTemplateService(repositories);
    return ok({ template: await service.update(String(params.id), user.id, body) }, requestId);
  },
);
