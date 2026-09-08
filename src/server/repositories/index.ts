import type {
  AIAnalysisRepository,
  AnalysisRequestRepository,
  AnalysisResultRepository,
  ChartRepository,
} from "./analysis";
import type { AuditLogRepository } from "./audit";
import type { DatasetRepository } from "./dataset";
import type { JobRepository } from "./job";
import type { ReportRepository } from "./report";
import type { TemplateRepository, TemplateVersionRepository } from "./template";
import type { UserRepository } from "./user";

/**
 * The complete persistence surface the application services depend on.
 *
 * Services receive this container. They never import a database driver, so the
 * storage engine can be replaced by providing another implementation.
 */
export interface Repositories {
  users: UserRepository;
  templates: TemplateRepository;
  templateVersions: TemplateVersionRepository;
  datasets: DatasetRepository;
  analysisRequests: AnalysisRequestRepository;
  analysisResults: AnalysisResultRepository;
  charts: ChartRepository;
  aiAnalyses: AIAnalysisRepository;
  reports: ReportRepository;
  jobs: JobRepository;
  auditLogs: AuditLogRepository;
}

export type {
  AIAnalysisRepository,
  AnalysisRequestRepository,
  AnalysisResultRepository,
  ChartRepository,
} from "./analysis";
export type { AuditLogRepository, RecordAuditInput } from "./audit";
export type { DatasetRepository } from "./dataset";
export type { CreateJobInput, JobRepository } from "./job";
export type { ReportRepository } from "./report";
export type {
  CreateTemplateInput,
  CreateTemplateVersionInput,
  TemplateRepository,
  TemplateVersionRepository,
} from "./template";
export type { UserRepository } from "./user";
