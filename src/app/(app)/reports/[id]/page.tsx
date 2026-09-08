import { Download } from "lucide-react";
import Link from "next/link";
import { PageHeader } from "@/components/layout/PageHeader";
import { Card } from "@/components/ui/Card";
import { formatBytes, formatDateTime } from "@/lib/format";
import { getRepositories } from "@/server/infrastructure/database";
import { createReportService } from "@/server/services/reportService";
import { requireUser } from "@/server/session";

export const dynamic = "force-dynamic";

export default async function ReportDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const user = await requireUser();
  const { id } = await params;
  const { report, template, templateVersion, request } = await createReportService(
    getRepositories(),
  ).detail(id, user.id);

  return (
    <>
      <PageHeader
        title={report.title}
        description="Report metadata and the configuration it was produced with."
        actions={
          <Link
            href={`/api/reports/${report.id}/download`}
            className="inline-flex items-center gap-2 rounded-lg bg-blue-700 px-4 py-2 text-sm font-medium text-white hover:bg-blue-800"
          >
            <Download className="h-4 w-4" aria-hidden />
            Download PDF
          </Link>
        }
      />

      <Card title="Reproducibility">
        <dl className="grid gap-3 sm:grid-cols-2">
          <Fact label="Generated" value={formatDateTime(report.generatedAt)} />
          <Fact label="File size" value={formatBytes(report.sizeBytes)} />
          <Fact label="Template" value={template?.name ?? "No template"} />
          <Fact
            label="Template version"
            value={templateVersion ? String(templateVersion.version) : "-"}
          />
          <Fact label="Report format" value={report.reportVersion} />
          <Fact label="Analysis engine" value={request?.engineVersion || "-"} />
          <Fact label="Data source" value={request?.sourceName ?? "-"} />
          <Fact
            label="Retention until"
            value={formatDateTime(report.retentionExpiresAt)}
          />
        </dl>
        {request && (
          <p className="mt-4 text-sm">
            <Link
              href={`/analysis/${request.id}`}
              className="font-medium text-blue-700 hover:underline"
            >
              Open the analysis that produced this report
            </Link>
          </p>
        )}
      </Card>
    </>
  );
}

function Fact({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-lg bg-slate-50 px-3 py-2">
      <dt className="text-xs font-medium uppercase tracking-wide text-slate-500">{label}</dt>
      <dd className="mt-1 text-sm font-semibold text-slate-900">{value}</dd>
    </div>
  );
}
