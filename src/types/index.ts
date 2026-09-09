/**
 * Domain types shared by the server layer, the API contract and the UI.
 * These describe the product, not any particular database or vendor.
 */

export type UserRole = "user" | "admin";

export interface User {
  id: string;
  email: string;
  displayName: string | null;
  avatarUrl: string | null;
  role: UserRole;
  createdAt: string;
  lastLoginAt: string | null;
}

export type SourceType = "excel" | "csv" | "google_sheets";

export type AnalysisStatus =
  | "REQUEST_CREATED"
  | "VALIDATING"
  | "INGESTING"
  | "SCHEMA_ANALYSIS"
  | "WAITING_FOR_CONFIRMATION"
  | "PROCESSING"
  | "ANALYZING"
  | "GENERATING_CHARTS"
  | "AI_ANALYSIS"
  | "GENERATING_PDF"
  | "COMPLETED"
  | "FAILED"
  | "CANCELLED";

/**
 * States from which the pipeline can be started.
 *
 * COMPLETED is included on purpose: refining a finished report is the normal
 * way to work here, and every refinement has to produce it again.
 */
export const RUNNABLE_STATUSES: AnalysisStatus[] = [
  "SCHEMA_ANALYSIS",
  "WAITING_FOR_CONFIRMATION",
  "COMPLETED",
  "FAILED",
];

/** States in which the request is finished and no longer changes. */
export const TERMINAL_STATUSES: AnalysisStatus[] = ["COMPLETED", "FAILED", "CANCELLED"];

export type MatchStatus =
  | "MATCHED"
  | "MATCHED_WITH_WARNINGS"
  | "EXTRA_COLUMNS"
  | "MISSING_REQUIRED_COLUMNS"
  | "TYPE_MISMATCH"
  | "AMBIGUOUS_MAPPING"
  | "INVALID_DATASET";

export type ColumnType =
  | "string"
  | "number"
  | "integer"
  | "percentage"
  | "date"
  | "boolean"
  | "unknown";

export interface DatasetColumn {
  name: string;
  normalizedName: string;
  key: string;
  index: number;
  inferredType: ColumnType;
  nullable: boolean;
  nullCount: number;
  distinctCount: number;
  numericRatio: number;
  sampleValues: string[];
}

export interface DatasetIssue {
  code: string;
  severity: "info" | "warning" | "error";
  message: string;
  details: Record<string, unknown>;
}

export interface Dataset {
  id: string;
  ownerId: string;
  sourceType: SourceType;
  sourceName: string;
  rowCount: number;
  columnCount: number;
  columns: DatasetColumn[];
  sampleRows: Array<Record<string, string>>;
  issues: DatasetIssue[];
  metadata: Record<string, unknown>;
  expiresAt: string | null;
  createdAt: string;
}

export interface TemplateColumnDefinition {
  key: string;
  expectedName: string;
  aliases: string[];
  type: ColumnType;
  required: boolean;
  description: string;
}

export interface TemplateDefinition {
  name: string;
  description: string;
  category: string;
  columns: TemplateColumnDefinition[];
  cleaning: Record<string, unknown>;
  derivedFields: Array<Record<string, unknown>>;
  analysis: {
    groupBy: string | null;
    filters?: Array<{ column: string; values: string[]; mode: "include" | "exclude" }>;
    metrics: Array<{ key: string; label: string; column: string; aggregation: string; unit: string }>;
    descriptiveColumns: string[];
    rankings: Array<Record<string, unknown>>;
    outlierColumns: string[];
    trendColumn: string | null;
  };
  charts: Array<{ id: string; type: string; title: string; x: string | null; y: string | null }>;
  report: { title: string; subtitle: string; period: string; language: string; sections: string[] };
  ai: { enabled: boolean; language: string; instructions: string; allowRawData: boolean };
}

/**
 * A change the system proposes but has not made.
 *
 * A typed request is planned and checked against the real data first. The plan
 * waits here with the exact definition it would apply, so accepting it applies
 * what was reviewed rather than asking the model a second time and getting
 * something else.
 */
export interface PendingPlan {
  id: string;
  /** The request as it was typed, echoed back so the plan can be read against it. */
  prompt: string;
  /** One line stating what the plan does. */
  summary: string;
  /** The concrete changes, derived from the two definitions rather than written by a model. */
  steps: string[];
  /** Reservations that do not block the plan, such as a filter value that matched nothing. */
  notes: string[];
  definition: TemplateDefinition;
  createdAt: string;
}

export interface Template {
  id: string;
  ownerId: string;
  name: string;
  description: string;
  category: string;
  status: "active" | "archived";
  currentVersion: number;
  usageCount: number;
  lastUsedAt: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface TemplateVersion {
  id: string;
  templateId: string;
  version: number;
  definition: TemplateDefinition;
  sampleDataset: Array<Record<string, string>> | null;
  changeNote: string;
  createdBy: string;
  createdAt: string;
}

export interface ColumnMapping {
  templateKey: string;
  templateColumnName: string;
  datasetColumn: string | null;
  datasetColumnName: string | null;
  matchType: "EXACT" | "ALIAS" | "KEY" | "CONFIRMED" | "UNMATCHED";
  required: boolean;
}

export interface MatchResult {
  status: MatchStatus;
  score: number;
  blocking: boolean;
  mapping: ColumnMapping[];
  missingRequiredColumns: string[];
  missingOptionalColumns: string[];
  extraColumns: Array<{ datasetColumn: string; datasetColumnName: string; inferredType: ColumnType }>;
  possibleRenames: Array<{
    templateKey: string;
    templateColumnName: string;
    required: boolean;
    candidates: Array<{ datasetColumn: string; datasetColumnName: string; similarity: number }>;
  }>;
  typeMismatches: Array<{
    templateKey: string;
    templateColumnName: string;
    datasetColumnName: string;
    expectedType: ColumnType;
    actualType: ColumnType;
    numericRatio: number;
    severity: "warning" | "blocking";
  }>;
  warnings: Array<{ code: string; message: string; details?: Record<string, unknown> }>;
  orderChanged: boolean;
}

export type ExtraColumnPolicy = "IGNORE" | "ADD_TO_TEMPLATE";

export interface Resolution {
  confirmedRenames: Array<{ templateColumnKey: string; datasetColumn: string }>;
  extraColumnPolicy: ExtraColumnPolicy;
  acknowledgedWarnings: boolean;
}

export interface StructuredError {
  code: string;
  message: string;
  details?: Record<string, unknown>;
}

/** A worksheet the user can switch to, with its prepared dataset id. */
export interface SheetOption {
  sheetName: string;
  index: number;
  usable: boolean;
  reason: string | null;
  datasetId: string | null;
  rowCount: number;
  columnCount: number;
}

export interface AnalysisRequest {
  id: string;
  ownerId: string;
  title: string;
  status: AnalysisStatus;
  sourceType: SourceType;
  sourceName: string;
  templateId: string | null;
  templateVersionId: string | null;
  datasetId: string | null;
  sheets: SheetOption[];
  definition: TemplateDefinition | null;
  /** Set while a planned change is waiting for the owner to accept or discard it. */
  pendingPlan: PendingPlan | null;
  matchResult: MatchResult | null;
  resolution: Resolution | null;
  error: StructuredError | null;
  engineVersion: string;
  createdAt: string;
  updatedAt: string;
  completedAt: string | null;
}

export interface AnalysisResult {
  id: string;
  analysisRequestId: string;
  metrics: Array<Record<string, unknown>>;
  statistics: Array<Record<string, unknown>>;
  groupSummary: Array<Record<string, unknown>>;
  rankings: Array<Record<string, unknown>>;
  outliers: Array<Record<string, unknown>>;
  trends: Array<Record<string, unknown>>;
  warnings: Array<Record<string, unknown>>;
  timings: Record<string, number>;
  createdAt: string;
}

export interface Chart {
  id: string;
  analysisRequestId: string;
  chartKey: string;
  type: string;
  title: string;
  config: Record<string, unknown>;
  storageKey: string;
  contentType: string;
  createdAt: string;
}

export type AIStatus = "SUCCEEDED" | "SKIPPED" | "FAILED";

export interface AIAnalysis {
  id: string;
  analysisRequestId: string;
  provider: string;
  model: string;
  status: AIStatus;
  sections: Record<string, unknown>;
  unverifiedNumbers: Array<Record<string, unknown>>;
  error: StructuredError | null;
  createdAt: string;
}

export interface Report {
  id: string;
  analysisRequestId: string;
  ownerId: string;
  title: string;
  storageKey: string;
  contentType: string;
  sizeBytes: number;
  templateId: string | null;
  templateVersionId: string | null;
  reportVersion: string;
  generatedAt: string;
  retentionExpiresAt: string | null;
}

export type JobStatus = "QUEUED" | "RUNNING" | "SUCCEEDED" | "FAILED" | "CANCELLED";

export interface Job {
  id: string;
  analysisRequestId: string;
  type: "ANALYSIS_PIPELINE";
  status: JobStatus;
  attempts: number;
  maxAttempts: number;
  payload: Record<string, unknown>;
  error: StructuredError | null;
  scheduledAt: string;
  startedAt: string | null;
  finishedAt: string | null;
}

export interface AuditLogEntry {
  id: string;
  actorId: string | null;
  action: string;
  entityType: string;
  entityId: string | null;
  metadata: Record<string, unknown>;
  ipHash: string | null;
  createdAt: string;
}

