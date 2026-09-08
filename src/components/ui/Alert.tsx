import clsx from "clsx";
import { AlertTriangle, CheckCircle2, Info, XCircle } from "lucide-react";
import type { ReactNode } from "react";

type Level = "info" | "success" | "warning" | "danger";

const STYLES: Record<Level, string> = {
  info: "border-blue-200 bg-blue-50 text-blue-900",
  success: "border-green-200 bg-green-50 text-green-900",
  warning: "border-amber-200 bg-amber-50 text-amber-900",
  danger: "border-red-200 bg-red-50 text-red-900",
};

const ICONS: Record<Level, ReactNode> = {
  info: <Info className="h-5 w-5 shrink-0" aria-hidden />,
  success: <CheckCircle2 className="h-5 w-5 shrink-0" aria-hidden />,
  warning: <AlertTriangle className="h-5 w-5 shrink-0" aria-hidden />,
  danger: <XCircle className="h-5 w-5 shrink-0" aria-hidden />,
};

interface AlertProps {
  level?: Level;
  title: string;
  children?: ReactNode;
  actions?: ReactNode;
  className?: string;
}

export function Alert({ level = "info", title, children, actions, className }: AlertProps) {
  return (
    <div className={clsx("flex gap-3 rounded-lg border p-4", STYLES[level], className)} role="status">
      {ICONS[level]}
      <div className="min-w-0 flex-1">
        <p className="text-sm font-semibold">{title}</p>
        {children && <div className="mt-1 text-sm">{children}</div>}
        {actions && <div className="mt-3 flex flex-wrap gap-2">{actions}</div>}
      </div>
    </div>
  );
}
