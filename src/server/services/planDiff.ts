import "server-only";
import type { TemplateDefinition } from "@/types";

/**
 * Stating what a proposed change would actually do.
 *
 * The wording is derived from the two definitions, not written by the model.
 * A model asked to describe its own plan can describe one it did not make, and
 * the sentence a person approves has to be the change that will be applied.
 */

const AGGREGATIONS: Record<string, string> = {
  sum: "tổng",
  mean: "trung bình",
  median: "trung vị",
  min: "nhỏ nhất",
  max: "lớn nhất",
  count: "số lượng",
};

const CHART_TYPES: Record<string, string> = {
  bar: "cột đứng",
  horizontal_bar: "cột ngang",
  pie: "hình tròn",
  line: "đường",
  area: "miền",
  histogram: "phân bố",
  scatter: "phân tán",
};

/** Column keys are internal; a person recognises the heading from their sheet. */
function columnName(definition: TemplateDefinition, key: string | null): string {
  if (!key) return "";
  const column = definition.columns.find((candidate) => candidate.key === key);
  return column?.expectedName || key;
}

function metricLabel(
  definition: TemplateDefinition,
  metric: { label: string; column: string; aggregation: string },
): string {
  if (metric.label) return metric.label;
  const aggregation = AGGREGATIONS[metric.aggregation] ?? metric.aggregation;
  return `${aggregation} ${columnName(definition, metric.column)}`.trim();
}

function chartLabel(chart: { type: string; title: string }): string {
  const type = CHART_TYPES[chart.type] ?? chart.type;
  return chart.title ? `${chart.title} (${type})` : `biểu đồ ${type}`;
}

function quoteList(values: string[], limit = 4): string {
  const shown = values.slice(0, limit).map((value) => `"${value}"`);
  const rest = values.length - shown.length;
  return rest > 0 ? `${shown.join(", ")} và ${rest} giá trị khác` : shown.join(", ");
}

/**
 * The differences between the current report and the proposed one, in order of
 * how much they change what the reader sees.
 */
export function describeChanges(
  current: TemplateDefinition,
  next: TemplateDefinition,
): string[] {
  const steps: string[] = [];

  if (next.report.title !== current.report.title) {
    steps.push(`Đổi tên báo cáo thành "${next.report.title}"`);
  }
  if (next.report.period !== current.report.period) {
    steps.push(
      next.report.period
        ? `Đặt kỳ báo cáo là "${next.report.period}"`
        : "Bỏ kỳ báo cáo",
    );
  }

  if (next.analysis.groupBy !== current.analysis.groupBy) {
    steps.push(
      next.analysis.groupBy
        ? `Nhóm số liệu theo cột "${columnName(next, next.analysis.groupBy)}"`
        : "Bỏ cách nhóm số liệu",
    );
  }

  // Metrics are compared by column and aggregation: the same figure computed
  // the same way is the same metric even when its label was rewritten.
  const metricKey = (metric: { column: string; aggregation: string }) =>
    `${metric.column}::${metric.aggregation}`;
  const currentMetrics = new Set(current.analysis.metrics.map(metricKey));
  const nextMetrics = new Set(next.analysis.metrics.map(metricKey));

  const added = next.analysis.metrics.filter((metric) => !currentMetrics.has(metricKey(metric)));
  const removed = current.analysis.metrics.filter((metric) => !nextMetrics.has(metricKey(metric)));
  if (added.length > 0) {
    steps.push(`Tính thêm: ${added.map((metric) => metricLabel(next, metric)).join(", ")}`);
  }
  if (removed.length > 0) {
    steps.push(`Bỏ chỉ tiêu: ${removed.map((metric) => metricLabel(current, metric)).join(", ")}`);
  }

  steps.push(...describeFilters(current, next));
  steps.push(...describeCharts(current, next));

  if (next.ai.enabled !== current.ai.enabled) {
    steps.push(next.ai.enabled ? "Bật phần nhận xét tự động" : "Tắt phần nhận xét tự động");
  }

  return steps;
}

function describeFilters(current: TemplateDefinition, next: TemplateDefinition): string[] {
  const steps: string[] = [];
  const before = current.analysis.filters ?? [];
  const after = next.analysis.filters ?? [];
  const key = (filter: { column: string; mode: string }) => `${filter.column}::${filter.mode}`;
  const beforeByKey = new Map(before.map((filter) => [key(filter), filter]));
  const afterByKey = new Map(after.map((filter) => [key(filter), filter]));

  for (const filter of after) {
    const previous = beforeByKey.get(key(filter));
    const sameValues =
      previous !== undefined &&
      previous.values.length === filter.values.length &&
      previous.values.every((value, index) => value === filter.values[index]);
    if (sameValues) continue;
    const verb = filter.mode === "include" ? "Chỉ lấy" : "Loại bỏ";
    steps.push(
      `${verb} dòng có "${columnName(next, filter.column)}" là ${quoteList(filter.values)}`,
    );
  }

  for (const filter of before) {
    if (afterByKey.has(key(filter))) continue;
    steps.push(`Bỏ điều kiện lọc trên cột "${columnName(current, filter.column)}"`);
  }

  return steps;
}

function describeCharts(current: TemplateDefinition, next: TemplateDefinition): string[] {
  const steps: string[] = [];
  const beforeById = new Map(current.charts.map((chart) => [chart.id, chart]));
  const afterIds = new Set(next.charts.map((chart) => chart.id));

  // Removals are listed before additions. Read the other way round, "bỏ toàn bộ
  // biểu đồ" after "vẽ biểu đồ mới" sounds like the new chart goes too.
  const dropped = current.charts.filter((chart) => !afterIds.has(chart.id));
  if (dropped.length > 1 && dropped.length === current.charts.length) {
    steps.push(`Bỏ ${dropped.length} biểu đồ đang có`);
  } else {
    for (const chart of dropped) {
      steps.push(`Bỏ ${chartLabel(chart)}`);
    }
  }

  for (const chart of next.charts) {
    const previous = beforeById.get(chart.id);
    if (!previous) {
      steps.push(`Vẽ ${chartLabel(chart)}`);
      continue;
    }
    if (previous.type !== chart.type) {
      steps.push(
        `Đổi "${chart.title || chart.id}" sang dạng ${CHART_TYPES[chart.type] ?? chart.type}`,
      );
    }
  }

  return steps;
}
