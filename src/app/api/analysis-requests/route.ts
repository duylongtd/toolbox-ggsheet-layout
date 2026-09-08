import { NextResponse } from "next/server";
import { serverEnv } from "@/server/infrastructure/config/env";
import { AppError, ErrorCodes } from "@/server/http/errors";
import { route } from "@/server/http/route";
import { ok } from "@/server/http/responses";
import { sheetSourceSchema } from "@/lib/validation/schemas";
import { createAnalysisService } from "@/server/services/analysisService";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export const GET = route({}, async ({ user, repositories, requestId }) => {
  const service = createAnalysisService(repositories);
  return ok({ requests: await service.list(user.id) }, requestId);
});

/**
 * Creates an analysis request.
 *
 * Accepts either a multipart upload or a JSON body describing a Google Sheet.
 * Both paths run validation, ingestion and profiling before returning, because
 * the user must see the dataset preview before anything is computed.
 */
export const POST = route(
  { rateLimit: "upload", rawBody: true },
  async ({ request, user, repositories, requestId }): Promise<NextResponse> => {
    const service = createAnalysisService(repositories);
    const contentType = request.headers.get("content-type") ?? "";

    if (contentType.includes("multipart/form-data")) {
      const form = await request.formData();
      const file = form.get("file");
      if (!(file instanceof File)) {
        throw new AppError(ErrorCodes.VALIDATION_FAILED, "Select a file to upload.", 400);
      }
      if (file.size > serverEnv.maxUploadSizeBytes) {
        throw new AppError(
          ErrorCodes.PAYLOAD_TOO_LARGE,
          `The file is larger than the allowed limit of ${serverEnv.MAX_UPLOAD_SIZE_MB} MB.`,
          413,
        );
      }

      const templateId = asOptionalString(form.get("templateId"));
      const result = await service.createFromUpload({
        ownerId: user.id,
        file,
        title: asOptionalString(form.get("title")) ?? undefined,
        templateId,
        sheetName: asOptionalString(form.get("sheetName")),
      });
      return ok(result, requestId, 201);
    }

    if (contentType.includes("application/json")) {
      const raw = await request.json();
      const input = sheetSourceSchema.parse(raw);
      const result = await service.createFromSheet({
        ownerId: user.id,
        url: input.url,
        sheetName: input.sheetName ?? null,
        title: input.title,
        templateId: input.templateId ?? null,
      });
      return ok(result, requestId, 201);
    }

    throw new AppError(
      ErrorCodes.UNSUPPORTED_MEDIA_TYPE,
      "Upload a file, or send a Google Sheets address as JSON.",
      415,
    );
  },
);

function asOptionalString(value: FormDataEntryValue | null): string | null {
  if (typeof value !== "string") return null;
  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : null;
}
