"use client";

import { Button } from "@/components/ui/Button";
import { T } from "@/lib/format/vi";
import { toDisplayText } from "@/lib/security/text";
import type { TemplateDefinition } from "@/types";

/**
 * What the system proposes to do, stated as sentences.
 *
 * The proposal is derived from the data by deterministic rules, so it is always
 * present, and the person is not asked to configure anything: they either accept
 * it with one button or change it afterwards in their own words.
 */
export function Suggestion({
  definition,
  pending,
  onRun,
}: {
  definition: TemplateDefinition;
  pending: boolean;
  onRun: () => void;
}) {
  const groupLabel = definition.columns.find(
    (column) => column.key === definition.analysis.groupBy,
  )?.expectedName;
  const metrics = definition.analysis.metrics.map((metric) => metric.label);

  return (
    <section className="app-card">
      <header className="border-b border-[#dfe6e2] px-5 py-4">
        <h2 className="font-semibold text-ink">{T.suggestTitle}</h2>
      </header>

      <div className="space-y-4 px-5 py-4">
        <ul className="space-y-2.5 text-sm text-ink">
          {groupLabel && (
            <li className="flex items-start gap-3">
              <span aria-hidden className="mt-[9px] h-1.5 w-1.5 shrink-0 rounded-full bg-brand-500" />
              <span>
                Tổng hợp số liệu theo{" "}
                <strong className="font-medium">{toDisplayText(groupLabel, 40)}</strong>
              </span>
            </li>
          )}
          {metrics.length > 0 && (
            <li className="flex items-start gap-3">
              <span aria-hidden className="mt-[9px] h-1.5 w-1.5 shrink-0 rounded-full bg-brand-500" />
              <span>
                Tính các chỉ số:{" "}
                <strong className="font-medium">
                  {metrics.map((label) => toDisplayText(label, 40)).join(", ")}
                </strong>
              </span>
            </li>
          )}
          {definition.charts.length > 0 && (
            <li className="flex items-start gap-3">
              <span aria-hidden className="mt-[9px] h-1.5 w-1.5 shrink-0 rounded-full bg-brand-500" />
              <span>
                Vẽ <strong className="font-medium">{definition.charts.length} biểu đồ</strong> minh hoạ
              </span>
            </li>
          )}
        </ul>

        <p className="text-sm text-ink-muted">{T.suggestNote}</p>

        <Button onClick={onRun} loading={pending} className="w-full justify-center py-3 text-base">
          {pending ? T.creating : T.createReport}
        </Button>
      </div>
    </section>
  );
}
