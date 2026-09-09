"use client";

import { Select } from "@/components/ui/Select";
import { toDisplayText } from "@/lib/security/text";
import type { Chart, TemplateDefinition } from "@/types";

const CHART_OPTIONS = [
  { value: "horizontal_bar", label: "Cột ngang" },
  { value: "bar", label: "Cột đứng" },
  { value: "pie", label: "Hình tròn" },
  { value: "line", label: "Đường" },
  { value: "area", label: "Miền" },
  { value: "histogram", label: "Phân bố" },
  { value: "scatter", label: "Phân tán" },
];

interface DefinedChart {
  id: string;
  type: string;
  title: string;
  disabled?: boolean;
}

/**
 * Choosing which charts belong in the report.
 *
 * Every change redraws the report straight away. Asking someone to change a
 * setting and then find a separate button to apply it leaves the picture
 * disagreeing with the control that describes it, which is exactly what looked
 * broken before: the type said one thing and the image showed another.
 */
export function ChartControls({
  definition,
  charts,
  analysisRequestId,
  busyChartId,
  onToggle,
  onChangeType,
}: {
  definition: TemplateDefinition;
  charts: Chart[];
  analysisRequestId: string;
  busyChartId: string | null;
  onToggle: (chartId: string, enabled: boolean) => void;
  onChangeType: (chartId: string, chartType: string) => void;
}) {
  const defined = (definition.charts ?? []) as unknown as DefinedChart[];
  if (defined.length === 0) return null;

  const rendered = new Map(charts.map((chart) => [chart.chartKey, chart]));

  return (
    <section className="app-card overflow-hidden">
      <header className="border-b border-[#dfe6e2] px-5 py-4">
        <h2 className="font-semibold text-ink">Biểu đồ trong báo cáo</h2>
        <p className="mt-1 text-sm text-ink-muted">
          Bỏ chọn biểu đồ không cần, hoặc đổi kiểu. Báo cáo cập nhật ngay.
        </p>
      </header>

      <ul className="divide-y divide-[#eef1ef]">
        {defined.map((chart) => {
          const image = rendered.get(chart.id);
          const enabled = !chart.disabled;
          const busy = busyChartId === chart.id;

          return (
            <li key={chart.id} className="grid gap-4 px-5 py-4 sm:grid-cols-[1fr_15rem] sm:items-center">
              <div className="min-w-0">
                <label className="flex cursor-pointer items-start gap-3">
                  <input
                    type="checkbox"
                    checked={enabled}
                    disabled={busy}
                    onChange={(event) => onToggle(chart.id, event.target.checked)}
                    className="mt-0.5 h-[18px] w-[18px] shrink-0 accent-[#0f9d58]"
                  />
                  <span className="text-[15px] font-medium leading-snug text-ink">
                    {toDisplayText(chart.title, 90)}
                  </span>
                </label>

                <div className="mt-3 max-w-[13rem] pl-[30px]">
                  <Select
                    label="Kiểu biểu đồ"
                    value={chart.type}
                    options={CHART_OPTIONS}
                    disabled={!enabled || busy}
                    onChange={(next) => onChangeType(chart.id, next)}
                  />
                </div>
              </div>

              <div
                className={`relative overflow-hidden rounded-lg border border-[#dfe6e2] bg-white transition-opacity ${
                  enabled ? "" : "opacity-35 grayscale"
                }`}
              >
                {image ? (
                  /*
                   * Streamed from storage after an ownership check. The chart
                   * row is recreated on every run, so its id in the address
                   * changes whenever the picture does. Without it the cached
                   * response outlived the drawing it held.
                   */
                  <img
                    src={`/api/analysis-requests/${analysisRequestId}/charts/${encodeURIComponent(image.chartKey)}?v=${image.id}`}
                    alt={toDisplayText(chart.title, 120)}
                    className="w-full"
                  />
                ) : (
                  <div className="flex h-28 items-center justify-center text-xs text-ink-subtle">
                    Sẽ hiện sau khi cập nhật
                  </div>
                )}

                {busy && (
                  <div className="absolute inset-0 flex items-center justify-center bg-white/80">
                    <span className="flex items-center gap-2 text-xs font-medium text-brand-700">
                      <span
                        aria-hidden
                        className="h-3.5 w-3.5 animate-spin rounded-full border-2 border-brand-600 border-t-transparent"
                      />
                      Đang vẽ lại
                    </span>
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
