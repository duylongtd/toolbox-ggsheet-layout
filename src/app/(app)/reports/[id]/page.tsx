import Link from "next/link";
import { ReportViewer } from "@/features/workspace/ReportViewer";
import { formatBytes } from "@/lib/format";
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
  const { report, request } = await createReportService(getRepositories()).detail(id, user.id);

  const generated = new Date(report.generatedAt).toLocaleString("vi-VN", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });

  return (
    <div className="animate-fade-up space-y-5">
      <div>
        <Link
          href="/reports"
          className="text-sm font-medium text-brand-700 transition-colors hover:text-brand-800"
        >
          Quay lại danh sách
        </Link>
        <h1 className="mt-2 text-2xl font-semibold tracking-tight text-ink">{report.title}</h1>
        <p className="mt-1 text-sm text-ink-muted">
          Lập lúc {generated} · {formatBytes(report.sizeBytes)}
          {request?.sourceName ? ` · Nguồn: ${request.sourceName}` : ""}
        </p>
      </div>

      <ReportViewer reportId={report.id} title={report.title} />
    </div>
  );
}
