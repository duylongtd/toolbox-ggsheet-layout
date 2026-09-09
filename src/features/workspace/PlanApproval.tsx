"use client";

import { Button } from "@/components/ui/Button";
import { toDisplayText } from "@/lib/security/text";

export interface ProposedPlan {
  id: string;
  prompt: string;
  summary: string;
  steps: string[];
  notes: string[];
}

/**
 * The proposal, shown before anything is applied.
 *
 * A request typed in words is planned and checked against the data, then it
 * stops here. The person reads what would change and decides. Nothing runs on
 * the strength of the system having understood correctly.
 */
export function PlanApproval({
  plan,
  pending,
  onApprove,
  onDiscard,
}: {
  plan: ProposedPlan;
  pending: boolean;
  onApprove: () => void;
  onDiscard: () => void;
}) {
  return (
    <section className="overflow-hidden rounded-xl border-2 border-brand-600 bg-white">
      <header className="border-b border-brand-100 bg-brand-50 px-5 py-4">
        <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-brand-800">
          Phương án đề xuất
        </p>
        <h2 className="mt-1 font-semibold text-ink">{toDisplayText(plan.summary, 200)}</h2>
        <p className="mt-1 text-sm text-ink-muted">
          Bạn xem lại rồi bấm duyệt, hệ thống mới làm.
        </p>
      </header>

      <div className="px-5 py-4">
        <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-ink-subtle">
          Yêu cầu của bạn
        </p>
        <p className="mt-1 text-sm text-ink">{toDisplayText(plan.prompt, 300)}</p>

        <p className="mt-4 text-[11px] font-semibold uppercase tracking-[0.16em] text-ink-subtle">
          Hệ thống sẽ làm
        </p>
        <ol className="mt-2 space-y-2">
          {plan.steps.map((step, index) => (
            <li key={index} className="flex gap-3 text-sm text-ink">
              <span className="mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-brand-100 text-[11px] font-semibold text-brand-800">
                {index + 1}
              </span>
              <span>{toDisplayText(step, 300)}</span>
            </li>
          ))}
        </ol>

        {plan.notes.length > 0 && (
          <div className="mt-4 rounded-lg border border-amber-200 bg-amber-50 px-3.5 py-3">
            <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-amber-900">
              Cần lưu ý
            </p>
            <ul className="mt-1.5 space-y-1 text-sm text-amber-900">
              {plan.notes.map((note, index) => (
                <li key={index}>{toDisplayText(note, 300)}</li>
              ))}
            </ul>
          </div>
        )}
      </div>

      <footer className="flex flex-wrap gap-2 border-t border-[#dfe6e2] bg-[#f7f9f8] px-5 py-4">
        <Button onClick={onApprove} loading={pending}>
          Duyệt và làm lại báo cáo
        </Button>
        <Button variant="secondary" onClick={onDiscard} disabled={pending}>
          Bỏ phương án
        </Button>
      </footer>
    </section>
  );
}
