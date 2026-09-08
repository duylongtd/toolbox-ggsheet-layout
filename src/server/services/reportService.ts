import "server-only";
import { getStorageProvider } from "@/server/infrastructure/storage";
import type { Repositories } from "@/server/repositories";
import { forbidden, notFound } from "@/server/http/errors";
import { AuditActions, createAuditService } from "./auditService";

/** Report listing and download. Ownership is checked before any read. */
export function createReportService(repositories: Repositories) {
  const storage = getStorageProvider();
  const audit = createAuditService(repositories);

  return {
    list(ownerId: string, limit = 50) {
      return repositories.reports.listByOwner(ownerId, limit);
    },

    async detail(reportId: string, ownerId: string) {
      const report = await repositories.reports.findById(reportId);
      if (!report) throw notFound("This report no longer exists.");
      if (report.ownerId !== ownerId) throw forbidden("You do not have access to this report.");

      const [template, templateVersion, request] = await Promise.all([
        report.templateId ? repositories.templates.findById(report.templateId) : null,
        report.templateVersionId
          ? repositories.templateVersions.findById(report.templateVersionId)
          : null,
        repositories.analysisRequests.findById(report.analysisRequestId),
      ]);
      return { report, template, templateVersion, request };
    },

    async download(reportId: string, ownerId: string) {
      const report = await repositories.reports.findById(reportId);
      if (!report) throw notFound("This report no longer exists.");
      if (report.ownerId !== ownerId) throw forbidden("You do not have access to this report.");

      const content = await storage.get(report.storageKey);
      await audit.record({
        actorId: ownerId,
        action: AuditActions.REPORT_DOWNLOADED,
        entityType: "report",
        entityId: report.id,
        metadata: { sizeBytes: report.sizeBytes },
      });
      return { report, content };
    },

    /** Streams a chart image belonging to an analysis the caller owns. */
    async chartImage(analysisRequestId: string, chartKey: string, ownerId: string) {
      const request = await repositories.analysisRequests.findById(analysisRequestId);
      if (!request) throw notFound("This analysis no longer exists.");
      if (request.ownerId !== ownerId) throw forbidden("You do not have access to this analysis.");

      const charts = await repositories.charts.listByRequest(analysisRequestId);
      const chart = charts.find((item) => item.chartKey === chartKey);
      if (!chart) throw notFound("This chart no longer exists.");

      return { chart, content: await storage.get(chart.storageKey) };
    },
  };
}

export type ReportService = ReturnType<typeof createReportService>;
