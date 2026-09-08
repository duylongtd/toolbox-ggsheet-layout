"use client";

import { CircleSlash, Table2 } from "lucide-react";
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
      <header className="border-b border-slate-200 px-5 py-4">
        <h2 className="text-base font-semibold text-slate-900">
          {many ? t(T.sheetTitle, sheets.length) : T.sheetOne}
        </h2>
        {many && <p className="mt-1 text-sm text-slate-500">{T.sheetPick}</p>}
      </header>

      {many && (
        <div className="flex flex-wrap gap-2 border-b border-slate-200 bg-slate-50 px-5 py-3">
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
                    ? "border-blue-600 bg-blue-600 text-white"
                    : sheet.usable
                      ? "border-slate-300 bg-white text-slate-700 hover:border-blue-400 hover:bg-blue-50"
                      : "cursor-not-allowed border-slate-200 bg-slate-100 text-slate-400"
                }`}
              >
                {sheet.usable ? (
                  <Table2 className="h-4 w-4" aria-hidden />
                ) : (
                  <CircleSlash className="h-4 w-4" aria-hidden />
                )}
                <span className="max-w-[16rem] truncate">
                  {toDisplayText(sheet.sheetName, 40)}
                </span>
                {sheet.usable && (
                  <span className={active ? "text-blue-100" : "text-slate-400"}>
                    {num(sheet.rowCount)}
                  </span>
                )}
              </button>
            );
          })}
        </div>
      )}

      <div className="px-5 py-4">
        <p className="mb-3 text-sm text-slate-500">
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
          <p className="mt-2 text-xs text-slate-400">
            {t(T.previewNote, previewRows.length, num(dataset.rowCount))}
          </p>
        )}
      </div>
    </section>
  );
}
