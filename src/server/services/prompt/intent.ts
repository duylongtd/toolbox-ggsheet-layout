import type { TemplateDefinition } from "@/types";
import type { ChartType, Operation } from "@/server/services/refinement";
import { checkPrompt } from "./guardrails";
import { normalize, similarity } from "./normalize";

/**
 * Turns a typed sentence into operations from the closed set.
 *
 * This is deliberately deterministic. It works with no AI provider configured,
 * which is the default, and it cannot be talked into producing anything outside
 * the operation list no matter what the sentence contains.
 */

export type PromptOutcome =
  | { kind: "OPERATIONS"; operations: Operation[]; reply: string }
  | { kind: "REFUSED"; reply: string }
  | { kind: "UNCLEAR"; reply: string; examples: string[] };

const EXAMPLES = [
  "thêm biểu đồ tròn",
  "bỏ biểu đồ",
  "đổi tên báo cáo thành Báo cáo quý 2",
  "bỏ cột ghi chú",
  "nhóm theo đơn vị",
];

const CHART_WORDS: Array<[ChartType, string[]]> = [
  ["pie", ["tron", "hinh tron", "pie", "quat", "ty trong"]],
  ["line", ["duong", "line", "xu huong", "theo thoi gian"]],
  ["horizontal_bar", ["cot ngang", "thanh ngang", "ngang"]],
  ["bar", ["cot", "bar", "cot dung", "thanh"]],
  ["area", ["mien", "area", "vung"]],
  ["histogram", ["phan bo", "histogram"]],
  ["scatter", ["phan tan", "scatter", "diem"]],
];

const ADD_WORDS = ["them", "bo sung", "ve", "lam", "tao", "muon co", "can co", "cho toi", "cho minh"];
const REMOVE_WORDS = ["bo", "xoa", "khong", "bot", "loai", "an", "khong can", "khong muon"];
const ALL_WORDS = ["tat ca", "het", "toan bo", "moi"];

/** Threshold above which a spoken column name is accepted as a real column. */
const COLUMN_MATCH_THRESHOLD = 0.62;

/**
 * What the sentence can refer to besides the schema.
 *
 * The values of the grouping column matter: a person names an indicator or a
 * unit, not a column, when they say which rows they want.
 */
export interface PromptContext {
  categories?: string[];
}

export function interpret(
  prompt: string,
  definition: TemplateDefinition,
  context: PromptContext = {},
): PromptOutcome {
  const verdict = checkPrompt(prompt);
  if (!verdict.allowed) {
    return { kind: "REFUSED", reply: verdict.reply ?? "" };
  }

  const text = normalize(prompt);
  const operations: Operation[] = [];

  const wantsAdd = ADD_WORDS.some((word) => text.includes(word));
  const wantsRemove = REMOVE_WORDS.some((word) => hasWord(text, word));
  const mentionsChart = text.includes("bieu do") || text.includes("chart");

  // Report title. Checked first because a title can contain any other word.
  const title = matchTitle(text);
  if (title) operations.push({ type: "SET_REPORT_TITLE", title });

  const period = matchPeriod(text);
  if (period) operations.push({ type: "SET_REPORT_PERIOD", period });

  if (mentionsChart) {
    const chartType = matchChartType(text);
    if (wantsRemove && (ALL_WORDS.some((word) => text.includes(word)) || !chartType)) {
      operations.push({ type: "REMOVE_ALL_CHARTS" });
    } else if (wantsRemove && chartType) {
      for (const chart of chartsOfType(definition, chartType)) {
        operations.push({ type: "SET_CHART_ENABLED", chartId: chart, enabled: false });
      }
    } else if (chartType && (wantsAdd || !wantsRemove)) {
      operations.push({ type: "ADD_CHART", chartType });
    }
  }

  // Restricting the report to certain rows. Checked before the column rules,
  // because "chi tieu X" names a value inside a column, not the column itself.
  const restriction = matchRestriction(text, definition, context);
  if (restriction) operations.push(restriction);

  if (isClearingFilters(text)) {
    operations.push({ type: "CLEAR_FILTERS" });
  }

  // Column level requests.
  const column = restriction ? null : matchColumn(text, definition);
  if (column) {
    if (text.includes("nhom") || text.includes("gom") || text.includes("theo tung")) {
      operations.push({ type: "SET_GROUP_BY", column });
    } else if (wantsRemove && (text.includes("cot") || text.includes("chi so"))) {
      operations.push({ type: "REMOVE_METRIC", column });
    } else if (wantsAdd && (text.includes("cot") || text.includes("chi so"))) {
      operations.push({
        type: "ADD_METRIC",
        column,
        aggregation: text.includes("trung binh") ? "mean" : "sum",
      });
    }
  }

  // The interpretation section.
  if (text.includes("nhan dinh") || text.includes("danh gia") || text.includes("phan tich ai")) {
    operations.push({ type: "SET_AI_ENABLED", enabled: !wantsRemove });
  }

  if (operations.length === 0) {
    return {
      kind: "UNCLEAR",
      reply: "Mình chưa rõ ý bạn. Bạn thử nói theo một trong các cách dưới đây.",
      examples: suggestExamples(definition, context),
    };
  }

  return { kind: "OPERATIONS", operations, reply: "" };
}

/** Words that mean "only these rows". */
const ONLY_WORDS = ["chi", "rieng", "loc", "duy nhat", "moi minh"];
const ONLY_TAIL = ["thoi", "ma thoi"];

function isClearingFilters(text: string): boolean {
  return (
    (text.includes("bo loc") || text.includes("huy loc") || text.includes("bo dieu kien")) ||
    (text.includes("tat ca") && (text.includes("xem lai") || text.includes("tinh lai")))
  );
}

/**
 * Finds a request to restrict the report to named values.
 *
 * The value is matched against the categories actually present in the data, so
 * a person can write the indicator roughly and still be understood.
 */
function matchRestriction(
  text: string,
  definition: TemplateDefinition,
  context: PromptContext,
): Operation | null {
  const categories = context.categories ?? [];
  if (categories.length === 0) return null;

  const groupBy = definition.analysis.groupBy;
  if (!groupBy) return null;

  const excluding = REMOVE_WORDS.some((word) => hasWord(text, word)) && !text.includes("chi");
  const restricting =
    ONLY_WORDS.some((word) => hasWord(text, word)) ||
    ONLY_TAIL.some((word) => text.endsWith(word)) ||
    text.includes("thong ke theo") ||
    text.includes("chi lay") ||
    text.includes("chi xem");

  if (!restricting && !excluding) return null;

  const matched = categories.filter((category) => mentions(text, category));
  if (matched.length === 0) return null;

  return {
    type: "FILTER_ROWS",
    column: groupBy,
    values: matched,
    mode: excluding ? "exclude" : "include",
  };
}

/** True when the sentence names this category, allowing an approximate write up. */
function mentions(text: string, category: string): boolean {
  const target = normalize(category);
  if (!target) return false;

  // A leading numbering such as "1." is part of the cell, not of what is said.
  const withoutNumber = target.replace(/^\d+\s*/, "").trim();
  for (const candidate of [target, withoutNumber]) {
    if (!candidate) continue;
    if (text.includes(candidate)) return true;
    // A long label is often typed only in part.
    const words = candidate.split(" ");
    if (words.length >= 3) {
      const head = words.slice(0, 3).join(" ");
      if (head.length >= 8 && text.includes(head)) return true;
    }
    if (bestWindowSimilarity(text, candidate) >= 0.82) return true;
  }
  return false;
}

/** Examples built from this report, not from a fixed list. */
function suggestExamples(definition: TemplateDefinition, context: PromptContext): string[] {
  const examples: string[] = [];
  const category = context.categories?.[0];
  const groupName = definition.columns.find(
    (column) => column.key === definition.analysis.groupBy,
  )?.expectedName;
  const metric = definition.analysis.metrics[0]?.label;

  if (category) examples.push(`chỉ lấy ${shorten(category)}`);
  if (metric) examples.push(`bỏ cột ${shorten(metric)}`);
  examples.push("thêm biểu đồ tròn");
  if (groupName) examples.push(`nhóm theo ${shorten(groupName)}`);
  examples.push("đổi tên báo cáo thành Báo cáo quý 2");
  return examples.slice(0, 5);
}

function shorten(value: string, limit = 40): string {
  const trimmed = value.trim();
  return trimmed.length <= limit ? trimmed : `${trimmed.slice(0, limit - 3)}...`;
}

function hasWord(text: string, word: string): boolean {
  return new RegExp(`(^| )${word}( |$)`).test(text);
}

function matchChartType(text: string): ChartType | null {
  for (const [type, words] of CHART_WORDS) {
    if (words.some((word) => text.includes(word))) return type;
  }
  return null;
}

function chartsOfType(definition: TemplateDefinition, type: ChartType): string[] {
  return definition.charts.filter((chart) => chart.type === type).map((chart) => chart.id);
}

/** "doi ten bao cao thanh X" and its variants. */
function matchTitle(text: string): string | null {
  const patterns = [
    /(?:doi|dat|sua|thay)\s+(?:lai\s+)?(?:ten|tieu de)\s+(?:bao cao\s+)?(?:thanh|la|:)?\s*(.+)$/,
    /(?:ten|tieu de)\s+(?:bao cao\s+)?(?:thanh|la|:)\s*(.+)$/,
  ];
  for (const pattern of patterns) {
    const match = pattern.exec(text);
    if (match?.[1]) {
      const value = match[1].trim();
      if (value.length >= 2) return value;
    }
  }
  return null;
}

/** "ky bao cao la quy 2", "quy 2 nam 2026". */
function matchPeriod(text: string): string | null {
  const explicit = /(?:ky|ky bao cao)\s+(?:la|:)?\s*(.+)$/.exec(text);
  if (explicit?.[1]) return explicit[1].trim();

  const quarter = /\b(quy\s*[1-4](?:\s*nam\s*\d{4})?)\b/.exec(text);
  if (quarter?.[1]) return quarter[1].trim();

  const month = /\b(thang\s*(?:1[0-2]|[1-9])(?:\s*nam\s*\d{4})?)\b/.exec(text);
  if (month?.[1]) return month[1].trim();

  return null;
}

/** Finds the column the sentence refers to, tolerating an approximate name. */
function matchColumn(text: string, definition: TemplateDefinition): string | null {
  let best: { key: string; score: number } | null = null;

  for (const column of definition.columns) {
    const name = normalize(column.expectedName);
    if (!name) continue;

    let score = 0;
    if (text.includes(name)) {
      // A longer match is a more confident one.
      score = 0.9 + Math.min(0.09, name.length / 100);
    } else {
      score = bestWindowSimilarity(text, name);
    }

    if (score >= COLUMN_MATCH_THRESHOLD && (!best || score > best.score)) {
      best = { key: column.key, score };
    }
  }

  return best?.key ?? null;
}

/** Compares the column name against every same-length run of words. */
function bestWindowSimilarity(text: string, name: string): number {
  const words = text.split(" ");
  const width = name.split(" ").length;
  let best = 0;
  for (let index = 0; index + width <= words.length; index += 1) {
    const window = words.slice(index, index + width).join(" ");
    best = Math.max(best, similarity(window, name));
  }
  return best;
}
