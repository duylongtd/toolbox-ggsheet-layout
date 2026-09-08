"use client";

import { BarChart3 } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { T } from "@/lib/format/vi";
import { toDisplayText } from "@/lib/security/text";
import type { Chart, TemplateDefinition } from "@/types";

const CHART_LABELS: Record<string, string> = {
  bar: "Cột đứng",
  horizontal_bar: "Cột ngang",
  line: "Đường",
  pie: "Tròn",
  area: "Miền",
  histogram: "Phân bố",
  scatter: "Phân tán",
};

interface DefinedChart {
  id: string;
  type: string;
  title: string;
  disabled?: boolean;
}

/**
 * Chart chooser with the real picture next to each choice.
 *
 * A person deciding whether to keep a chart should be looking at that chart,
 * not at its name, so each row shows the rendered image from the last run.
 */
export function ChartControls({
  definition,
  charts,
  analysisRequestId,
  pending,
  onToggle,
  onChangeType,
  onApply,
  dirty,
}: {
  definition: TemplateDefinition;
  charts: Chart[];
  analysisRequestId: string;
  pending: boolean;
  onToggle: (chartId: string, enabled: boolean) => void;
  onChangeType: (chartId: string, chartType: string) => void;
  onApply: () => void;
  dirty: boolean;
}) {
  const defined = (definition.charts ?? []) as unknown as DefinedChart[];
  if (defined.length === 0) return null;

  const rendered = new Map(charts.map((chart) => [chart.chartKey, chart]));

  return (
    <section className="app-card">
      <header className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-200 px-5 py-4">
        <div className="flex items-center gap-2">
          <BarChart3 className="h-4 w-4 text-blue-700" aria-hidden />
          <div>
            <h2 className="text-base font-semibold text-slate-900">{T.chartsTitle}</h2>
            <p className="text-sm text-slate-500">{T.chartsNote}</p>
          </div>
        </div>
        {dirty && (
          <Button onClick={onApply} loading={pending} size="sm">
            {T.applyCharts}
          </Button>
        )}
      </header>

      <ul className="divide-y divide-slate-100">
        {defined.map((chart) => {
          const image = rendered.get(chart.id);
          const enabled = !chart.disabled;
          return (
            <li key={chart.id} className="flex flex-col gap-3 px-5 py-4 sm:flex-row sm:items-start">
              <label className="flex flex-1 cursor-pointer items-start gap-3">
                <input
                  type="checkbox"
                  checked={enabled}
                  onChange={(event) => onToggle(chart.id, event.target.checked)}
                  className="mt-1 h-4 w-4"
                />
                <span className="min-w-0">
                  <span className="block text-sm font-medium text-slate-900">
                    {toDisplayText(chart.title, 80)}
                  </span>
                  <select
                    value={chart.type}
                    onChange={(event) => onChangeType(chart.id, event.target.value)}
                    disabled={!enabled}
                    className="mt-2 rounded-lg border border-slate-300 bg-white px-2 py-1 text-sm disabled:bg-slate-100"
                    aria-label="Kiểu biểu đồ"
                  >
                    {Object.entries(CHART_LABELS).map(([value, label]) => (
                      <option key={value} value={value}>
                        {label}
                      </option>
                    ))}
                  </select>
                </span>
              </label>

              <div className={`w-full sm:w-72 ${enabled ? "" : "opacity-40 grayscale"}`}>
                {image ? (
                  /* Streamed from storage after an ownership check. */
                  <img
                    src={`/api/analysis-requests/${analysisRequestId}/charts/${encodeURIComponent(image.chartKey)}`}
                    alt={toDisplayText(chart.title, 120)}
                    className="w-full rounded-lg border border-slate-200"
                    loading="lazy"
                  />
                ) : (
                  <div className="flex h-24 items-center justify-center rounded-lg border border-dashed border-slate-300 text-xs text-slate-400">
                    Sẽ hiện sau khi cập nhật
                  </div>
                )}
              </div>
            </li>
          );
        })}
      </ul>
    </section>
  );
}
