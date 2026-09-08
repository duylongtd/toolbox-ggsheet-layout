/**
 * Spreadsheet formula neutralisation.
 *
 * A cell that starts with one of these characters is executed by spreadsheet
 * applications when the exported file is opened. Any user controlled value that
 * is written into a CSV or spreadsheet export must pass through this function.
 * The Python service applies the identical rule on its side.
 */

const DANGEROUS_PREFIXES = ["=", "+", "-", "@", "\t", "\r"];

export function neutralizeFormula(value: unknown): string {
  if (value === null || value === undefined) return "";
  const text = String(value);
  const first = text.charAt(0);
  return first && DANGEROUS_PREFIXES.includes(first) ? `'${text}` : text;
}

export function looksLikeFormula(value: unknown): boolean {
  if (value === null || value === undefined) return false;
  const first = String(value).charAt(0);
  return Boolean(first) && DANGEROUS_PREFIXES.includes(first);
}

/** Builds a CSV export with every cell neutralised and quoted. */
export function toCsv(headers: string[], rows: Array<Record<string, unknown>>): string {
  const escapeCell = (value: unknown): string =>
    `"${neutralizeFormula(value).replace(/"/g, '""')}"`;

  const lines = [headers.map(escapeCell).join(",")];
  for (const row of rows) {
    lines.push(headers.map((header) => escapeCell(row[header])).join(","));
  }
  return lines.join("\r\n");
}
