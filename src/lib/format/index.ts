/** Presentation formatting shared by every view. */

export function formatNumber(value: unknown): string {
  if (value === null || value === undefined || value === "") return "-";
  const number = Number(value);
  if (!Number.isFinite(number)) return String(value);
  if (Number.isInteger(number)) return number.toLocaleString("en-US");
  return number.toLocaleString("en-US", { maximumFractionDigits: 2 });
}

export function formatPercent(value: unknown, fractionDigits = 1): string {
  const number = Number(value);
  if (!Number.isFinite(number)) return "-";
  return `${(number * 100).toFixed(fractionDigits)}%`;
}

export function formatDateTime(value: string | null | undefined): string {
  if (!value) return "-";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "-";
  return date.toLocaleString("en-GB", {
    year: "numeric",
    month: "short",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  });
}

export function formatDuration(milliseconds: number | null | undefined): string {
  if (!milliseconds || milliseconds <= 0) return "-";
  if (milliseconds < 1000) return `${Math.round(milliseconds)} ms`;
  const seconds = milliseconds / 1000;
  if (seconds < 60) return `${seconds.toFixed(1)} s`;
  const minutes = Math.floor(seconds / 60);
  return `${minutes} min ${Math.round(seconds % 60)} s`;
}

export function formatBytes(bytes: number | null | undefined): string {
  if (!bytes || bytes <= 0) return "-";
  const units = ["B", "KB", "MB", "GB"];
  let value = bytes;
  let unitIndex = 0;
  while (value >= 1024 && unitIndex < units.length - 1) {
    value /= 1024;
    unitIndex += 1;
  }
  return `${value.toFixed(value >= 10 || unitIndex === 0 ? 0 : 1)} ${units[unitIndex]}`;
}

/** Turns a lifecycle status into a sentence a non technical user understands. */
export function describeStatus(status: string): string {
  const descriptions: Record<string, string> = {
    REQUEST_CREATED: "Created",
    VALIDATING: "Checking the file",
    INGESTING: "Reading the data",
    SCHEMA_ANALYSIS: "Inspecting the columns",
    WAITING_FOR_CONFIRMATION: "Waiting for your confirmation",
    PROCESSING: "Processing",
    ANALYZING: "Calculating statistics",
    GENERATING_CHARTS: "Drawing charts",
    AI_ANALYSIS: "Writing the interpretation",
    GENERATING_PDF: "Building the report",
    COMPLETED: "Completed",
    FAILED: "Failed",
    CANCELLED: "Cancelled",
  };
  return descriptions[status] ?? status;
}

export function describeMatchStatus(status: string): string {
  const descriptions: Record<string, string> = {
    MATCHED: "The file matches this template",
    MATCHED_WITH_WARNINGS: "The file matches, with points to review",
    EXTRA_COLUMNS: "The file has columns the template does not know",
    MISSING_REQUIRED_COLUMNS: "A required column is missing",
    TYPE_MISMATCH: "A column does not contain the expected kind of value",
    AMBIGUOUS_MAPPING: "Some columns need to be confirmed",
    INVALID_DATASET: "The file cannot be used with this template",
  };
  return descriptions[status] ?? status;
}
