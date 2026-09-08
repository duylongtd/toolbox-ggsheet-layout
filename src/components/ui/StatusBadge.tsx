import clsx from "clsx";
import {
  AlertTriangle,
  Ban,
  CheckCircle2,
  CircleDashed,
  Loader2,
  XCircle,
} from "lucide-react";
import type { ReactNode } from "react";

export type Tone = "neutral" | "info" | "success" | "warning" | "danger" | "progress";

const TONES: Record<Tone, string> = {
  neutral: "bg-slate-100 text-slate-700 border-slate-200",
  info: "bg-blue-50 text-blue-800 border-blue-200",
  success: "bg-green-50 text-green-800 border-green-200",
  warning: "bg-amber-50 text-amber-800 border-amber-200",
  danger: "bg-red-50 text-red-800 border-red-200",
  progress: "bg-blue-50 text-blue-800 border-blue-200",
};

const ICONS: Record<Tone, ReactNode> = {
  neutral: <CircleDashed className="h-3.5 w-3.5" aria-hidden />,
  info: <CircleDashed className="h-3.5 w-3.5" aria-hidden />,
  success: <CheckCircle2 className="h-3.5 w-3.5" aria-hidden />,
  warning: <AlertTriangle className="h-3.5 w-3.5" aria-hidden />,
  danger: <XCircle className="h-3.5 w-3.5" aria-hidden />,
  progress: <Loader2 className="h-3.5 w-3.5 animate-spin" aria-hidden />,
};

/** Status is always shown as an icon plus a label, never colour alone. */
export function StatusBadge({
  tone,
  label,
  className,
}: {
  tone: Tone;
  label: string;
  className?: string;
}) {
  return (
    <span
      className={clsx(
        "inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-xs font-medium",
        TONES[tone],
        className,
      )}
    >
      {ICONS[tone]}
      {label}
    </span>
  );
}

export function CancelledBadge({ label }: { label: string }) {
  return (
    <span className="inline-flex items-center gap-1.5 rounded-full border border-slate-200 bg-slate-100 px-2.5 py-1 text-xs font-medium text-slate-600">
      <Ban className="h-3.5 w-3.5" aria-hidden />
      {label}
    </span>
  );
}

/** Maps a lifecycle status to a visual tone. */
export function statusTone(status: string): Tone {
  switch (status) {
    case "COMPLETED":
      return "success";
    case "FAILED":
      return "danger";
    case "CANCELLED":
      return "neutral";
    case "WAITING_FOR_CONFIRMATION":
      return "warning";
    case "REQUEST_CREATED":
      return "neutral";
    default:
      return "progress";
  }
}

/** Maps a schema match status to a visual tone. */
export function matchTone(status: string): Tone {
  switch (status) {
    case "MATCHED":
      return "success";
    case "MATCHED_WITH_WARNINGS":
    case "EXTRA_COLUMNS":
      return "warning";
    case "MISSING_REQUIRED_COLUMNS":
    case "TYPE_MISMATCH":
    case "AMBIGUOUS_MAPPING":
    case "INVALID_DATASET":
      return "danger";
    default:
      return "neutral";
  }
}
