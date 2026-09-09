import type {
  AIAnalysis,
  AnalysisRequest,
  AnalysisResult,
  AnalysisStatus,
  Chart,
} from "@/types";

export interface CreateAnalysisRequestInput {
  ownerId: string;
  title: string;
  sourceType: AnalysisRequest["sourceType"];
  sourceName: string;
  templateId: string | null;
  templateVersionId: string | null;
  status: AnalysisStatus;
}

export type AnalysisRequestChanges = Partial<
  Pick<
    AnalysisRequest,
    | "status"
    | "title"
    | "sourceType"
    | "sourceName"
    | "templateId"
    | "templateVersionId"
    | "datasetId"
    | "sheets"
    | "definition"
    | "pendingPlan"
    | "matchResult"
    | "resolution"
    | "error"
    | "engineVersion"
    | "completedAt"
  >
>;

export interface AnalysisRequestRepository {
  create(input: CreateAnalysisRequestInput): Promise<AnalysisRequest>;
  findById(id: string): Promise<AnalysisRequest | null>;
  listByOwner(ownerId: string, limit?: number): Promise<AnalysisRequest[]>;
  update(id: string, changes: AnalysisRequestChanges): Promise<AnalysisRequest>;
  countByTemplateVersion(templateVersionId: string): Promise<number>;
}

export interface AnalysisResultRepository {
  upsert(input: Omit<AnalysisResult, "id" | "createdAt">): Promise<AnalysisResult>;
  findByRequestId(analysisRequestId: string): Promise<AnalysisResult | null>;
}

export interface ChartRepository {
  /** Replaces the whole chart set for a request so a rerun cannot leave orphans. */
  replaceForRequest(
    analysisRequestId: string,
    charts: Array<Omit<Chart, "id" | "createdAt" | "analysisRequestId">>,
  ): Promise<Chart[]>;
  listByRequest(analysisRequestId: string): Promise<Chart[]>;
}

export interface AIAnalysisRepository {
  upsert(input: Omit<AIAnalysis, "id" | "createdAt">): Promise<AIAnalysis>;
  findByRequestId(analysisRequestId: string): Promise<AIAnalysis | null>;
}
