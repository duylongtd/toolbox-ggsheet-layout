import "server-only";
import type { Repositories } from "@/server/repositories";
import type { AnalysisStatus, Dataset } from "@/types";
import { query, queryOne, withTransaction } from "./client";
import {
  toAIAnalysis,
  toAnalysisRequest,
  toAnalysisResult,
  toAuditLogEntry,
  toChart,
  toDataset,
  toDatasetColumn,
  toDatasetIssue,
  toJob,
  toReport,
  toTemplate,
  toTemplateVersion,
  toUser,
} from "./mappers";

/**
 * PostgreSQL implementation of every repository interface.
 *
 * It works unchanged against Supabase PostgreSQL and against any other
 * PostgreSQL server, because it uses portable SQL and no vendor client.
 */
export function createPostgresRepositories(): Repositories {
  return {
    users: {
      async findById(id) {
        const row = await queryOne("SELECT * FROM users WHERE id = $1", [id]);
        return row ? toUser(row) : null;
      },
      async upsertFromAuth(input) {
        const row = await queryOne(
          `INSERT INTO users (id, email, display_name, avatar_url)
           VALUES ($1, $2, $3, $4)
           ON CONFLICT (id) DO UPDATE
             SET email = EXCLUDED.email,
                 display_name = EXCLUDED.display_name,
                 avatar_url = EXCLUDED.avatar_url
           RETURNING *`,
          [input.id, input.email, input.displayName, input.avatarUrl],
        );
        return toUser(row!);
      },
      async recordLogin(id) {
        await query("UPDATE users SET last_login_at = now() WHERE id = $1", [id]);
      },
    },

    templates: {
      async create(input) {
        const row = await queryOne(
          `INSERT INTO templates (owner_id, name, description, category)
           VALUES ($1, $2, $3, $4) RETURNING *`,
          [input.ownerId, input.name, input.description, input.category],
        );
        return toTemplate(row!);
      },
      async findById(id) {
        const row = await queryOne("SELECT * FROM templates WHERE id = $1", [id]);
        return row ? toTemplate(row) : null;
      },
      async listByOwner(ownerId, includeArchived = false) {
        const rows = await query(
          `SELECT * FROM templates
           WHERE owner_id = $1 AND ($2::boolean OR status = 'active')
           ORDER BY updated_at DESC`,
          [ownerId, includeArchived],
        );
        return rows.map(toTemplate);
      },
      async update(id, changes) {
        const row = await queryOne(
          `UPDATE templates SET
             name = COALESCE($2, name),
             description = COALESCE($3, description),
             category = COALESCE($4, category),
             status = COALESCE($5, status),
             current_version = COALESCE($6, current_version),
             updated_at = now()
           WHERE id = $1 RETURNING *`,
          [
            id,
            changes.name ?? null,
            changes.description ?? null,
            changes.category ?? null,
            changes.status ?? null,
            changes.currentVersion ?? null,
          ],
        );
        if (!row) throw new Error(`Template ${id} not found`);
        return toTemplate(row);
      },
      async recordUsage(id) {
        await query(
          `UPDATE templates
           SET usage_count = usage_count + 1, last_used_at = now(), updated_at = now()
           WHERE id = $1`,
          [id],
        );
      },
    },

    templateVersions: {
      async create(input) {
        const row = await queryOne(
          `INSERT INTO template_versions
             (template_id, version, definition, sample_dataset, change_note, created_by)
           VALUES ($1, $2, $3::jsonb, $4::jsonb, $5, $6) RETURNING *`,
          [
            input.templateId,
            input.version,
            JSON.stringify(input.definition),
            input.sampleDataset ? JSON.stringify(input.sampleDataset) : null,
            input.changeNote,
            input.createdBy,
          ],
        );
        return toTemplateVersion(row!);
      },
      async findById(id) {
        const row = await queryOne("SELECT * FROM template_versions WHERE id = $1", [id]);
        return row ? toTemplateVersion(row) : null;
      },
      async listByTemplate(templateId) {
        const rows = await query(
          "SELECT * FROM template_versions WHERE template_id = $1 ORDER BY version DESC",
          [templateId],
        );
        return rows.map(toTemplateVersion);
      },
      async findLatest(templateId) {
        const row = await queryOne(
          "SELECT * FROM template_versions WHERE template_id = $1 ORDER BY version DESC LIMIT 1",
          [templateId],
        );
        return row ? toTemplateVersion(row) : null;
      },
    },

    datasets: {
      async create(dataset) {
        return withTransaction(async (client) => {
          const inserted = await client.query(
            `INSERT INTO datasets
               (id, owner_id, source_type, source_name, row_count, column_count,
                sample_rows, metadata, expires_at)
             VALUES ($1, $2, $3, $4, $5, $6, $7::jsonb, $8::jsonb, $9)
             ON CONFLICT (id) DO UPDATE SET
               source_name = EXCLUDED.source_name,
               row_count = EXCLUDED.row_count,
               column_count = EXCLUDED.column_count,
               sample_rows = EXCLUDED.sample_rows,
               metadata = EXCLUDED.metadata,
               expires_at = EXCLUDED.expires_at
             RETURNING *`,
            [
              dataset.id,
              dataset.ownerId,
              dataset.sourceType,
              dataset.sourceName,
              dataset.rowCount,
              dataset.columnCount,
              JSON.stringify(dataset.sampleRows),
              JSON.stringify(dataset.metadata),
              dataset.expiresAt,
            ],
          );

          await client.query("DELETE FROM dataset_columns WHERE dataset_id = $1", [dataset.id]);
          for (const column of dataset.columns) {
            await client.query(
              `INSERT INTO dataset_columns
                 (dataset_id, column_index, name, normalized_name, column_key, inferred_type,
                  nullable, null_count, distinct_count, numeric_ratio, sample_values)
               VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11::jsonb)`,
              [
                dataset.id,
                column.index,
                column.name,
                column.normalizedName,
                column.key,
                column.inferredType,
                column.nullable,
                column.nullCount,
                column.distinctCount,
                column.numericRatio,
                JSON.stringify(column.sampleValues),
              ],
            );
          }

          await client.query("DELETE FROM dataset_issues WHERE dataset_id = $1", [dataset.id]);
          for (const issue of dataset.issues) {
            await client.query(
              `INSERT INTO dataset_issues (dataset_id, code, severity, message, details)
               VALUES ($1,$2,$3,$4,$5::jsonb)`,
              [dataset.id, issue.code, issue.severity, issue.message, JSON.stringify(issue.details)],
            );
          }

          return toDataset(inserted.rows[0]!, dataset.columns, dataset.issues);
        });
      },
      async findById(id) {
        const row = await queryOne("SELECT * FROM datasets WHERE id = $1", [id]);
        if (!row) return null;
        const columnRows = await query(
          "SELECT * FROM dataset_columns WHERE dataset_id = $1 ORDER BY column_index",
          [id],
        );
        const issueRows = await query("SELECT * FROM dataset_issues WHERE dataset_id = $1", [id]);
        const columns: Dataset["columns"] = columnRows.map(toDatasetColumn);
        const issues: Dataset["issues"] = issueRows.map(toDatasetIssue);
        return toDataset(row, columns, issues);
      },
    },

    analysisRequests: {
      async create(input) {
        const row = await queryOne(
          `INSERT INTO analysis_requests
             (owner_id, title, status, source_type, source_name, template_id, template_version_id)
           VALUES ($1,$2,$3,$4,$5,$6,$7) RETURNING *`,
          [
            input.ownerId,
            input.title,
            input.status,
            input.sourceType,
            input.sourceName,
            input.templateId,
            input.templateVersionId,
          ],
        );
        return toAnalysisRequest(row!);
      },
      async findById(id) {
        const row = await queryOne("SELECT * FROM analysis_requests WHERE id = $1", [id]);
        return row ? toAnalysisRequest(row) : null;
      },
      async listByOwner(ownerId, limit = 50) {
        const rows = await query(
          "SELECT * FROM analysis_requests WHERE owner_id = $1 ORDER BY created_at DESC LIMIT $2",
          [ownerId, limit],
        );
        return rows.map(toAnalysisRequest);
      },
      async update(id, changes) {
        const row = await queryOne(
          `UPDATE analysis_requests SET
             status = COALESCE($2, status),
             title = COALESCE($3, title),
             source_type = COALESCE($15, source_type),
             source_name = COALESCE($4, source_name),
             template_id = COALESCE($5, template_id),
             template_version_id = COALESCE($6, template_version_id),
             dataset_id = COALESCE($7, dataset_id),
             sheets = COALESCE($16::jsonb, sheets),
             definition = COALESCE($8::jsonb, definition),
             match_result = COALESCE($9::jsonb, match_result),
             pending_plan = CASE WHEN $18::boolean THEN $17::jsonb ELSE pending_plan END,
             progress = COALESCE($19::jsonb, progress),
             resolution = COALESCE($10::jsonb, resolution),
             error = CASE WHEN $12::boolean THEN $11::jsonb ELSE error END,
             engine_version = COALESCE($13, engine_version),
             completed_at = COALESCE($14, completed_at),
             updated_at = now()
           WHERE id = $1 RETURNING *`,
          [
            id,
            changes.status ?? null,
            changes.title ?? null,
            changes.sourceName ?? null,
            changes.templateId ?? null,
            changes.templateVersionId ?? null,
            changes.datasetId ?? null,
            changes.definition ? JSON.stringify(changes.definition) : null,
            changes.matchResult ? JSON.stringify(changes.matchResult) : null,
            changes.resolution ? JSON.stringify(changes.resolution) : null,
            changes.error ? JSON.stringify(changes.error) : null,
            // The error column must also be clearable, so it is set explicitly.
            Object.prototype.hasOwnProperty.call(changes, "error"),
            changes.engineVersion ?? null,
            changes.completedAt ?? null,
            changes.sourceType ?? null,
            changes.sheets ? JSON.stringify(changes.sheets) : null,
            changes.pendingPlan ? JSON.stringify(changes.pendingPlan) : null,
            // Accepting or discarding a plan clears the column, so like the
            // error column it is written whenever the caller mentions it.
            Object.prototype.hasOwnProperty.call(changes, "pendingPlan"),
            changes.progress ? JSON.stringify(changes.progress) : null,
          ],
        );
        if (!row) throw new Error(`Analysis request ${id} not found`);
        return toAnalysisRequest(row);
      },
      async appendProgress(id, event) {
        // The concatenation happens in the database, so two reports arriving
        // together both land rather than one overwriting the other.
        await query(
          "UPDATE analysis_requests SET progress = progress || $2::jsonb WHERE id = $1",
          [id, JSON.stringify([event])],
        );
      },
      async countByTemplateVersion(templateVersionId) {
        const row = await queryOne<{ count: string }>(
          "SELECT COUNT(*)::text AS count FROM analysis_requests WHERE template_version_id = $1",
          [templateVersionId],
        );
        return Number(row?.count ?? 0);
      },
    },

    analysisResults: {
      async upsert(input) {
        const row = await queryOne(
          `INSERT INTO analysis_results
             (analysis_request_id, metrics, statistics, group_summary, rankings,
              outliers, trends, warnings, timings)
           VALUES ($1,$2::jsonb,$3::jsonb,$4::jsonb,$5::jsonb,$6::jsonb,$7::jsonb,$8::jsonb,$9::jsonb)
           ON CONFLICT (analysis_request_id) DO UPDATE SET
             metrics = EXCLUDED.metrics, statistics = EXCLUDED.statistics,
             group_summary = EXCLUDED.group_summary, rankings = EXCLUDED.rankings,
             outliers = EXCLUDED.outliers, trends = EXCLUDED.trends,
             warnings = EXCLUDED.warnings, timings = EXCLUDED.timings
           RETURNING *`,
          [
            input.analysisRequestId,
            JSON.stringify(input.metrics),
            JSON.stringify(input.statistics),
            JSON.stringify(input.groupSummary),
            JSON.stringify(input.rankings),
            JSON.stringify(input.outliers),
            JSON.stringify(input.trends),
            JSON.stringify(input.warnings),
            JSON.stringify(input.timings),
          ],
        );
        return toAnalysisResult(row!);
      },
      async findByRequestId(analysisRequestId) {
        const row = await queryOne(
          "SELECT * FROM analysis_results WHERE analysis_request_id = $1",
          [analysisRequestId],
        );
        return row ? toAnalysisResult(row) : null;
      },
    },

    charts: {
      async replaceForRequest(analysisRequestId, charts) {
        return withTransaction(async (client) => {
          await client.query("DELETE FROM charts WHERE analysis_request_id = $1", [
            analysisRequestId,
          ]);
          const created = [];
          for (const chart of charts) {
            const result = await client.query(
              `INSERT INTO charts
                 (analysis_request_id, chart_key, type, title, config, storage_key, content_type)
               VALUES ($1,$2,$3,$4,$5::jsonb,$6,$7) RETURNING *`,
              [
                analysisRequestId,
                chart.chartKey,
                chart.type,
                chart.title,
                JSON.stringify(chart.config),
                chart.storageKey,
                chart.contentType,
              ],
            );
            created.push(toChart(result.rows[0]!));
          }
          return created;
        });
      },
      async listByRequest(analysisRequestId) {
        const rows = await query(
          "SELECT * FROM charts WHERE analysis_request_id = $1 ORDER BY created_at, chart_key",
          [analysisRequestId],
        );
        return rows.map(toChart);
      },
    },

    aiAnalyses: {
      async upsert(input) {
        const row = await queryOne(
          `INSERT INTO ai_analyses
             (analysis_request_id, provider, model, status, sections, unverified_numbers, error)
           VALUES ($1,$2,$3,$4,$5::jsonb,$6::jsonb,$7::jsonb)
           ON CONFLICT (analysis_request_id) DO UPDATE SET
             provider = EXCLUDED.provider, model = EXCLUDED.model, status = EXCLUDED.status,
             sections = EXCLUDED.sections, unverified_numbers = EXCLUDED.unverified_numbers,
             error = EXCLUDED.error
           RETURNING *`,
          [
            input.analysisRequestId,
            input.provider,
            input.model,
            input.status,
            JSON.stringify(input.sections),
            JSON.stringify(input.unverifiedNumbers),
            input.error ? JSON.stringify(input.error) : null,
          ],
        );
        return toAIAnalysis(row!);
      },
      async findByRequestId(analysisRequestId) {
        const row = await queryOne("SELECT * FROM ai_analyses WHERE analysis_request_id = $1", [
          analysisRequestId,
        ]);
        return row ? toAIAnalysis(row) : null;
      },
    },

    reports: {
      async create(input) {
        const row = await queryOne(
          `INSERT INTO reports
             (analysis_request_id, owner_id, title, storage_key, content_type, size_bytes,
              template_id, template_version_id, report_version, retention_expires_at)
           VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10) RETURNING *`,
          [
            input.analysisRequestId,
            input.ownerId,
            input.title,
            input.storageKey,
            input.contentType,
            input.sizeBytes,
            input.templateId,
            input.templateVersionId,
            input.reportVersion,
            input.retentionExpiresAt,
          ],
        );
        return toReport(row!);
      },
      async findById(id) {
        const row = await queryOne("SELECT * FROM reports WHERE id = $1", [id]);
        return row ? toReport(row) : null;
      },
      async findByRequestId(analysisRequestId) {
        const row = await queryOne(
          `SELECT * FROM reports WHERE analysis_request_id = $1
           ORDER BY generated_at DESC LIMIT 1`,
          [analysisRequestId],
        );
        return row ? toReport(row) : null;
      },
      async listByOwner(ownerId, limit = 50) {
        const rows = await query(
          "SELECT * FROM reports WHERE owner_id = $1 ORDER BY generated_at DESC LIMIT $2",
          [ownerId, limit],
        );
        return rows.map(toReport);
      },
      async countByTemplateVersion(templateVersionId) {
        const row = await queryOne<{ count: string }>(
          "SELECT COUNT(*)::text AS count FROM reports WHERE template_version_id = $1",
          [templateVersionId],
        );
        return Number(row?.count ?? 0);
      },
    },

    jobs: {
      async create(input) {
        const row = await queryOne(
          `INSERT INTO jobs (analysis_request_id, type, status, payload, max_attempts)
           VALUES ($1,$2,'QUEUED',$3::jsonb,$4) RETURNING *`,
          [
            input.analysisRequestId,
            input.type,
            JSON.stringify(input.payload),
            input.maxAttempts ?? 1,
          ],
        );
        return toJob(row!);
      },
      async findById(id) {
        const row = await queryOne("SELECT * FROM jobs WHERE id = $1", [id]);
        return row ? toJob(row) : null;
      },
      async findLatestByRequest(analysisRequestId) {
        const row = await queryOne(
          "SELECT * FROM jobs WHERE analysis_request_id = $1 ORDER BY scheduled_at DESC LIMIT 1",
          [analysisRequestId],
        );
        return row ? toJob(row) : null;
      },
      async claimNext() {
        // SKIP LOCKED lets several workers share the queue without contention.
        const row = await queryOne(
          `UPDATE jobs SET status = 'RUNNING', attempts = attempts + 1, started_at = now()
           WHERE id = (
             SELECT id FROM jobs WHERE status = 'QUEUED'
             ORDER BY scheduled_at FOR UPDATE SKIP LOCKED LIMIT 1
           )
           RETURNING *`,
        );
        return row ? toJob(row) : null;
      },
      async update(id, changes) {
        const row = await queryOne(
          `UPDATE jobs SET
             status = COALESCE($2, status),
             error = CASE WHEN $4::boolean THEN $3::jsonb ELSE error END,
             started_at = COALESCE($5, started_at),
             finished_at = COALESCE($6, finished_at),
             attempts = COALESCE($7, attempts)
           WHERE id = $1 RETURNING *`,
          [
            id,
            changes.status ?? null,
            changes.error ? JSON.stringify(changes.error) : null,
            Object.prototype.hasOwnProperty.call(changes, "error"),
            changes.startedAt ?? null,
            changes.finishedAt ?? null,
            changes.attempts ?? null,
          ],
        );
        if (!row) throw new Error(`Job ${id} not found`);
        return toJob(row);
      },
      async cancelForRequest(analysisRequestId) {
        await query(
          `UPDATE jobs SET status = 'CANCELLED', finished_at = now()
           WHERE analysis_request_id = $1 AND status = 'QUEUED'`,
          [analysisRequestId],
        );
      },
    },

    auditLogs: {
      async record(input) {
        await query(
          `INSERT INTO audit_logs (actor_id, action, entity_type, entity_id, metadata, ip_hash)
           VALUES ($1,$2,$3,$4,$5::jsonb,$6)`,
          [
            input.actorId,
            input.action,
            input.entityType,
            input.entityId,
            JSON.stringify(input.metadata ?? {}),
            input.ipHash ?? null,
          ],
        );
      },
      async listRecent(actorId, limit) {
        const rows = await query(
          "SELECT * FROM audit_logs WHERE actor_id = $1 ORDER BY created_at DESC LIMIT $2",
          [actorId, limit],
        );
        return rows.map(toAuditLogEntry);
      },
    },
  };
}
