import "server-only";
import type { Repositories } from "@/server/repositories";
import { logger } from "@/server/infrastructure/logging/logger";

/**
 * Audit recording.
 *
 * Audit failures must never break the user action, so recording is best effort
 * and logged when it fails. Metadata is restricted to identifiers and counts:
 * dataset values never enter the audit trail.
 */
export const AuditActions = {
  USER_LOGIN: "user.login",
  USER_LOGOUT: "user.logout",
  ANALYSIS_CREATED: "analysis.created",
  ANALYSIS_VALIDATED: "analysis.validated",
  ANALYSIS_RESOLVED: "analysis.resolved",
  ANALYSIS_STARTED: "analysis.started",
  ANALYSIS_COMPLETED: "analysis.completed",
  ANALYSIS_FAILED: "analysis.failed",
  ANALYSIS_CANCELLED: "analysis.cancelled",
  TEMPLATE_CREATED: "template.created",
  TEMPLATE_UPDATED: "template.updated",
  TEMPLATE_VERSION_CREATED: "template.version.created",
  TEMPLATE_USED: "template.used",
  TEMPLATE_ARCHIVED: "template.archived",
  TEMPLATE_DUPLICATED: "template.duplicated",
  REPORT_CREATED: "report.created",
  REPORT_DOWNLOADED: "report.downloaded",
} as const;

export type AuditAction = (typeof AuditActions)[keyof typeof AuditActions];

export function createAuditService(repositories: Repositories) {
  return {
    async record(input: {
      actorId: string | null;
      action: AuditAction;
      entityType: string;
      entityId: string | null;
      metadata?: Record<string, unknown>;
      ipHash?: string | null;
    }): Promise<void> {
      try {
        await repositories.auditLogs.record(input);
      } catch (error) {
        logger.warn("Audit entry could not be recorded", {
          action: input.action,
          errorType: error instanceof Error ? error.name : "Unknown",
        });
      }
    },

    listRecent(actorId: string, limit = 20) {
      return repositories.auditLogs.listRecent(actorId, limit);
    },
  };
}

export type AuditService = ReturnType<typeof createAuditService>;
