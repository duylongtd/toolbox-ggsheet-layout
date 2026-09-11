import "server-only";
import { serverEnv } from "@/server/infrastructure/config/env";
import {
  getAnalysisEngineClient,
  type IngestedDataset,
  type IngestedWorkbook,
} from "@/server/infrastructure/python/client";
import type { Repositories } from "@/server/repositories";
import { AppError, ErrorCodes, forbidden, notFound, validationFailed } from "@/server/http/errors";
import { checkUpload } from "@/lib/security/upload";
import { checkSheetUrl } from "@/lib/security/sheetUrl";
import type {
  AnalysisRequest,
  Dataset,
  MatchResult,
  Resolution,
  SheetOption,
  TemplateDefinition,
} from "@/types";
import { RUNNABLE_STATUSES, TERMINAL_STATUSES } from "@/types";
import { AuditActions, createAuditService } from "./auditService";
import { createTemplateService } from "./templateService";

/**
 * Analysis request workflow.
 *
 * The service owns the state machine and the persistence. All computation is
 * delegated to the Python analysis engine.
 */
export function createAnalysisService(repositories: Repositories) {
  const engine = getAnalysisEngineClient();
  const audit = createAuditService(repositories);
  const templates = createTemplateService(repositories);

  async function requireOwned(requestId: string, ownerId: string): Promise<AnalysisRequest> {
    const request = await repositories.analysisRequests.findById(requestId);
    if (!request) throw notFound("This analysis no longer exists.");
    if (request.ownerId !== ownerId) throw forbidden("You do not have access to this analysis.");
    return request;
  }

  /** Persists the dataset descriptor returned by the analysis engine. */
  async function persistDataset(ownerId: string, descriptor: IngestedDataset): Promise<Dataset> {
    return repositories.datasets.create({
      id: descriptor.datasetId,
      ownerId,
      sourceType: descriptor.sourceType,
      sourceName: descriptor.sourceName,
      rowCount: descriptor.rowCount,
      columnCount: descriptor.columnCount,
      columns: descriptor.columns as unknown as Dataset["columns"],
      sampleRows: descriptor.sampleRows,
      issues: descriptor.issues as unknown as Dataset["issues"],
      metadata: descriptor.metadata,
      expiresAt: descriptor.expiresAt,
    });
  }

  /**
   * Stores every worksheet the upload produced and returns the choice.
   *
   * All sheets are persisted, so switching between them later is a lookup
   * rather than another upload.
   */
  async function persistWorkbook(
    ownerId: string,
    workbook: IngestedWorkbook,
  ): Promise<{ sheets: SheetOption[]; active: Dataset }> {
    const sheets: SheetOption[] = [];
    let active: Dataset | null = null;

    for (const sheet of workbook.sheets) {
      if (!sheet.usable || !sheet.dataset) {
        sheets.push({
          sheetName: sheet.sheetName,
          index: sheet.index,
          usable: false,
          reason: sheet.reason,
          datasetId: null,
          rowCount: 0,
          columnCount: 0,
        });
        continue;
      }
      const stored = await persistDataset(ownerId, sheet.dataset);
      sheets.push({
        sheetName: sheet.sheetName,
        index: sheet.index,
        usable: true,
        reason: null,
        datasetId: stored.id,
        rowCount: stored.rowCount,
        columnCount: stored.columnCount,
      });
      if (sheet.index === workbook.activeSheetIndex) active = stored;
    }

    if (!active) {
      const firstUsable = sheets.find((sheet) => sheet.usable && sheet.datasetId);
      if (!firstUsable?.datasetId) {
        throw new AppError(
          ErrorCodes.VALIDATION_FAILED,
          "Không có trang tính nào trong tệp này chứa bảng dữ liệu phân tích được.",
          400,
        );
      }
      active = (await repositories.datasets.findById(firstUsable.datasetId))!;
    }

    return { sheets, active };
  }

  /**
   * Attaches a template version, or derives a configuration from the dataset
   * profile when the user starts without one.
   */
  async function attachConfiguration(input: {
    request: AnalysisRequest;
    ownerId: string;
    datasetId: string;
    templateId: string | null;
    title: string;
  }): Promise<AnalysisRequest> {
    if (input.templateId) {
      const { template, version } = await templates.use(input.templateId, input.ownerId);
      const match = await engine.validateSchema({
        datasetId: input.datasetId,
        definition: version.definition,
      });
      return repositories.analysisRequests.update(input.request.id, {
        templateId: template.id,
        templateVersionId: version.id,
        definition: version.definition,
        matchResult: match,
        status: "WAITING_FOR_CONFIRMATION",
      });
    }

    const definition = await engine.buildDefinition({
      datasetId: input.datasetId,
      name: input.title,
    });
    return repositories.analysisRequests.update(input.request.id, {
      definition,
      status: "WAITING_FOR_CONFIRMATION",
    });
  }

  /** Marks the request failed with a structured, user facing error. */
  async function fail(requestId: string, error: AppError): Promise<never> {
    await repositories.analysisRequests.update(requestId, {
      status: "FAILED",
      error: { code: error.code, message: error.message, details: error.details },
    });
    throw error;
  }

  return {
    requireOwned,

    list(ownerId: string, limit = 50) {
      return repositories.analysisRequests.listByOwner(ownerId, limit);
    },

    /** Full view used by the analysis detail page. */
    async detail(requestId: string, ownerId: string) {
      const request = await requireOwned(requestId, ownerId);
      const [dataset, result, charts, ai, report, job, template, templateVersion] =
        await Promise.all([
          request.datasetId ? repositories.datasets.findById(request.datasetId) : null,
          repositories.analysisResults.findByRequestId(requestId),
          repositories.charts.listByRequest(requestId),
          repositories.aiAnalyses.findByRequestId(requestId),
          repositories.reports.findByRequestId(requestId),
          repositories.jobs.findLatestByRequest(requestId),
          request.templateId ? repositories.templates.findById(request.templateId) : null,
          request.templateVersionId
            ? repositories.templateVersions.findById(request.templateVersionId)
            : null,
        ]);
      return { request, dataset, result, charts, ai, report, job, template, templateVersion };
    },

    /** Creates a request from an uploaded file: validate, ingest, profile. */
    async createFromUpload(input: {
      ownerId: string;
      file: File;
      title?: string;
      templateId?: string | null;
      sheetName?: string | null;
    }) {
      const check = checkUpload(input.file.name, input.file.size, serverEnv.maxUploadSizeBytes);
      if (!check.valid) {
        throw new AppError(ErrorCodes.VALIDATION_FAILED, check.message!, 400, {
          fileName: input.file.name,
        });
      }

      const title = (input.title ?? input.file.name).slice(0, 200);
      const request = await repositories.analysisRequests.create({
        ownerId: input.ownerId,
        title,
        sourceType: input.file.name.toLowerCase().endsWith(".csv") ? "csv" : "excel",
        sourceName: input.file.name,
        templateId: input.templateId ?? null,
        templateVersionId: null,
        status: "VALIDATING",
      });

      try {
        await repositories.analysisRequests.update(request.id, { status: "INGESTING" });
        const content = Buffer.from(await input.file.arrayBuffer());
        const workbook = await engine.ingestUpload({ fileName: input.file.name, content });

        const { sheets, active: dataset } = await persistWorkbook(input.ownerId, workbook);
        await repositories.analysisRequests.update(request.id, {
          datasetId: dataset.id,
          sheets,
          sourceType: dataset.sourceType,
          sourceName: dataset.sourceName,
          status: "SCHEMA_ANALYSIS",
        });

        const updated = await attachConfiguration({
          request,
          ownerId: input.ownerId,
          datasetId: dataset.id,
          templateId: input.templateId ?? null,
          title,
        });

        await audit.record({
          actorId: input.ownerId,
          action: AuditActions.ANALYSIS_CREATED,
          entityType: "analysis_request",
          entityId: request.id,
          metadata: {
            sourceType: dataset.sourceType,
            rowCount: dataset.rowCount,
            columnCount: dataset.columnCount,
            templateId: input.templateId ?? null,
          },
        });

        return { request: updated, dataset };
      } catch (error) {
        if (AppError.is(error)) await fail(request.id, error);
        throw error;
      }
    },

    /** Creates a request from a Google Sheets address. */
    async createFromSheet(input: {
      ownerId: string;
      url: string;
      sheetName?: string | null;
      title?: string;
      templateId?: string | null;
    }) {
      const check = checkSheetUrl(input.url);
      if (!check.valid) {
        throw new AppError(ErrorCodes.VALIDATION_FAILED, check.message!, 400);
      }

      const title = (input.title ?? "Báo cáo từ Google Sheets").slice(0, 200);
      const request = await repositories.analysisRequests.create({
        ownerId: input.ownerId,
        title,
        sourceType: "google_sheets",
        sourceName: title,
        templateId: input.templateId ?? null,
        templateVersionId: null,
        status: "INGESTING",
      });

      try {
        const workbook = await engine.ingestGoogleSheet({
          url: input.url,
          sheetName: input.sheetName ?? null,
          sourceName: title,
        });
        const { sheets, active: dataset } = await persistWorkbook(input.ownerId, workbook);

        await repositories.analysisRequests.update(request.id, {
          datasetId: dataset.id,
          sheets,
          sourceName: dataset.sourceName,
          status: "SCHEMA_ANALYSIS",
        });

        const updated = await attachConfiguration({
          request,
          ownerId: input.ownerId,
          datasetId: dataset.id,
          templateId: input.templateId ?? null,
          title,
        });

        await audit.record({
          actorId: input.ownerId,
          action: AuditActions.ANALYSIS_CREATED,
          entityType: "analysis_request",
          entityId: request.id,
          metadata: { sourceType: "google_sheets", rowCount: dataset.rowCount },
        });

        return { request: updated, dataset };
      } catch (error) {
        if (AppError.is(error)) await fail(request.id, error);
        throw error;
      }
    },

    /** Compares the ingested dataset against a template version. */
    async validateAgainstTemplate(input: {
      requestId: string;
      ownerId: string;
      templateId: string;
      templateVersionId?: string | null;
    }): Promise<{ request: AnalysisRequest; match: MatchResult }> {
      const request = await requireOwned(input.requestId, input.ownerId);
      if (!request.datasetId) {
        throw new AppError(ErrorCodes.INVALID_STATE, "This analysis has no data yet.", 409);
      }

      const { template, version } = await templates.use(
        input.templateId,
        input.ownerId,
        input.templateVersionId,
      );
      const match = await engine.validateSchema({
        datasetId: request.datasetId,
        definition: version.definition,
        confirmedMappings: toConfirmedMappings(request.resolution),
        ignoreExtraColumns: request.resolution?.extraColumnPolicy !== "ADD_TO_TEMPLATE",
      });

      const updated = await repositories.analysisRequests.update(request.id, {
        templateId: template.id,
        templateVersionId: version.id,
        definition: version.definition,
        matchResult: match,
        status: "WAITING_FOR_CONFIRMATION",
      });

      await audit.record({
        actorId: input.ownerId,
        action: AuditActions.ANALYSIS_VALIDATED,
        entityType: "analysis_request",
        entityId: request.id,
        metadata: { templateId: template.id, status: match.status, score: match.score },
      });

      return { request: updated, match };
    },

    /**
     * Records the user's decisions and re-runs the deterministic match.
     *
     * `ADD_TO_TEMPLATE` creates a new template version. The existing version is
     * never modified, so other analyses keep their configuration.
     */
    async resolve(input: {
      requestId: string;
      ownerId: string;
      resolution: Resolution;
    }): Promise<{ request: AnalysisRequest; match: MatchResult | null }> {
      const request = await requireOwned(input.requestId, input.ownerId);
      if (!request.datasetId || !request.definition) {
        throw new AppError(ErrorCodes.INVALID_STATE, "This analysis has no data yet.", 409);
      }

      let definition = request.definition;
      let templateVersionId = request.templateVersionId;

      if (
        input.resolution.extraColumnPolicy === "ADD_TO_TEMPLATE" &&
        request.templateId &&
        request.matchResult?.extraColumns.length
      ) {
        const dataset = await repositories.datasets.findById(request.datasetId);
        definition = extendDefinitionWithExtraColumns(
          definition,
          request.matchResult,
          dataset?.columns ?? [],
        );
        const version = await templates.createVersion({
          templateId: request.templateId,
          ownerId: input.ownerId,
          definition,
          changeNote: `Added ${request.matchResult.extraColumns.length} column(s) found in ${request.sourceName}`,
        });
        templateVersionId = version.id;
      }

      const match = await engine.validateSchema({
        datasetId: request.datasetId,
        definition,
        confirmedMappings: toConfirmedMappings(input.resolution),
        ignoreExtraColumns: input.resolution.extraColumnPolicy !== "ADD_TO_TEMPLATE",
      });

      const updated = await repositories.analysisRequests.update(request.id, {
        definition,
        templateVersionId,
        resolution: input.resolution,
        matchResult: match,
        status: "WAITING_FOR_CONFIRMATION",
      });

      await audit.record({
        actorId: input.ownerId,
        action: AuditActions.ANALYSIS_RESOLVED,
        entityType: "analysis_request",
        entityId: request.id,
        metadata: {
          confirmedRenameCount: input.resolution.confirmedRenames.length,
          extraColumnPolicy: input.resolution.extraColumnPolicy,
          status: match.status,
        },
      });

      return { request: updated, match };
    },

    /**
     * Switches the analysis to another worksheet of the same upload.
     *
     * The sheet was already prepared during ingestion, so this only re-points
     * the request and rebuilds the suggested configuration for the new data.
     */
    async selectSheet(input: { requestId: string; ownerId: string; sheetIndex: number }) {
      const request = await requireOwned(input.requestId, input.ownerId);
      const sheet = request.sheets.find((item) => item.index === input.sheetIndex);

      if (!sheet || !sheet.usable || !sheet.datasetId) {
        throw validationFailed("Trang tính này không có bảng dữ liệu để phân tích.");
      }

      const dataset = await repositories.datasets.findById(sheet.datasetId);
      if (!dataset) {
        throw notFound("Dữ liệu của trang tính này không còn khả dụng. Vui lòng tải tệp lại.");
      }

      const definition = request.templateId
        ? request.definition
        : await engine.buildDefinition({ datasetId: dataset.id, name: request.title });

      const matchResult = request.templateId && definition
        ? await engine.validateSchema({ datasetId: dataset.id, definition })
        : null;

      const updated = await repositories.analysisRequests.update(request.id, {
        datasetId: dataset.id,
        definition,
        matchResult,
        status: "WAITING_FOR_CONFIRMATION",
        error: null,
      });
      return { request: updated, dataset };
    },

    /** Queues the pipeline. The browser never waits for the computation. */
    async run(requestId: string, ownerId: string) {
      const request = await requireOwned(requestId, ownerId);

      if (!request.datasetId || !request.definition) {
        throw new AppError(
          ErrorCodes.INVALID_STATE,
          "This analysis has no data to process.",
          409,
        );
      }
      if (!RUNNABLE_STATUSES.includes(request.status)) {
        throw new AppError(
          ErrorCodes.INVALID_STATE,
          "This analysis cannot be started from its current state.",
          409,
          { status: request.status },
        );
      }
      if (request.matchResult?.blocking) {
        throw validationFailed(
          blockingMessage(request.matchResult),
          request.matchResult as unknown as Record<string, unknown>,
        );
      }

      const job = await repositories.jobs.create({
        analysisRequestId: request.id,
        type: "ANALYSIS_PIPELINE",
        payload: { requestedBy: ownerId },
      });
      await repositories.analysisRequests.update(request.id, {
        status: "PROCESSING",
        error: null,
      });

      await audit.record({
        actorId: ownerId,
        action: AuditActions.ANALYSIS_STARTED,
        entityType: "analysis_request",
        entityId: request.id,
        metadata: { jobId: job.id, templateId: request.templateId },
      });

      return job;
    },

    async cancel(requestId: string, ownerId: string) {
      const request = await requireOwned(requestId, ownerId);
      if (TERMINAL_STATUSES.includes(request.status)) {
        throw new AppError(
          ErrorCodes.INVALID_STATE,
          "This analysis has already finished.",
          409,
          { status: request.status },
        );
      }
      await repositories.jobs.cancelForRequest(requestId);
      const updated = await repositories.analysisRequests.update(requestId, {
        status: "CANCELLED",
      });
      await audit.record({
        actorId: ownerId,
        action: AuditActions.ANALYSIS_CANCELLED,
        entityType: "analysis_request",
        entityId: requestId,
      });
      return updated;
    },

    /**
     * Saves the configuration that actually ran as a reusable template.
     *
     * Raw data is never stored. A sanitized sample is stored only when the user
     * explicitly asks for it.
     */
    async saveAsTemplate(input: {
      requestId: string;
      ownerId: string;
      mode: "NEW_TEMPLATE" | "NEW_VERSION";
      templateId?: string | null;
      name: string;
      description: string;
      category: string;
      changeNote: string;
      saveSampleData: boolean;
    }) {
      const request = await requireOwned(input.requestId, input.ownerId);
      if (!request.definition) {
        throw new AppError(
          ErrorCodes.INVALID_STATE,
          "This analysis has no configuration to save.",
          409,
        );
      }

      let sampleDataset: Array<Record<string, string>> | null = null;
      if (input.saveSampleData && request.datasetId) {
        const dataset = await repositories.datasets.findById(request.datasetId);
        sampleDataset = dataset?.sampleRows.slice(0, 10) ?? null;
      }

      if (input.mode === "NEW_VERSION") {
        if (!input.templateId) {
          throw validationFailed("Choose the template to add this version to.");
        }
        const version = await templates.createVersion({
          templateId: input.templateId,
          ownerId: input.ownerId,
          definition: { ...request.definition, name: input.name },
          changeNote: input.changeNote || `Version created from ${request.sourceName}`,
          sampleDataset,
        });
        const template = await repositories.templates.findById(input.templateId);
        await repositories.analysisRequests.update(request.id, {
          templateId: input.templateId,
          templateVersionId: version.id,
        });
        return { template: template!, version };
      }

      const created = await templates.create({
        ownerId: input.ownerId,
        name: input.name,
        description: input.description,
        category: input.category,
        definition: request.definition,
        sampleDataset,
      });
      await repositories.analysisRequests.update(request.id, {
        templateId: created.template.id,
        templateVersionId: created.version.id,
      });
      return created;
    },
  };
}

/** Maps the user's confirmations into the shape the matcher expects. */
export function toConfirmedMappings(resolution: Resolution | null): Record<string, string> {
  if (!resolution) return {};
  return Object.fromEntries(
    resolution.confirmedRenames.map((item) => [item.templateColumnKey, item.datasetColumn]),
  );
}

/** Explains, in one sentence, why a match is blocking. */
export function blockingMessage(match: MatchResult): string {
  switch (match.status) {
    case "MISSING_REQUIRED_COLUMNS":
      return `Required column(s) missing from the file: ${match.missingRequiredColumns.join(", ")}.`;
    case "AMBIGUOUS_MAPPING":
      return "Some columns need to be confirmed before the analysis can run.";
    case "TYPE_MISMATCH":
      return "One or more columns do not contain the expected kind of value.";
    case "EXTRA_COLUMNS":
      return "Decide what to do with the columns that are not part of this template.";
    case "INVALID_DATASET":
      return "The file could not be matched against this template.";
    default:
      return "This dataset cannot be analysed with this template yet.";
  }
}

/**
 * Produces a new definition that includes the extra columns.
 * The input definition object is not modified.
 */
export function extendDefinitionWithExtraColumns(
  definition: TemplateDefinition,
  match: MatchResult,
  datasetColumns: Dataset["columns"],
): TemplateDefinition {
  const byKey = new Map(datasetColumns.map((column) => [column.key, column]));
  const additions = match.extraColumns.map((extra) => {
    const column = byKey.get(extra.datasetColumn);
    return {
      key: extra.datasetColumn,
      expectedName: extra.datasetColumnName,
      aliases: [],
      type: column?.inferredType ?? extra.inferredType,
      // Added columns start optional so an older file still matches.
      required: false,
      description: "Added from a later dataset.",
    };
  });

  return {
    ...definition,
    columns: [...definition.columns, ...additions],
  };
}

export type AnalysisService = ReturnType<typeof createAnalysisService>;
