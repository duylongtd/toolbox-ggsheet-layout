import { randomUUID } from "node:crypto";
import type {
  AIAnalysis,
  AnalysisRequest,
  AnalysisResult,
  AnalysisStatus,
  AuditLogEntry,
  Chart,
  Dataset,
  Job,
  Report,
  Template,
  TemplateVersion,
  User,
} from "@/types";
import type {
  AnalysisRequestChanges,
  CreateAnalysisRequestInput,
} from "@/server/repositories/analysis";
import type { CreateJobInput } from "@/server/repositories/job";
import type {
  CreateTemplateInput,
  CreateTemplateVersionInput,
} from "@/server/repositories/template";
import type { RecordAuditInput } from "@/server/repositories/audit";
import type { Repositories } from "@/server/repositories";

/**
 * In-process implementation.
 *
 * It exists so the product runs and can be tested without a database, and so a
 * second implementation proves the repository interfaces are not shaped around
 * one vendor. It is explicitly rejected in production by the configuration
 * guard in `config/env.ts`.
 */

interface Tables {
  users: Map<string, User>;
  templates: Map<string, Template>;
  templateVersions: Map<string, TemplateVersion>;
  datasets: Map<string, Dataset>;
  analysisRequests: Map<string, AnalysisRequest>;
  analysisResults: Map<string, AnalysisResult>;
  charts: Map<string, Chart>;
  aiAnalyses: Map<string, AIAnalysis>;
  reports: Map<string, Report>;
  jobs: Map<string, Job>;
  auditLogs: Map<string, AuditLogEntry>;
}

function emptyTables(): Tables {
  return {
    users: new Map(),
    templates: new Map(),
    templateVersions: new Map(),
    datasets: new Map(),
    analysisRequests: new Map(),
    analysisResults: new Map(),
    charts: new Map(),
    aiAnalyses: new Map(),
    reports: new Map(),
    jobs: new Map(),
    auditLogs: new Map(),
  };
}

const now = () => new Date().toISOString();
const clone = <T>(value: T): T => JSON.parse(JSON.stringify(value)) as T;
const byNewest = (a: { createdAt: string }, b: { createdAt: string }) =>
  b.createdAt.localeCompare(a.createdAt);

export function createMemoryRepositories(): Repositories & { reset(): void } {
  const db = emptyTables();

  return {
    reset() {
      Object.values(db).forEach((table) => (table as Map<string, unknown>).clear());
    },

    users: {
      async findById(id) {
        return db.users.get(id) ?? null;
      },
      async upsertFromAuth(input) {
        const existing = db.users.get(input.id);
        const user: User = existing
          ? { ...existing, email: input.email, displayName: input.displayName, avatarUrl: input.avatarUrl }
          : {
              id: input.id,
              email: input.email,
              displayName: input.displayName,
              avatarUrl: input.avatarUrl,
              role: "user",
              createdAt: now(),
              lastLoginAt: null,
            };
        db.users.set(user.id, user);
        return clone(user);
      },
      async recordLogin(id) {
        const user = db.users.get(id);
        if (user) db.users.set(id, { ...user, lastLoginAt: now() });
      },
    },

    templates: {
      async create(input: CreateTemplateInput) {
        const template: Template = {
          id: randomUUID(),
          ownerId: input.ownerId,
          name: input.name,
          description: input.description,
          category: input.category,
          status: "active",
          currentVersion: 1,
          usageCount: 0,
          lastUsedAt: null,
          createdAt: now(),
          updatedAt: now(),
        };
        db.templates.set(template.id, template);
        return clone(template);
      },
      async findById(id) {
        const found = db.templates.get(id);
        return found ? clone(found) : null;
      },
      async listByOwner(ownerId, includeArchived = false) {
        return [...db.templates.values()]
          .filter((t) => t.ownerId === ownerId && (includeArchived || t.status === "active"))
          .sort(byNewest)
          .map(clone);
      },
      async update(id, changes) {
        const existing = db.templates.get(id);
        if (!existing) throw new Error(`Template ${id} not found`);
        const updated = { ...existing, ...changes, updatedAt: now() };
        db.templates.set(id, updated);
        return clone(updated);
      },
      async recordUsage(id) {
        const existing = db.templates.get(id);
        if (!existing) return;
        db.templates.set(id, {
          ...existing,
          usageCount: existing.usageCount + 1,
          lastUsedAt: now(),
          updatedAt: now(),
        });
      },
    },

    templateVersions: {
      async create(input: CreateTemplateVersionInput) {
        const version: TemplateVersion = {
          id: randomUUID(),
          templateId: input.templateId,
          version: input.version,
          definition: clone(input.definition),
          sampleDataset: input.sampleDataset ? clone(input.sampleDataset) : null,
          changeNote: input.changeNote,
          createdBy: input.createdBy,
          createdAt: now(),
        };
        db.templateVersions.set(version.id, version);
        return clone(version);
      },
      async findById(id) {
        const found = db.templateVersions.get(id);
        return found ? clone(found) : null;
      },
      async listByTemplate(templateId) {
        return [...db.templateVersions.values()]
          .filter((v) => v.templateId === templateId)
          .sort((a, b) => b.version - a.version)
          .map(clone);
      },
      async findLatest(templateId) {
        const versions = [...db.templateVersions.values()]
          .filter((v) => v.templateId === templateId)
          .sort((a, b) => b.version - a.version);
        return versions[0] ? clone(versions[0]) : null;
      },
    },

    datasets: {
      async create(input) {
        const dataset: Dataset = { ...clone(input), createdAt: now() };
        db.datasets.set(dataset.id, dataset);
        return clone(dataset);
      },
      async findById(id) {
        const found = db.datasets.get(id);
        return found ? clone(found) : null;
      },
    },

    analysisRequests: {
      async create(input: CreateAnalysisRequestInput) {
        const request: AnalysisRequest = {
          id: randomUUID(),
          ownerId: input.ownerId,
          title: input.title,
          status: input.status,
          sourceType: input.sourceType,
          sourceName: input.sourceName,
          templateId: input.templateId,
          templateVersionId: input.templateVersionId,
          datasetId: null,
          sheets: [],
          definition: null,
          pendingPlan: null,
          progress: [],
          matchResult: null,
          resolution: null,
          error: null,
          engineVersion: "",
          createdAt: now(),
          updatedAt: now(),
          completedAt: null,
        };
        db.analysisRequests.set(request.id, request);
        return clone(request);
      },
      async findById(id) {
        const found = db.analysisRequests.get(id);
        return found ? clone(found) : null;
      },
      async listByOwner(ownerId, limit = 50) {
        return [...db.analysisRequests.values()]
          .filter((r) => r.ownerId === ownerId)
          .sort(byNewest)
          .slice(0, limit)
          .map(clone);
      },
      async update(id, changes: AnalysisRequestChanges) {
        const existing = db.analysisRequests.get(id);
        if (!existing) throw new Error(`Analysis request ${id} not found`);
        const updated = { ...existing, ...clone(changes), updatedAt: now() };
        db.analysisRequests.set(id, updated);
        return clone(updated);
      },
      async appendProgress(id, event) {
        const existing = db.analysisRequests.get(id);
        if (!existing) throw new Error(`Analysis request ${id} not found`);
        existing.progress = [...existing.progress, clone(event)];
        existing.updatedAt = now();
      },
      async countByTemplateVersion(templateVersionId) {
        return [...db.analysisRequests.values()].filter(
          (r) => r.templateVersionId === templateVersionId,
        ).length;
      },
    },

    analysisResults: {
      async upsert(input) {
        const existing = [...db.analysisResults.values()].find(
          (r) => r.analysisRequestId === input.analysisRequestId,
        );
        const result: AnalysisResult = {
          id: existing?.id ?? randomUUID(),
          createdAt: existing?.createdAt ?? now(),
          ...clone(input),
        };
        db.analysisResults.set(result.id, result);
        return clone(result);
      },
      async findByRequestId(analysisRequestId) {
        const found = [...db.analysisResults.values()].find(
          (r) => r.analysisRequestId === analysisRequestId,
        );
        return found ? clone(found) : null;
      },
    },

    charts: {
      async replaceForRequest(analysisRequestId, charts) {
        for (const [id, chart] of db.charts) {
          if (chart.analysisRequestId === analysisRequestId) db.charts.delete(id);
        }
        const created = charts.map((chart) => {
          const record: Chart = {
            id: randomUUID(),
            analysisRequestId,
            createdAt: now(),
            ...clone(chart),
          };
          db.charts.set(record.id, record);
          return record;
        });
        return created.map(clone);
      },
      async listByRequest(analysisRequestId) {
        return [...db.charts.values()]
          .filter((c) => c.analysisRequestId === analysisRequestId)
          .sort((a, b) => a.createdAt.localeCompare(b.createdAt))
          .map(clone);
      },
    },

    aiAnalyses: {
      async upsert(input) {
        const existing = [...db.aiAnalyses.values()].find(
          (a) => a.analysisRequestId === input.analysisRequestId,
        );
        const record: AIAnalysis = {
          id: existing?.id ?? randomUUID(),
          createdAt: existing?.createdAt ?? now(),
          ...clone(input),
        };
        db.aiAnalyses.set(record.id, record);
        return clone(record);
      },
      async findByRequestId(analysisRequestId) {
        const found = [...db.aiAnalyses.values()].find(
          (a) => a.analysisRequestId === analysisRequestId,
        );
        return found ? clone(found) : null;
      },
    },

    reports: {
      async create(input) {
        const report: Report = { id: randomUUID(), generatedAt: now(), ...clone(input) };
        db.reports.set(report.id, report);
        return clone(report);
      },
      async findById(id) {
        const found = db.reports.get(id);
        return found ? clone(found) : null;
      },
      async findByRequestId(analysisRequestId) {
        const found = [...db.reports.values()]
          .filter((r) => r.analysisRequestId === analysisRequestId)
          .sort((a, b) => b.generatedAt.localeCompare(a.generatedAt))[0];
        return found ? clone(found) : null;
      },
      async listByOwner(ownerId, limit = 50) {
        return [...db.reports.values()]
          .filter((r) => r.ownerId === ownerId)
          .sort((a, b) => b.generatedAt.localeCompare(a.generatedAt))
          .slice(0, limit)
          .map(clone);
      },
      async countByTemplateVersion(templateVersionId) {
        return [...db.reports.values()].filter((r) => r.templateVersionId === templateVersionId)
          .length;
      },
    },

    jobs: {
      async create(input: CreateJobInput) {
        const job: Job = {
          id: randomUUID(),
          analysisRequestId: input.analysisRequestId,
          type: input.type,
          status: "QUEUED",
          attempts: 0,
          maxAttempts: input.maxAttempts ?? 1,
          payload: clone(input.payload),
          error: null,
          scheduledAt: now(),
          startedAt: null,
          finishedAt: null,
        };
        db.jobs.set(job.id, job);
        return clone(job);
      },
      async findById(id) {
        const found = db.jobs.get(id);
        return found ? clone(found) : null;
      },
      async findLatestByRequest(analysisRequestId) {
        const found = [...db.jobs.values()]
          .filter((j) => j.analysisRequestId === analysisRequestId)
          .sort((a, b) => b.scheduledAt.localeCompare(a.scheduledAt))[0];
        return found ? clone(found) : null;
      },
      async claimNext() {
        const next = [...db.jobs.values()]
          .filter((j) => j.status === "QUEUED")
          .sort((a, b) => a.scheduledAt.localeCompare(b.scheduledAt))[0];
        if (!next) return null;
        const claimed: Job = {
          ...next,
          status: "RUNNING",
          attempts: next.attempts + 1,
          startedAt: now(),
        };
        db.jobs.set(claimed.id, claimed);
        return clone(claimed);
      },
      async update(id, changes) {
        const existing = db.jobs.get(id);
        if (!existing) throw new Error(`Job ${id} not found`);
        const updated = { ...existing, ...clone(changes) };
        db.jobs.set(id, updated);
        return clone(updated);
      },
      async cancelForRequest(analysisRequestId) {
        for (const [id, job] of db.jobs) {
          if (job.analysisRequestId === analysisRequestId && job.status === "QUEUED") {
            db.jobs.set(id, { ...job, status: "CANCELLED", finishedAt: now() });
          }
        }
      },
    },

    auditLogs: {
      async record(input: RecordAuditInput) {
        const entry: AuditLogEntry = {
          id: randomUUID(),
          actorId: input.actorId,
          action: input.action,
          entityType: input.entityType,
          entityId: input.entityId,
          metadata: clone(input.metadata ?? {}),
          ipHash: input.ipHash ?? null,
          createdAt: now(),
        };
        db.auditLogs.set(entry.id, entry);
      },
      async listRecent(actorId, limit) {
        return [...db.auditLogs.values()]
          .filter((entry) => entry.actorId === actorId)
          .sort(byNewest)
          .slice(0, limit)
          .map(clone);
      },
    },
  };
}
