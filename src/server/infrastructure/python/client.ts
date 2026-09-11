import "server-only";
import { createHash, createHmac, randomUUID } from "node:crypto";
import { serverEnv } from "@/server/infrastructure/config/env";
import { logger } from "@/server/infrastructure/logging/logger";
import { singleton } from "@/server/infrastructure/singleton";
import { AppError } from "@/server/http/errors";
import type { MatchResult, ProgressEvent, TemplateDefinition } from "@/types";

/**
 * Client for the Python analysis service.
 *
 * Every request is signed with HMAC-SHA256 over
 * `timestamp.requestId.sha256(body)` so the analysis service can reject any
 * caller that does not hold the shared secret. The browser never talks to this
 * service directly.
 */

export interface IngestedDataset {
  datasetId: string;
  sourceType: "excel" | "csv" | "google_sheets";
  sourceName: string;
  rowCount: number;
  columnCount: number;
  columns: Array<Record<string, unknown>>;
  sampleRows: Array<Record<string, string>>;
  issues: Array<Record<string, unknown>>;
  metadata: Record<string, unknown>;
  expiresAt: string | null;
}

/** One worksheet, already prepared so a preview can be shown immediately. */
export interface IngestedSheet {
  sheetName: string;
  index: number;
  usable: boolean;
  reason: string | null;
  dataset: IngestedDataset | null;
}

export interface IngestedWorkbook {
  workbookId: string;
  sourceType: "excel" | "csv" | "google_sheets";
  sourceName: string;
  sheets: IngestedSheet[];
  activeSheetIndex: number;
}

export interface PlanProblem {
  code: string;
  message: string;
  details: Record<string, unknown>;
}

/** A requirement turned into a plan, already checked against the data. */
export interface PlanReview {
  status: "VALID" | "UNSUPPORTED" | "IRRELEVANT" | "INVALID";
  summary: string;
  problems: PlanProblem[];
  definition: TemplateDefinition | null;
}

export interface PipelineResult {
  engineVersion: string;
  reportVersion: string;
  match: MatchResult;
  analysis: Record<string, unknown>;
  charts: Array<Record<string, unknown>>;
  ai: Record<string, unknown>;
  pdfBase64: string | null;
  timings: Record<string, number>;
}

interface EngineError {
  code?: string;
  message?: string;
  details?: Record<string, unknown>;
  statusCode?: number;
}

export interface AnalysisEngineClient {
  health(): Promise<Record<string, unknown>>;
  ingestUpload(input: { fileName: string; content: Buffer }): Promise<IngestedWorkbook>;
  ingestGoogleSheet(input: {
    url: string;
    sheetName?: string | null;
    sourceName?: string | null;
  }): Promise<IngestedWorkbook>;
  buildDefinition(input: { datasetId: string; name?: string }): Promise<TemplateDefinition>;
  validateSchema(input: {
    datasetId: string;
    definition: TemplateDefinition;
    confirmedMappings?: Record<string, string>;
    ignoreExtraColumns?: boolean;
  }): Promise<MatchResult>;
  planAnalysis(input: {
    datasetId: string;
    prompt: string;
    definition: TemplateDefinition;
    language?: string;
  }): Promise<PlanReview>;
  /**
   * Runs the whole pipeline.
   *
   * The engine streams what it is doing as it goes; each report is handed to
   * `onProgress` the moment it arrives, before the result is known.
   */
  process(
    input: {
      datasetId: string;
      definition: TemplateDefinition;
      confirmedMappings?: Record<string, string>;
      ignoreExtraColumns?: boolean;
      context?: Record<string, unknown>;
      deleteDatasetAfter?: boolean;
    },
    onProgress?: (event: ProgressEvent) => void | Promise<void>,
  ): Promise<PipelineResult>;
}

export class HttpAnalysisEngineClient implements AnalysisEngineClient {
  constructor(
    private readonly baseUrl: string,
    private readonly secret: string,
    private readonly serviceId: string,
    private readonly timeoutMs: number,
  ) {}

  async health(): Promise<Record<string, unknown>> {
    return this.request<Record<string, unknown>>("GET", "/health");
  }

  async ingestUpload(input: { fileName: string; content: Buffer }): Promise<IngestedWorkbook> {
    return this.request<IngestedWorkbook>("POST", "/internal/ingest", {
      sourceType: "excel",
      fileName: input.fileName,
      contentBase64: input.content.toString("base64"),
    });
  }

  async ingestGoogleSheet(input: {
    url: string;
    sheetName?: string | null;
    sourceName?: string | null;
  }): Promise<IngestedWorkbook> {
    return this.request<IngestedWorkbook>("POST", "/internal/ingest/google-sheet", {
      url: input.url,
      sheetName: input.sheetName ?? null,
      sourceName: input.sourceName ?? null,
    });
  }

  async buildDefinition(input: { datasetId: string; name?: string }): Promise<TemplateDefinition> {
    return this.request<TemplateDefinition>("POST", "/internal/build-definition", {
      datasetId: input.datasetId,
      name: input.name ?? null,
    });
  }

  async validateSchema(input: {
    datasetId: string;
    definition: TemplateDefinition;
    confirmedMappings?: Record<string, string>;
    ignoreExtraColumns?: boolean;
  }): Promise<MatchResult> {
    return this.request<MatchResult>("POST", "/internal/validate-schema", {
      datasetId: input.datasetId,
      definition: input.definition,
      confirmedMappings: input.confirmedMappings ?? {},
      ignoreExtraColumns: input.ignoreExtraColumns ?? true,
    });
  }

  async planAnalysis(input: {
    datasetId: string;
    prompt: string;
    definition: TemplateDefinition;
    language?: string;
  }): Promise<PlanReview> {
    return this.request<PlanReview>("POST", "/internal/plan", {
      datasetId: input.datasetId,
      prompt: input.prompt,
      definition: input.definition,
      language: input.language ?? "vi",
    });
  }

  async process(
    input: {
      datasetId: string;
      definition: TemplateDefinition;
      confirmedMappings?: Record<string, string>;
      ignoreExtraColumns?: boolean;
      context?: Record<string, unknown>;
      deleteDatasetAfter?: boolean;
    },
    onProgress?: (event: ProgressEvent) => void | Promise<void>,
  ): Promise<PipelineResult> {
    const payload = {
      datasetId: input.datasetId,
      definition: input.definition,
      confirmedMappings: input.confirmedMappings ?? {},
      ignoreExtraColumns: input.ignoreExtraColumns ?? true,
      context: input.context ?? {},
      deleteDatasetAfter: input.deleteDatasetAfter ?? false,
    };

    let outcome: { ok: boolean; result?: PipelineResult; error?: EngineError } | null = null;

    await this.stream("/internal/process", payload, async (line) => {
      const event = line as { type?: string };
      if (event.type === "progress") {
        const report = line as unknown as ProgressEvent;
        if (onProgress) await onProgress(report);
        return;
      }
      if (event.type === "outcome") {
        outcome = line as typeof outcome;
      }
    });

    if (!outcome) {
      throw new AppError(
        "ANALYSIS_SERVICE_ERROR",
        "The analysis service ended without reporting a result.",
        502,
      );
    }
    const settled = outcome as { ok: boolean; result?: PipelineResult; error?: EngineError };
    if (settled.ok && settled.result) return settled.result;
    const error = settled.error ?? {};
    throw new AppError(
      error.code ?? "ANALYSIS_FAILED",
      error.message ?? "The analysis could not be completed.",
      (error.statusCode ?? 500) >= 500 ? 502 : (error.statusCode ?? 500),
      error.details ?? {},
    );
  }

  /** The signed headers for one body. Every internal call carries these. */
  private sign(body: string): Record<string, string> {
    const requestId = randomUUID();
    const timestamp = Math.floor(Date.now() / 1000).toString();
    const bodyHash = createHash("sha256").update(body).digest("hex");
    const signature = createHmac("sha256", this.secret)
      .update(`${timestamp}.${requestId}.${bodyHash}`)
      .digest("hex");
    return {
      "content-type": "application/json",
      "x-service-id": this.serviceId,
      "x-request-id": requestId,
      "x-timestamp": timestamp,
      "x-signature": signature,
    };
  }

  /**
   * Sends a request whose response is newline delimited JSON, calling
   * `onLine` for each object as it arrives.
   *
   * Lines are handed over as they complete, not when the response ends, which
   * is the whole point: the caller sees progress while the work is happening.
   */
  private async stream(
    path: string,
    payload: unknown,
    onLine: (line: Record<string, unknown>) => void | Promise<void>,
  ): Promise<void> {
    const body = JSON.stringify(payload);
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), this.timeoutMs);

    try {
      const response = await fetch(`${this.baseUrl}${path}`, {
        method: "POST",
        headers: this.sign(body),
        body,
        signal: controller.signal,
        cache: "no-store",
      });

      if (!response.ok || !response.body) {
        const text = await response.text().catch(() => "");
        let parsed: Record<string, unknown> = {};
        try {
          parsed = text ? (JSON.parse(text) as Record<string, unknown>) : {};
        } catch {
          /* not JSON; the status is what matters */
        }
        const error = (parsed.error ?? {}) as { code?: string; message?: string; details?: unknown };
        throw new AppError(
          error.code ?? "ANALYSIS_SERVICE_ERROR",
          error.message ?? "The analysis service could not complete the request.",
          response.status >= 500 ? 502 : response.status,
          (error.details as Record<string, unknown>) ?? {},
        );
      }

      const reader = response.body.getReader();
      const decoder = new TextDecoder();
      let buffered = "";
      for (;;) {
        const { value, done } = await reader.read();
        if (done) break;
        buffered += decoder.decode(value, { stream: true });
        let newline = buffered.indexOf("\n");
        while (newline >= 0) {
          const line = buffered.slice(0, newline).trim();
          buffered = buffered.slice(newline + 1);
          if (line) await onLine(JSON.parse(line) as Record<string, unknown>);
          newline = buffered.indexOf("\n");
        }
      }
      const tail = buffered.trim();
      if (tail) await onLine(JSON.parse(tail) as Record<string, unknown>);
    } catch (error) {
      throw this.translate(error, path);
    } finally {
      clearTimeout(timer);
    }
  }

  /** Signs, sends and translates one internal request. */
  private async request<T>(method: string, path: string, payload?: unknown): Promise<T> {
    const body = payload === undefined ? "" : JSON.stringify(payload);
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), this.timeoutMs);
    const startedAt = Date.now();

    try {
      const response = await fetch(`${this.baseUrl}${path}`, {
        method,
        headers: this.sign(body),
        body: body === "" ? undefined : body,
        signal: controller.signal,
        cache: "no-store",
      });

      const text = await response.text();
      const parsed = text ? (JSON.parse(text) as Record<string, unknown>) : {};

      if (!response.ok) {
        const error = (parsed.error ?? {}) as { code?: string; message?: string; details?: unknown };
        throw new AppError(
          error.code ?? "ANALYSIS_SERVICE_ERROR",
          error.message ?? "The analysis service could not complete the request.",
          response.status >= 500 ? 502 : response.status,
          (error.details as Record<string, unknown>) ?? {},
        );
      }

      logger.debug("Analysis service call completed", {
        path,
        durationMs: Date.now() - startedAt,
      });
      return parsed as T;
    } catch (error) {
      throw this.translate(error, path);
    } finally {
      clearTimeout(timer);
    }
  }

  /** Turns whatever fetch threw into the error the rest of the system expects. */
  private translate(error: unknown, path: string): AppError {
    if (AppError.is(error)) return error;
    if (error instanceof Error && error.name === "AbortError") {
      return new AppError(
        "ANALYSIS_SERVICE_TIMEOUT",
        "The analysis is taking longer than expected. Please try again.",
        504,
      );
    }
    logger.error("Analysis service call failed", {
      path,
      errorType: error instanceof Error ? error.name : "Unknown",
      message: error instanceof Error ? error.message : String(error),
    });
    return new AppError(
      "ANALYSIS_SERVICE_UNAVAILABLE",
      "The analysis service is not reachable right now.",
      503,
    );
  }
}

export function getAnalysisEngineClient(): AnalysisEngineClient {
  return singleton<AnalysisEngineClient>(
    "analysisEngineClient",
    () =>
      new HttpAnalysisEngineClient(
        serverEnv.PYTHON_SERVICE_URL.replace(/\/$/, ""),
        serverEnv.PYTHON_SERVICE_SECRET,
        serverEnv.INTERNAL_SERVICE_ID,
        serverEnv.PYTHON_SERVICE_TIMEOUT_MS,
      ),
  );
}
