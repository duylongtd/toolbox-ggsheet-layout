import "server-only";
import { serverEnv } from "@/server/infrastructure/config/env";
import { getAnalysisEngineClient, type PipelineResult } from "@/server/infrastructure/python/client";
import { getStorageProvider } from "@/server/infrastructure/storage";
import { logger } from "@/server/infrastructure/logging/logger";
import type { Repositories } from "@/server/repositories";
import { AppError, ErrorCodes } from "@/server/http/errors";
import type { AIStatus, Chart, ProgressEvent } from "@/types";
import { AuditActions, createAuditService } from "./auditService";
import { toConfirmedMappings } from "./analysisService";
import { forEngine } from "./refinement";

/**
 * Executes one analysis pipeline.
 *
 * The Python service runs ingestion through PDF as a single internal call so
 * the dataset is cleaned and profiled once. It returns per stage timings, which
 * are stored and shown to the user, rather than the web layer guessing at
 * progress it cannot observe.
 */
/** A report from this side of the call, shaped like the engine's. */
function own(stage: string, state: ProgressEvent["state"], message: string): ProgressEvent {
  return { stage, state, message, at: Date.now() };
}

export function createPipelineService(repositories: Repositories) {
  const engine = getAnalysisEngineClient();
  const storage = getStorageProvider();
  const audit = createAuditService(repositories);

  return {
    async execute(analysisRequestId: string): Promise<void> {
      const request = await repositories.analysisRequests.findById(analysisRequestId);
      if (!request) throw new AppError(ErrorCodes.NOT_FOUND, "Analysis request not found.", 404);
      if (request.status === "CANCELLED") {
        logger.info("Pipeline skipped for a cancelled request", { analysisRequestId });
        return;
      }
      if (!request.datasetId || !request.definition) {
        throw new AppError(ErrorCodes.INVALID_STATE, "This analysis has no data to process.", 409);
      }

      const template = request.templateId
        ? await repositories.templates.findById(request.templateId)
        : null;
      const templateVersion = request.templateVersionId
        ? await repositories.templateVersions.findById(request.templateVersionId)
        : null;

      // A run starts with an empty log; what the previous run reported is
      // history the page no longer needs once a new one is under way.
      await repositories.analysisRequests.update(analysisRequestId, { progress: [] });
      const note = async (event: ProgressEvent) => {
        await repositories.analysisRequests.appendProgress(analysisRequestId, event);
        logger.info("Pipeline progress", {
          analysisRequestId,
          stage: event.stage,
          state: event.state,
          message: event.message,
          done: event.done,
          total: event.total,
        });
      };
      await note(own("engine", "started", "Gửi yêu cầu tới bộ phân tích"));

      const result: PipelineResult = await engine.process({
        datasetId: request.datasetId,
        // Charts the user switched off stay in the stored definition so the
        // choice is reversible, but they are not sent to be drawn.
        definition: forEngine(request.definition),
        confirmedMappings: toConfirmedMappings(request.resolution),
        ignoreExtraColumns: request.resolution?.extraColumnPolicy !== "ADD_TO_TEMPLATE",
        context: {
          sourceName: request.sourceName,
          sourceType: request.sourceType,
          templateName: template?.name ?? null,
          templateVersion: templateVersion?.version ?? null,
        },
        // The dataset stays in the temporary store until its TTL so the user can
        // rerun after adjusting the configuration. The uploaded bytes were
        // already deleted by the analysis service right after parsing.
        deleteDatasetAfter: false,
      }, note);

      await note(own("engine", "done", "Bộ phân tích đã trả kết quả"));
      await note(own("save", "started", "Lưu kết quả, biểu đồ và tệp báo cáo"));

      const analysis = result.analysis as Record<string, unknown>;

      await repositories.analysisResults.upsert({
        analysisRequestId,
        metrics: (analysis.metrics as Array<Record<string, unknown>>) ?? [],
        statistics: (analysis.statistics as Array<Record<string, unknown>>) ?? [],
        groupSummary: (analysis.groupSummary as Array<Record<string, unknown>>) ?? [],
        rankings: (analysis.rankings as Array<Record<string, unknown>>) ?? [],
        outliers: (analysis.outliers as Array<Record<string, unknown>>) ?? [],
        trends: (analysis.trends as Array<Record<string, unknown>>) ?? [],
        warnings: (analysis.warnings as Array<Record<string, unknown>>) ?? [],
        timings: result.timings,
      });

      await storeCharts(analysisRequestId, result.charts);
      await storeAiAnalysis(analysisRequestId, result.ai);
      const report = await storeReport(analysisRequestId, result, request.ownerId, {
        title: request.title,
        templateId: request.templateId,
        templateVersionId: request.templateVersionId,
      });

      await note(own("save", "done", "Đã lưu"));
      await repositories.analysisRequests.update(analysisRequestId, {
        status: "COMPLETED",
        engineVersion: result.engineVersion,
        matchResult: result.match,
        completedAt: new Date().toISOString(),
        error: null,
      });

      await audit.record({
        actorId: request.ownerId,
        action: AuditActions.ANALYSIS_COMPLETED,
        entityType: "analysis_request",
        entityId: analysisRequestId,
        metadata: {
          chartCount: result.charts.length,
          aiStatus: (result.ai as { status?: string }).status ?? "SKIPPED",
          reportId: report?.id ?? null,
          totalMs: result.timings.totalMs ?? null,
        },
      });
    },
  };

  /** Uploads each chart image and replaces the stored chart set. */
  async function storeCharts(
    analysisRequestId: string,
    charts: Array<Record<string, unknown>>,
  ): Promise<void> {
    const records: Array<Omit<Chart, "id" | "createdAt" | "analysisRequestId">> = [];

    for (const chart of charts) {
      if (!chart.rendered || typeof chart.image !== "string") continue;
      const chartKey = String(chart.id);
      const storageKey = `charts/${analysisRequestId}/${chartKey}.png`;
      await storage.put(storageKey, Buffer.from(chart.image, "base64"), "image/png");
      records.push({
        chartKey,
        type: String(chart.type ?? "bar"),
        title: String(chart.title ?? ""),
        config: (chart.config as Record<string, unknown>) ?? {},
        storageKey,
        contentType: "image/png",
      });
    }

    await repositories.charts.replaceForRequest(analysisRequestId, records);
  }

  /** Records the AI outcome, including a skipped or failed one. */
  async function storeAiAnalysis(
    analysisRequestId: string,
    ai: Record<string, unknown>,
  ): Promise<void> {
    await repositories.aiAnalyses.upsert({
      analysisRequestId,
      provider: String(ai.provider ?? "none"),
      model: String(ai.model ?? ""),
      status: (String(ai.status ?? "SKIPPED") as AIStatus) ?? "SKIPPED",
      sections: (ai.sections as Record<string, unknown>) ?? {},
      unverifiedNumbers: (ai.unverifiedNumbers as Array<Record<string, unknown>>) ?? [],
      error: (ai.error as { code: string; message: string } | null) ?? null,
    });
  }

  /** Uploads the PDF and records its metadata. */
  async function storeReport(
    analysisRequestId: string,
    result: PipelineResult,
    ownerId: string,
    meta: { title: string; templateId: string | null; templateVersionId: string | null },
  ) {
    if (!result.pdfBase64) return null;

    const pdf = Buffer.from(result.pdfBase64, "base64");
    const storageKey = `reports/${analysisRequestId}/${Date.now()}.pdf`;
    await storage.put(storageKey, pdf, "application/pdf");

    const retentionExpiresAt = new Date(
      Date.now() + serverEnv.REPORT_RETENTION_DAYS * 24 * 60 * 60 * 1000,
    ).toISOString();

    const report = await repositories.reports.create({
      analysisRequestId,
      ownerId,
      title: meta.title,
      storageKey,
      contentType: "application/pdf",
      sizeBytes: pdf.byteLength,
      templateId: meta.templateId,
      templateVersionId: meta.templateVersionId,
      reportVersion: result.reportVersion,
      retentionExpiresAt,
    });

    await audit.record({
      actorId: ownerId,
      action: AuditActions.REPORT_CREATED,
      entityType: "report",
      entityId: report.id,
      metadata: { analysisRequestId, sizeBytes: pdf.byteLength },
    });
    return report;
  }
}

export type PipelineService = ReturnType<typeof createPipelineService>;
