/**
 * Display helpers for untrusted values.
 *
 * React escapes text nodes automatically, so cell values are safe as long as
 * they are rendered as text. `dangerouslySetInnerHTML` is not used anywhere in
 * this codebase. These helpers cover the remaining cases: bounding the length
 * and removing characters that would silently corrupt the layout.
 */

const CONTROL_CHARACTERS = /[\u0000-\u0008\u000B\u000C\u000E-\u001F\u007F]/g;

/**
 * No-break, narrow no-break, zero width and line and paragraph separators.
 * Spreadsheets emit these; they are invisible and break layout and logs.
 */
const EXOTIC_SPACES = /[\u00A0\u202F\u2028\u2029\u200B\uFEFF]/g;

export function toDisplayText(value: unknown, maxLength = 200): string {
  if (value === null || value === undefined) return "";
  const text = String(value).replace(CONTROL_CHARACTERS, "").replace(EXOTIC_SPACES, " ");
  return text.length > maxLength ? `${text.slice(0, maxLength - 3)}...` : text;
}

/** Escapes a value for a non React sink such as a downloadable HTML file. */
export function escapeHtml(value: unknown): string {
  return String(value ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}
