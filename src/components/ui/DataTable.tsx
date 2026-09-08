import type { ReactNode } from "react";

export interface Column<T> {
  key: string;
  header: string;
  align?: "left" | "right";
  render: (row: T) => ReactNode;
}

interface DataTableProps<T> {
  columns: Array<Column<T>>;
  rows: T[];
  emptyMessage?: string;
  caption?: string;
}

/**
 * Table primitive.
 *
 * Cell content is rendered as React children, which React escapes, so a value
 * that looks like markup can never become markup.
 */
export function DataTable<T>({ columns, rows, emptyMessage, caption }: DataTableProps<T>) {
  if (rows.length === 0) {
    return (
      <p className="py-6 text-center text-sm text-slate-500">
        {emptyMessage ?? "There is nothing to show yet."}
      </p>
    );
  }

  return (
    <div className="overflow-x-auto">
      <table className="app-table">
        {caption && <caption className="sr-only">{caption}</caption>}
        <thead>
          <tr>
            {columns.map((column) => (
              <th key={column.key} className={column.align === "right" ? "text-right" : undefined}>
                {column.header}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.map((row, index) => (
            <tr key={index}>
              {columns.map((column) => (
                <td
                  key={column.key}
                  className={column.align === "right" ? "text-right tabular-nums" : undefined}
                >
                  {column.render(row)}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
