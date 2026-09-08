import { getAnalysisEngineClient } from "@/server/infrastructure/python/client";
import { forbidden, notFound } from "@/server/http/errors";
import { route } from "@/server/http/route";
import { ok } from "@/server/http/responses";
import { validateDatasetSchema } from "@/lib/validation/schemas";
import { createTemplateService } from "@/server/services/templateService";

export const runtime = "nodejs";

/**
 * Stateless schema comparison.
 *
 * Used by the wizard to preview how a dataset would match a template before the
 * user commits to it. It changes nothing.
 */
export const POST = route(
  { bodySchema: validateDatasetSchema },
  async ({ user, body, repositories, requestId }) => {
    const dataset = await repositories.datasets.findById(body.datasetId);
    if (!dataset) throw notFound("The prepared data is no longer available.");
    if (dataset.ownerId !== user.id) throw forbidden("You do not have access to this data.");

    const templates = createTemplateService(repositories);
    await templates.requireOwned(body.templateId, user.id);

    const version = body.templateVersionId
      ? await repositories.templateVersions.findById(body.templateVersionId)
      : await repositories.templateVersions.findLatest(body.templateId);
    if (!version) throw notFound("The requested template version does not exist.");

    const match = await getAnalysisEngineClient().validateSchema({
      datasetId: body.datasetId,
      definition: version.definition,
      confirmedMappings: Object.fromEntries(
        body.confirmedRenames.map((item) => [item.templateColumnKey, item.datasetColumn]),
      ),
      ignoreExtraColumns: body.ignoreExtraColumns,
    });

    return ok({ match, templateVersion: version }, requestId);
  },
);
