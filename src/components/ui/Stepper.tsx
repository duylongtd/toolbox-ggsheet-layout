import clsx from "clsx";
import { Check } from "lucide-react";

export interface Step {
  id: number;
  label: string;
}

/** Shows where the user is in the analysis wizard. */
export function Stepper({ steps, current }: { steps: Step[]; current: number }) {
  return (
    <ol className="flex flex-wrap items-center gap-x-2 gap-y-3">
      {steps.map((step, index) => {
        const done = step.id < current;
        const active = step.id === current;
        return (
          <li key={step.id} className="flex items-center gap-2">
            <span
              className={clsx(
                "flex h-7 w-7 items-center justify-center rounded-full border text-xs font-semibold",
                done && "border-green-600 bg-green-600 text-white",
                active && "border-blue-700 bg-blue-700 text-white",
                !done && !active && "border-slate-300 bg-white text-slate-500",
              )}
              aria-current={active ? "step" : undefined}
            >
              {done ? <Check className="h-4 w-4" aria-hidden /> : step.id}
            </span>
            <span
              className={clsx(
                "text-sm",
                active ? "font-semibold text-slate-900" : "text-slate-500",
              )}
            >
              {step.label}
            </span>
            {index < steps.length - 1 && (
              <span className="mx-1 hidden h-px w-8 bg-slate-300 sm:block" aria-hidden />
            )}
          </li>
        );
      })}
    </ol>
  );
}
