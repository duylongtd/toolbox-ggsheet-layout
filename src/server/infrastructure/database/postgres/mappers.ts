import type {
  AIAnalysis,
  AnalysisRequest,
  AnalysisResult,
  AuditLogEntry,
  Chart,
  Dataset,
  Job,
  Report,
  Template,
  TemplateVersion,
  User,
} from "@/types";

/**
 * Row to domain translation.
 *
 * SQL uses snake_case, the domain uses camelCase. Keeping the translation in
 * one file means a schema rename touches exactly one place.
 */

const iso = (value: unknown): string =>
  value instanceof Date ? value.toISOString() : String(value ?? "");

const isoOrNull = (value: unknown): string | null =>
  value === null || value === undefined ? null : iso(value);

export const toUser = (row: Record<string, unknown>): User => ({
  id: String(row.id),
  email: String(row.email),
  displayName: (row.display_name as string | null) ?? null,
  avatarUrl: (row.avatar_url as string | null) ?? null,
  role: (row.role as User["role"]) ?? "user",
  createdAt: iso(row.created_at),
  lastLoginAt: isoOrNull(row.last_login_at),
});

export const toTemplate = (row: Record<string, unknown>): Template => ({
  id: String(row.id),
  ownerId: String(row.owner_id),
  name: String(row.name),
  description: String(row.description ?? ""),
  category: String(row.category ?? "general"),
  status: (row.status as Template["status"]) ?? "active",
  currentVersion: Number(row.current_version ?? 1),
  usageCount: Number(row.usage_count ?? 0),
  lastUsedAt: isoOrNull(row.last_used_at),
  createdAt: iso(row.created_at),
  updatedAt: iso(row.updated_at),
});

export const toTemplateVersion = (row: Record<string, unknown>): TemplateVersion => ({
  id: String(row.id),
  templateId: String(row.template_id),
  version: Number(row.version),
  definition: row.definition as TemplateVersion["definition"],
  sampleDataset: (row.sample_dataset as TemplateVersion["sampleDataset"]) ?? null,
  changeNote: String(row.change_note ?? ""),
  createdBy: String(row.created_by),
  createdAt: iso(row.created_at),
});

export const toDataset = (
  row: Record<string, unknown>,
  columns: Dataset["columns"],
  issues: Dataset["issues"],
): Dataset => ({
  id: String(row.id),
  ownerId: String(row.owner_id),
  sourceType: row.source_type as Dataset["sourceType"],
  sourceName: String(row.source_name),
  rowCount: Number(row.row_count ?? 0),
  columnCount: Number(row.column_count ?? 0),
  columns,
  sampleRows: (row.sample_rows as Dataset["sampleRows"]) ?? [],
  issues,
  metadata: (row.metadata as Record<string, unknown>) ?? {},
  expiresAt: isoOrNull(row.expires_at),
  createdAt: iso(row.created_at),
});

export const toDatasetColumn = (row: Record<string, unknown>): Dataset["columns"][number] => ({
  name: String(row.name),
  normalizedName: String(row.normalized_name),
  key: String(row.column_key),
  index: Number(row.column_index ?? 0),
  inferredType: row.inferred_type as Dataset["columns"][number]["inferredType"],
  nullable: Boolean(row.nullable),
  nullCount: Number(row.null_count ?? 0),
  distinctCount: Number(row.distinct_count ?? 0),
  numericRatio: Number(row.numeric_ratio ?? 0),
  sampleValues: (row.sample_values as string[]) ?? [],
});

export const toDatasetIssue = (row: Record<string, unknown>): Dataset["issues"][number] => ({
  code: String(row.code),
  severity: row.severity as Dataset["issues"][number]["severity"],
  message: String(row.message),
  details: (row.details as Record<string, unknown>) ?? {},
});

export const toAnalysisRequest = (row: Record<string, unknown>): AnalysisRequest => ({
  id: String(row.id),
  ownerId: String(row.owner_id),
  title: String(row.title),
  status: row.status as AnalysisRequest["status"],
  sourceType: row.source_type as AnalysisRequest["sourceType"],
  sourceName: String(row.source_name ?? ""),
  templateId: (row.template_id as string | null) ?? null,
  templateVersionId: (row.template_version_id as string | null) ?? null,
  datasetId: (row.dataset_id as string | null) ?? null,
  sheets: (row.sheets as AnalysisRequest["sheets"]) ?? [],
  definition: (row.definition as AnalysisRequest["definition"]) ?? null,
  pendingPlan: (row.pending_plan as AnalysisRequest["pendingPlan"]) ?? null,
  matchResult: (row.match_result as AnalysisRequest["matchResult"]) ?? null,
  resolution: (row.resolution as AnalysisRequest["resolution"]) ?? null,
  error: (row.error as AnalysisRequest["error"]) ?? null,
  engineVersion: String(row.engine_version ?? ""),
  createdAt: iso(row.created_at),
  updatedAt: iso(row.updated_at),
  completedAt: isoOrNull(row.completed_at),
});

export const toAnalysisResult = (row: Record<string, unknown>): AnalysisResult => ({
  id: String(row.id),
  analysisRequestId: String(row.analysis_request_id),
  metrics: (row.metrics as AnalysisResult["metrics"]) ?? [],
  statistics: (row.statistics as AnalysisResult["statistics"]) ?? [],
  groupSummary: (row.group_summary as AnalysisResult["groupSummary"]) ?? [],
  rankings: (row.rankings as AnalysisResult["rankings"]) ?? [],
  outliers: (row.outliers as AnalysisResult["outliers"]) ?? [],
  trends: (row.trends as AnalysisResult["trends"]) ?? [],
  warnings: (row.warnings as AnalysisResult["warnings"]) ?? [],
  timings: (row.timings as Record<string, number>) ?? {},
  createdAt: iso(row.created_at),
});

export const toChart = (row: Record<string, unknown>): Chart => ({
  id: String(row.id),
  analysisRequestId: String(row.analysis_request_id),
  chartKey: String(row.chart_key),
  type: String(row.type),
  title: String(row.title),
  config: (row.config as Record<string, unknown>) ?? {},
  storageKey: String(row.storage_key),
  contentType: String(row.content_type ?? "image/png"),
  createdAt: iso(row.created_at),
});

export const toAIAnalysis = (row: Record<string, unknown>): AIAnalysis => ({
  id: String(row.id),
  analysisRequestId: String(row.analysis_request_id),
  provider: String(row.provider),
  model: String(row.model ?? ""),
  status: row.status as AIAnalysis["status"],
  sections: (row.sections as Record<string, unknown>) ?? {},
  unverifiedNumbers: (row.unverified_numbers as AIAnalysis["unverifiedNumbers"]) ?? [],
  error: (row.error as AIAnalysis["error"]) ?? null,
  createdAt: iso(row.created_at),
});

export const toReport = (row: Record<string, unknown>): Report => ({
  id: String(row.id),
  analysisRequestId: String(row.analysis_request_id),
  ownerId: String(row.owner_id),
  title: String(row.title),
  storageKey: String(row.storage_key),
  contentType: String(row.content_type ?? "application/pdf"),
  sizeBytes: Number(row.size_bytes ?? 0),
  templateId: (row.template_id as string | null) ?? null,
  templateVersionId: (row.template_version_id as string | null) ?? null,
  reportVersion: String(row.report_version ?? "1"),
  generatedAt: iso(row.generated_at),
  retentionExpiresAt: isoOrNull(row.retention_expires_at),
});

export const toJob = (row: Record<string, unknown>): Job => ({
  id: String(row.id),
  analysisRequestId: String(row.analysis_request_id),
  type: row.type as Job["type"],
  status: row.status as Job["status"],
  attempts: Number(row.attempts ?? 0),
  maxAttempts: Number(row.max_attempts ?? 1),
  payload: (row.payload as Record<string, unknown>) ?? {},
  error: (row.error as Job["error"]) ?? null,
  scheduledAt: iso(row.scheduled_at),
  startedAt: isoOrNull(row.started_at),
  finishedAt: isoOrNull(row.finished_at),
});

export const toAuditLogEntry = (row: Record<string, unknown>): AuditLogEntry => ({
  id: String(row.id),
  actorId: (row.actor_id as string | null) ?? null,
  action: String(row.action),
  entityType: String(row.entity_type),
  entityId: (row.entity_id as string | null) ?? null,
  metadata: (row.metadata as Record<string, unknown>) ?? {},
  ipHash: (row.ip_hash as string | null) ?? null,
  createdAt: iso(row.created_at),
});
