import "server-only";
import type { Repositories } from "@/server/repositories";
import type { DashboardSummary } from "@/types";
import { createAuditService } from "./auditService";

/** Aggregates the dashboard figures for one user. */
export function createDashboardService(repositories: Repositories) {
  const audit = createAuditService(repositories);

  return {
    async summary(ownerId: string): Promise<DashboardSummary> {
      const [
        totalAnalyses,
        completedAnalyses,
        failedAnalyses,
        templateCount,
        reportCount,
        averageProcessingMs,
        recentRequests,
        recentReports,
        mostUsedTemplates,
        recentActivity,
      ] = await Promise.all([
        repositories.analysisRequests.countByOwner(ownerId),
        repositories.analysisRequests.countByOwnerAndStatus(ownerId, "COMPLETED"),
        repositories.analysisRequests.countByOwnerAndStatus(ownerId, "FAILED"),
        repositories.templates.countByOwner(ownerId),
        repositories.reports.countByOwner(ownerId),
        repositories.analysisResults.averageProcessingMs(ownerId),
        repositories.analysisRequests.listByOwner(ownerId, 8),
        repositories.reports.listByOwner(ownerId, 6),
        repositories.templates.mostUsed(ownerId, 5),
        audit.listRecent(ownerId, 12),
      ]);

      return {
        totalAnalyses,
        completedAnalyses,
        failedAnalyses,
        templateCount,
        reportCount,
        averageProcessingMs,
        recentRequests,
        recentReports,
        mostUsedTemplates,
        recentActivity,
      };
    },
  };
}

export type DashboardService = ReturnType<typeof createDashboardService>;
