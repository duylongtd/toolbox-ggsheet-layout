import { forbidden, notFound } from "@/server/http/errors";
import { route } from "@/server/http/route";
import { ok } from "@/server/http/responses";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export const GET = route({}, async ({ user, params, repositories, requestId }) => {
  const dataset = await repositories.datasets.findById(String(params.id));
  if (!dataset) throw notFound("The prepared data is no longer available.");
  if (dataset.ownerId !== user.id) throw forbidden("You do not have access to this data.");
  return ok({ dataset }, requestId);
});
