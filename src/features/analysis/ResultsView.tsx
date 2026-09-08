import { AlertTriangle, Download, Sparkles } from "lucide-react";
import Link from "next/link";
import { Alert } from "@/components/ui/Alert";
import { Card } from "@/components/ui/Card";
import { DataTable } from "@/components/ui/DataTable";
import { formatDuration, formatNumber } from "@/lib/format";
import { toDisplayText } from "@/lib/security/text";
import type { AIAnalysis, AnalysisResult, Chart, Report } from "@/types";

interface AISection {
  type: string;
  text: string;
}

const AI_SECTION_TITLES: Array<[string, string]> = [
  ["keyFindings", "Key findings"],
  ["positiveTrends", "Positive trends"],
  ["negativeTrends", "Negative trends"],
  ["anomalies", "Anomalies"],
  ["comparisons", "Important comparisons"],
  ["recommendations", "Recommendations"],
  ["limitations", "Limitations"],
];

/** Computed results, charts, AI interpretation and the report download. */
export function ResultsView({
  result,
  charts,
  ai,
  report,
  analysisRequestId,
}: {
  result: AnalysisResult | null;
  charts: Chart[];
  ai: AIAnalysis | null;
  report: Report | null;
  analysisRequestId: string;
}) {
  if (!result) {
    return (
      <Card title="Results">
        <p className="py-6 text-center text-sm text-slate-500">
          There are no results yet. Run the analysis to produce them.
        </p>
      </Card>
    );
  }

  const metrics = result.metrics as Array<Record<string, unknown>>;
  const statistics = result.statistics as Array<Record<string, unknown>>;
  const warnings = result.warnings as Array<Record<string, unknown>>;

  return (
    <div className="space-y-6">
      {report && (
        <Card title="Report">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <p className="text-sm text-slate-600">
              The PDF report is ready and includes every metric, chart and warning shown below.
            </p>
            <div className="flex gap-2">
              <Link
                href={`/api/reports/${report.id}/download`}
                className="inline-flex items-center gap-2 rounded-lg bg-blue-700 px-4 py-2 text-sm font-medium text-white hover:bg-blue-800"
              >
                <Download className="h-4 w-4" aria-hidden />
                Download PDF
              </Link>
              <Link
                href={`/reports/${report.id}`}
                className="inline-flex items-center rounded-lg border border-slate-300 px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50"
              >
                Report details
              </Link>
            </div>
          </div>
        </Card>
      )}

      {metrics.length > 0 && (
        <Card title="Key metrics">
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
            {metrics.map((metric, index) => (
              <div key={index} className="rounded-lg border border-slate-200 px-4 py-3">
                <p className="text-xs font-medium uppercase tracking-wide text-slate-500">
                  {toDisplayText(metric.label, 60)}
                </p>
                <p className="mt-1 text-xl font-semibold text-slate-900">
                  {formatNumber(metric.value)}
                  {metric.unit ? String(metric.unit) : ""}
                </p>
              </div>
            ))}
          </div>
        </Card>
      )}

      {statistics.length > 0 && (
        <Card title="Statistical analysis">
          <DataTable
            rows={statistics}
            columns={[
              {
                key: "label",
                header: "Column",
                render: (row) => toDisplayText(row.label, 60),
              },
              { key: "validCount", header: "Valid", align: "right", render: (row) => formatNumber(row.validCount) },
              { key: "missingCount", header: "Missing", align: "right", render: (row) => formatNumber(row.missingCount) },
              { key: "sum", header: "Sum", align: "right", render: (row) => formatNumber(row.sum) },
              { key: "mean", header: "Mean", align: "right", render: (row) => formatNumber(row.mean) },
              { key: "median", header: "Median", align: "right", render: (row) => formatNumber(row.median) },
              { key: "min", header: "Min", align: "right", render: (row) => formatNumber(row.min) },
              { key: "max", header: "Max", align: "right", render: (row) => formatNumber(row.max) },
              { key: "stdDev", header: "Std dev", align: "right", render: (row) => formatNumber(row.stdDev) },
            ]}
          />
        </Card>
      )}

      {charts.length > 0 && (
        <Card title="Charts">
          <div className="grid gap-5 lg:grid-cols-2">
            {charts.map((chart) => (
              <figure key={chart.id} className="rounded-lg border border-slate-200 p-3">
                {/* Chart images are streamed from storage after an ownership check. */}
                <img
                  src={`/api/analysis-requests/${analysisRequestId}/charts/${encodeURIComponent(chart.chartKey)}`}
                  alt={toDisplayText(chart.title, 120)}
                  className="w-full rounded"
                  loading="lazy"
                />
                <figcaption className="mt-2 text-sm text-slate-600">
                  {toDisplayText(chart.title, 120)}
                </figcaption>
              </figure>
            ))}
          </div>
        </Card>
      )}

      <AIPanel ai={ai} />

      {warnings.length > 0 && (
        <Card title="Data quality warnings">
          <ul className="space-y-2">
            {warnings.map((warning, index) => (
              <li key={index} className="flex items-start gap-2 text-sm text-slate-700">
                <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0 text-amber-600" aria-hidden />
                <span>{toDisplayText(warning.message, 300)}</span>
              </li>
            ))}
          </ul>
        </Card>
      )}

      <Card title="Processing time">
        <ul className="grid grid-cols-2 gap-2 sm:grid-cols-4">
          {Object.entries(result.timings).map(([stage, value]) => (
            <li key={stage} className="rounded-lg bg-slate-50 px-3 py-2">
              <p className="text-xs text-slate-500">{stage.replace(/Ms$/, "")}</p>
              <p className="text-sm font-medium text-slate-800">{formatDuration(value)}</p>
            </li>
          ))}
        </ul>
      </Card>
    </div>
  );
}

/**
 * AI panel.
 *
 * A skipped or failed interpretation is stated plainly. The computed numbers are
 * unaffected either way, and any number the model wrote that does not match a
 * computed value is flagged rather than presented as fact.
 */
function AIPanel({ ai }: { ai: AIAnalysis | null }) {
  if (!ai || ai.status !== "SUCCEEDED") {
    return (
      <Card title="AI interpretation">
        <Alert level="warning" title="AI analysis unavailable">
          <p>{ai?.error?.message ?? "No AI provider is configured for this environment."}</p>
          <p className="mt-2">
            Every figure in this analysis was calculated by the statistical engine and is
            unaffected.
          </p>
        </Alert>
      </Card>
    );
  }

  const sections = ai.sections as Record<string, unknown>;
  const summary = typeof sections.executiveSummary === "string" ? sections.executiveSummary : "";

  return (
    <Card
      title="AI interpretation"
      description={`Provider ${ai.provider}, model ${ai.model || "not specified"}`}
    >
      {ai.unverifiedNumbers.length > 0 && (
        <Alert level="warning" title="Some numbers could not be traced" className="mb-4">
          The statements below contain figures that do not match any computed value. Treat them as
          unverified.
        </Alert>
      )}

      {summary && (
        <div className="mb-4">
          <h3 className="mb-1 flex items-center gap-2 text-sm font-semibold text-slate-900">
            <Sparkles className="h-4 w-4 text-blue-700" aria-hidden />
            Executive summary
          </h3>
          <p className="text-sm leading-relaxed text-slate-700">{toDisplayText(summary, 2000)}</p>
        </div>
      )}

      <div className="space-y-4">
        {AI_SECTION_TITLES.map(([key, title]) => {
          const items = (sections[key] as AISection[] | undefined) ?? [];
          if (items.length === 0) return null;
          return (
            <div key={key}>
              <h3 className="mb-1.5 text-sm font-semibold text-slate-900">{title}</h3>
              <ul className="space-y-1.5">
                {items.map((item, index) => (
                  <li key={index} className="flex items-start gap-2 text-sm text-slate-700">
                    <span className="mt-0.5 shrink-0 rounded bg-slate-100 px-1.5 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-slate-600">
                      {item.type}
                    </span>
                    <span>{toDisplayText(item.text, 1000)}</span>
                  </li>
                ))}
              </ul>
            </div>
          );
        })}
      </div>
    </Card>
  );
}
