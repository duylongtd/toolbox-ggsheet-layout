"use client";

import { T, num, t } from "@/lib/format/vi";
import { toDisplayText } from "@/lib/security/text";
import type { Dataset, SheetOption } from "@/types";

/**
 * Worksheet chooser.
 *
 * The sheet is picked by clicking its name, never by typing it, and clicking
 * shows that sheet's real rows straight away because every sheet was prepared
 * during the upload. A sheet with no table is shown but cannot be selected, so
 * the absence is visible rather than silent.
 */
export function SheetPicker({
  sheets,
  dataset,
  activeDatasetId,
  switching,
  onSelect,
}: {
  sheets: SheetOption[];
  dataset: Dataset;
  activeDatasetId: string | null;
  switching: boolean;
  onSelect: (sheetIndex: number) => void;
}) {
  const many = sheets.length > 1;
  const previewColumns = dataset.columns.slice(0, 10);
  const previewRows = dataset.sampleRows.slice(0, 8);

  return (
    <section className="app-card overflow-hidden">
      <header className="border-b border-[#dfe6e2] px-5 py-4">
        <h2 className="text-base font-semibold text-ink">
          {many ? t(T.sheetTitle, sheets.length) : T.sheetOne}
        </h2>
        {many && <p className="mt-1 text-sm text-ink-muted">{T.sheetPick}</p>}
      </header>

      {many && (
        <div className="flex flex-wrap gap-2 border-b border-[#dfe6e2] bg-[#f6f8f7] px-5 py-3">
          {sheets.map((sheet) => {
            const active = sheet.datasetId === activeDatasetId;
            return (
              <button
                key={sheet.index}
                type="button"
                disabled={!sheet.usable || switching}
                onClick={() => onSelect(sheet.index)}
                aria-pressed={active}
                title={sheet.usable ? undefined : T.sheetEmpty}
                className={`flex items-center gap-2 rounded-lg border px-3 py-2 text-sm transition-colors ${
                  active
                    ? "border-brand-600 bg-brand-600 text-white"
                    : sheet.usable
                      ? "border-[#dfe6e2] bg-white text-ink hover:border-brand-300 hover:bg-brand-50"
                      : "cursor-not-allowed border-[#dfe6e2] bg-[#eef1ef] text-ink-subtle"
                }`}
              >
                <span className="max-w-[16rem] truncate">
                  {toDisplayText(sheet.sheetName, 40)}
                </span>
                {sheet.usable && (
                  <span className={active ? "text-blue-100" : "text-ink-subtle"}>
                    {num(sheet.rowCount)}
                  </span>
                )}
              </button>
            );
          })}
        </div>
      )}

      <div className="px-5 py-4">
        <p className="mb-3 text-sm text-ink-muted">
          {t(T.rowsCount, num(dataset.rowCount))} · {t(T.columnsCount, dataset.columnCount)}
        </p>

        <div className={`overflow-x-auto ${switching ? "opacity-50" : ""}`}>
          <table className="app-table">
            <thead>
              <tr>
                {previewColumns.map((column) => (
                  <th key={column.key}>{toDisplayText(column.name, 32)}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {previewRows.map((row, index) => (
                <tr key={index}>
                  {previewColumns.map((column) => (
                    <td key={column.key}>{toDisplayText(row[column.key], 60)}</td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {dataset.rowCount > previewRows.length && (
          <p className="mt-2 text-xs text-ink-subtle">
            {t(T.previewNote, previewRows.length, num(dataset.rowCount))}
          </p>
        )}
      </div>
    </section>
  );
}
