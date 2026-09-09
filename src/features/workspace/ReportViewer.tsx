"use client";

import { useEffect, useRef, useState } from "react";

/**
 * Reads the report before downloading it.
 *
 * An `<object>` was used first: it never reported a load, so the spinner ran
 * forever, and it showed its fallback text at the same time as the document was
 * arriving. An iframe reports load, and the fallback is now shown only after a
 * genuine timeout rather than alongside the thing it is meant to replace.
 */
const LOAD_TIMEOUT_MS = 12000;

export function ReportViewer({ reportId, title }: { reportId: string; title: string }) {
  const [state, setState] = useState<"loading" | "ready" | "unsupported">("loading");
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const inlineUrl = `/api/reports/${reportId}/download?inline=1`;
  const downloadUrl = `/api/reports/${reportId}/download`;

  useEffect(() => {
    timer.current = setTimeout(() => {
      setState((current) => (current === "loading" ? "unsupported" : current));
    }, LOAD_TIMEOUT_MS);
    return () => {
      if (timer.current) clearTimeout(timer.current);
    };
  }, []);

  function onLoaded() {
    if (timer.current) clearTimeout(timer.current);
    setState("ready");
  }

  return (
    <section className="app-card overflow-hidden">
      <header className="flex flex-wrap items-center justify-between gap-3 border-b border-[#dfe6e2] px-5 py-4">
        <p className="text-sm font-medium text-ink">Xem trước tài liệu</p>
        <div className="flex items-center gap-2">
          <a
            href={inlineUrl}
            target="_blank"
            rel="noreferrer"
            className="rounded-lg border border-[#dfe6e2] px-4 py-2.5 text-sm font-medium text-ink transition-colors hover:border-brand-300 hover:bg-brand-50"
          >
            Mở tab mới
          </a>
          <a
            href={downloadUrl}
            className="rounded-lg bg-brand-600 px-5 py-2.5 text-sm font-medium text-white transition-colors hover:bg-brand-700"
          >
            Tải về máy
          </a>
        </div>
      </header>

      <div className="relative bg-[#f6f8f7]">
        {state === "loading" && (
          <div className="absolute inset-0 z-10 flex items-center justify-center">
            <span className="flex items-center gap-3 text-sm text-ink-muted">
              <span
                aria-hidden
                className="h-4 w-4 animate-spin rounded-full border-2 border-brand-600 border-t-transparent"
              />
              Đang mở tài liệu...
            </span>
          </div>
        )}

        {state === "unsupported" ? (
          <div className="px-8 py-16 text-center">
            <p className="text-sm text-ink-muted">
              Trình duyệt của bạn chưa mở được PDF ngay tại đây.
            </p>
            <a
              href={downloadUrl}
              className="mt-4 inline-block rounded-lg bg-brand-600 px-5 py-2.5 text-sm font-medium text-white transition-colors hover:bg-brand-700"
            >
              Tải báo cáo về máy
            </a>
          </div>
        ) : (
          <iframe
            src={inlineUrl}
            title={title}
            onLoad={onLoaded}
            className="h-[78vh] w-full border-0"
          />
        )}
      </div>
    </section>
  );
}
