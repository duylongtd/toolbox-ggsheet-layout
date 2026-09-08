import { route } from "@/server/http/route";
import { ok } from "@/server/http/responses";
import { createTemplateSchema } from "@/lib/validation/schemas";
import { createTemplateService } from "@/server/services/templateService";
import type { TemplateDefinition } from "@/types";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export const GET = route({}, async ({ user, request, repositories, requestId }) => {
  const includeArchived = new URL(request.url).searchParams.get("includeArchived") === "true";
  const service = createTemplateService(repositories);
  return ok({ templates: await service.list(user.id, includeArchived) }, requestId);
});

export const POST = route(
  { bodySchema: createTemplateSchema },
  async ({ user, body, repositories, requestId }) => {
    const service = createTemplateService(repositories);
    const created = await service.create({
      ownerId: user.id,
      name: body.name,
      description: body.description,
      category: body.category,
      definition: body.definition as unknown as TemplateDefinition,
    });
    return ok(created, requestId, 201);
  },
);
