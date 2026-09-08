import { AlertTriangle, Info, XCircle } from "lucide-react";
import { Card } from "@/components/ui/Card";
import { toDisplayText } from "@/lib/security/text";
import type { Dataset } from "@/types";

const ISSUE_ICONS = {
  info: <Info className="h-4 w-4 text-blue-700" aria-hidden />,
  warning: <AlertTriangle className="h-4 w-4 text-amber-700" aria-hidden />,
  error: <XCircle className="h-4 w-4 text-red-700" aria-hidden />,
};

/**
 * Dataset preview.
 *
 * Cell values come from an untrusted file. They are rendered as React text
 * nodes, so markup inside a cell is displayed literally and never interpreted.
 */
export function DatasetPreview({ dataset }: { dataset: Dataset }) {
  const previewColumns = dataset.columns.slice(0, 12);

  return (
    <div className="space-y-4">
      <Card title="Step 3: Data preview" description={dataset.sourceName}>
        <dl className="grid grid-cols-2 gap-3 sm:grid-cols-4">
          <Metric label="Rows" value={dataset.rowCount.toLocaleString("en-US")} />
          <Metric label="Columns" value={String(dataset.columnCount)} />
          <Metric label="Source" value={sourceLabel(dataset.sourceType)} />
          <Metric label="Data issues" value={String(dataset.issues.length)} />
        </dl>

        <div className="mt-5 overflow-x-auto">
          <table className="app-table">
            <caption className="sr-only">First rows of the uploaded data</caption>
            <thead>
              <tr>
                {previewColumns.map((column) => (
                  <th key={column.key}>
                    <span className="block">{toDisplayText(column.name, 40)}</span>
                    <span className="mt-0.5 block text-[10px] font-normal normal-case text-slate-400">
                      {column.inferredType}
                    </span>
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {dataset.sampleRows.slice(0, 8).map((row, index) => (
                <tr key={index}>
                  {previewColumns.map((column) => (
                    <td key={column.key}>{toDisplayText(row[column.key], 80)}</td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {dataset.columns.length > previewColumns.length && (
          <p className="mt-2 text-xs text-slate-500">
            Showing the first {previewColumns.length} of {dataset.columns.length} columns.
          </p>
        )}
      </Card>

      {dataset.issues.length > 0 && (
        <Card title="Data quality findings">
          <ul className="space-y-2">
            {dataset.issues.map((issue, index) => (
              <li key={index} className="flex items-start gap-2 text-sm text-slate-700">
                {ISSUE_ICONS[issue.severity]}
                <span>{issue.message}</span>
              </li>
            ))}
          </ul>
        </Card>
      )}
    </div>
  );
}

function Metric({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-lg bg-slate-50 px-3 py-2">
      <dt className="text-xs font-medium uppercase tracking-wide text-slate-500">{label}</dt>
      <dd className="mt-1 text-lg font-semibold text-slate-900">{value}</dd>
    </div>
  );
}

function sourceLabel(sourceType: string): string {
  const labels: Record<string, string> = {
    excel: "Excel file",
    csv: "CSV file",
    google_sheets: "Google Sheets",
  };
  return labels[sourceType] ?? sourceType;
}
