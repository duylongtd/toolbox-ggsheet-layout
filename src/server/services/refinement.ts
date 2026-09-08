import "server-only";
import type { TemplateDefinition } from "@/types";
import { validationFailed } from "@/server/http/errors";

/**
 * The closed set of changes a report can undergo after it has been produced.
 *
 * Both the chart controls and the free text box funnel into this list. Nothing
 * outside it can alter a configuration, which is what keeps a typed instruction
 * from reaching the analysis engine as anything other than one of these
 * operations.
 */

export const CHART_TYPES = [
  "bar",
  "horizontal_bar",
  "line",
  "pie",
  "area",
  "histogram",
  "scatter",
] as const;

export type ChartType = (typeof CHART_TYPES)[number];

export type Operation =
  | { type: "SET_CHART_ENABLED"; chartId: string; enabled: boolean }
  | { type: "SET_CHART_TYPE"; chartId: string; chartType: ChartType }
  | { type: "ADD_CHART"; chartType: ChartType; column?: string }
  | { type: "REMOVE_ALL_CHARTS" }
  | { type: "SET_REPORT_TITLE"; title: string }
  | { type: "SET_REPORT_PERIOD"; period: string }
  | { type: "SET_AI_ENABLED"; enabled: boolean }
  | { type: "SET_GROUP_BY"; column: string }
  | { type: "REMOVE_METRIC"; column: string }
  | { type: "ADD_METRIC"; column: string; aggregation: "sum" | "mean" };

export interface ApplyResult {
  definition: TemplateDefinition;
  applied: Operation[];
  /** What the user is told was done, in their own language. */
  messages: string[];
}

interface ChartEntry {
  id: string;
  type: string;
  title: string;
  x: string | null;
  y: string | null;
  disabled?: boolean;
  [key: string]: unknown;
}

const MAX_TITLE_LENGTH = 200;

/**
 * Applies operations to a definition without mutating the original.
 *
 * An operation that cannot apply is skipped and reported, never guessed at.
 */
export function applyOperations(
  definition: TemplateDefinition,
  operations: Operation[],
): ApplyResult {
  const next: TemplateDefinition = JSON.parse(JSON.stringify(definition));
  const charts = (next.charts ?? []) as unknown as ChartEntry[];
  const applied: Operation[] = [];
  const messages: string[] = [];

  for (const operation of operations) {
    switch (operation.type) {
      case "SET_CHART_ENABLED": {
        const chart = charts.find((item) => item.id === operation.chartId);
        if (!chart) break;
        chart.disabled = !operation.enabled;
        applied.push(operation);
        messages.push(
          operation.enabled
            ? `Đã bật lại biểu đồ "${chart.title}".`
            : `Đã bỏ biểu đồ "${chart.title}".`,
        );
        break;
      }

      case "SET_CHART_TYPE": {
        const chart = charts.find((item) => item.id === operation.chartId);
        if (!chart) break;
        chart.type = operation.chartType;
        applied.push(operation);
        messages.push(`Đã đổi kiểu biểu đồ "${chart.title}".`);
        break;
      }

      case "ADD_CHART": {
        const groupBy = next.analysis.groupBy;
        const column =
          operation.column ?? next.analysis.metrics[0]?.column ?? null;
        if (!groupBy || !column) {
          messages.push("Chưa đủ dữ liệu để thêm biểu đồ này.");
          break;
        }
        const id = `custom_${operation.chartType}_${column}_${charts.length + 1}`;
        charts.push({
          id,
          type: operation.chartType,
          title: labelForColumn(next, column),
          x: groupBy,
          y: column,
          aggregation: "sum",
          limit: 15,
        });
        applied.push(operation);
        messages.push("Đã thêm một biểu đồ mới.");
        break;
      }

      case "REMOVE_ALL_CHARTS": {
        for (const chart of charts) chart.disabled = true;
        applied.push(operation);
        messages.push("Đã bỏ toàn bộ biểu đồ khỏi báo cáo.");
        break;
      }

      case "SET_REPORT_TITLE": {
        const title = operation.title.trim().slice(0, MAX_TITLE_LENGTH);
        if (!title) break;
        next.report.title = title;
        applied.push(operation);
        messages.push(`Đã đổi tên báo cáo thành "${title}".`);
        break;
      }

      case "SET_REPORT_PERIOD": {
        next.report.period = operation.period.trim().slice(0, MAX_TITLE_LENGTH);
        applied.push(operation);
        messages.push(`Đã ghi kỳ báo cáo là "${next.report.period}".`);
        break;
      }

      case "SET_AI_ENABLED": {
        next.ai.enabled = operation.enabled;
        applied.push(operation);
        messages.push(
          operation.enabled ? "Đã bật phần nhận định." : "Đã bỏ phần nhận định.",
        );
        break;
      }

      case "SET_GROUP_BY": {
        if (!next.columns.some((column) => column.key === operation.column)) break;
        next.analysis.groupBy = operation.column;
        for (const chart of charts) {
          if (chart.x !== null) chart.x = operation.column;
        }
        applied.push(operation);
        messages.push(`Đã nhóm số liệu theo "${labelForColumn(next, operation.column)}".`);
        break;
      }

      case "REMOVE_METRIC": {
        const before = next.analysis.metrics.length;
        next.analysis.metrics = next.analysis.metrics.filter(
          (metric) => metric.column !== operation.column,
        );
        next.analysis.descriptiveColumns = next.analysis.descriptiveColumns.filter(
          (column) => column !== operation.column,
        );
        if (next.analysis.metrics.length === before) break;
        applied.push(operation);
        messages.push(`Đã bỏ cột "${labelForColumn(next, operation.column)}" khỏi báo cáo.`);
        break;
      }

      case "ADD_METRIC": {
        if (!next.columns.some((column) => column.key === operation.column)) break;
        if (next.analysis.metrics.some((metric) => metric.column === operation.column)) break;
        const label = labelForColumn(next, operation.column);
        next.analysis.metrics.push({
          key: `${operation.column}_${operation.aggregation}`,
          label: operation.aggregation === "mean" ? `${label} trung bình` : label,
          column: operation.column,
          aggregation: operation.aggregation,
          unit: "",
        });
        if (!next.analysis.descriptiveColumns.includes(operation.column)) {
          next.analysis.descriptiveColumns.push(operation.column);
        }
        applied.push(operation);
        messages.push(`Đã thêm cột "${label}" vào báo cáo.`);
        break;
      }

      default:
        break;
    }
  }

  if (applied.length === 0) {
    throw validationFailed(
      "Yêu cầu này chưa áp dụng được vào báo cáo hiện tại. Bạn thử nói cụ thể hơn giúp mình.",
    );
  }

  // A disabled chart is dropped only when the definition is handed to the
  // engine, so the choice stays reversible in the interface.
  next.charts = charts as unknown as TemplateDefinition["charts"];
  return { definition: next, applied, messages };
}

/** The definition given to the analysis engine, without the disabled charts. */
export function forEngine(definition: TemplateDefinition): TemplateDefinition {
  const copy: TemplateDefinition = JSON.parse(JSON.stringify(definition));
  copy.charts = (copy.charts as unknown as ChartEntry[]).filter(
    (chart) => !chart.disabled,
  ) as unknown as TemplateDefinition["charts"];
  return copy;
}

function labelForColumn(definition: TemplateDefinition, key: string): string {
  return definition.columns.find((column) => column.key === key)?.expectedName ?? key;
}
