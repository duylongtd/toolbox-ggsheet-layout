import Link from "next/link";
import { LogoMark } from "@/components/brand/Logo";
import { formatBytes } from "@/lib/format";
import { num } from "@/lib/format/vi";
import { getRepositories } from "@/server/infrastructure/database";
import { createReportService } from "@/server/services/reportService";
import { requireUser } from "@/server/session";

export const dynamic = "force-dynamic";

/** Reports are dated in Vietnamese, the way the reader writes a date. */
function formatDate(value: string): string {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "-";
  return date.toLocaleString("vi-VN", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

export default async function ReportsPage() {
  const user = await requireUser();
  const reports = await createReportService(getRepositories()).list(user.id);

  return (
    <div className="animate-fade-up">
      <h1 className="text-2xl font-semibold tracking-tight text-ink">Báo cáo đã làm</h1>
      <p className="mt-1.5 text-ink-muted">
        Bấm vào một báo cáo để xem trước rồi tải về.
      </p>

      {reports.length === 0 ? (
        <div className="app-card mt-6 flex flex-col items-center gap-4 px-6 py-16 text-center">
          <LogoMark className="h-12 w-12 opacity-25" />
          <div>
            <p className="font-medium text-ink">Chưa có báo cáo nào</p>
            <p className="mt-1 text-sm text-ink-muted">
              Tải một bảng số liệu lên để làm báo cáo đầu tiên.
            </p>
          </div>
          <Link
            href="/"
            className="rounded-lg bg-brand-600 px-5 py-2.5 text-sm font-medium text-white transition-colors hover:bg-brand-700"
          >
            Làm báo cáo
          </Link>
        </div>
      ) : (
        <ul className="mt-6 space-y-3">
          {reports.map((report, index) => (
            <li
              key={report.id}
              className="animate-fade-up"
              style={{ animationDelay: `${Math.min(index, 8) * 40}ms` }}
            >
              <Link
                href={`/reports/${report.id}`}
                className="app-card flex items-center gap-4 px-5 py-4 transition-colors hover:border-brand-300 hover:bg-brand-50/40"
              >
                <span className="flex h-11 w-9 shrink-0 flex-col justify-end gap-1 rounded border border-[#dfe6e2] bg-[#f6f8f7] p-1.5">
                  <span className="h-1 rounded-sm bg-brand-200" />
                  <span className="h-1 rounded-sm bg-brand-400" />
                  <span className="h-1 rounded-sm bg-brand-600" />
                </span>
                <span className="min-w-0 flex-1">
                  <span className="block truncate font-medium text-ink">{report.title}</span>
                  <span className="mt-0.5 block text-sm text-ink-muted">
                    {formatDate(report.generatedAt)} · {formatBytes(report.sizeBytes)}
                  </span>
                </span>
                <span className="hidden text-sm font-medium text-brand-700 sm:block">Xem</span>
              </Link>
            </li>
          ))}
        </ul>
      )}

      {reports.length > 0 && (
        <p className="mt-4 text-sm text-ink-subtle">{num(reports.length)} báo cáo</p>
      )}
    </div>
  );
}
