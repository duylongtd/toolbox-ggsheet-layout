import { FileBarChart } from "lucide-react";
import Link from "next/link";
import { PageHeader } from "@/components/layout/PageHeader";
import { Card } from "@/components/ui/Card";
import { DataTable } from "@/components/ui/DataTable";
import { EmptyState } from "@/components/ui/EmptyState";
import { formatBytes, formatDateTime } from "@/lib/format";
import { getRepositories } from "@/server/infrastructure/database";
import { createReportService } from "@/server/services/reportService";
import { requireUser } from "@/server/session";

export const dynamic = "force-dynamic";

export default async function ReportsPage() {
  const user = await requireUser();
  const reports = await createReportService(getRepositories()).list(user.id);

  return (
    <>
      <PageHeader title="Reports" description="Every PDF report produced from your analyses." />
      <Card>
        {reports.length === 0 ? (
          <EmptyState
            icon={<FileBarChart className="h-5 w-5" aria-hidden />}
            title="No report yet"
            description="Run an analysis to produce the first PDF report."
          />
        ) : (
          <DataTable
            rows={reports}
            columns={[
              {
                key: "title",
                header: "Report",
                render: (row) => (
                  <Link
                    href={`/reports/${row.id}`}
                    className="font-medium text-blue-700 hover:underline"
                  >
                    {row.title}
                  </Link>
                ),
              },
              {
                key: "generated",
                header: "Generated",
                render: (row) => formatDateTime(row.generatedAt),
              },
              {
                key: "size",
                header: "Size",
                align: "right",
                render: (row) => formatBytes(row.sizeBytes),
              },
              {
                key: "download",
                header: "",
                render: (row) => (
                  <Link
                    href={`/api/reports/${row.id}/download`}
                    className="text-sm font-medium text-blue-700 hover:underline"
                  >
                    Download
                  </Link>
                ),
              },
            ]}
          />
        )}
      </Card>
    </>
  );
}
