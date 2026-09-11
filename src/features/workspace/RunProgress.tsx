"use client";

import { useEffect, useState } from "react";
import { toDisplayText } from "@/lib/security/text";
import type { ProgressEvent } from "@/types";

/**
 * What a run is doing, as it does it.
 *
 * The engine reports each stage as it starts and finishes and counts charts as
 * they render; the web service adds its own steps around the call. This panel
 * turns that stream into a list of stages with the current one live, a chart
 * counter, an elapsed clock, and, when a run stops, the stage it stopped in
 * with the reason beside it. Nothing here is guessed from the elapsed time.
 */

/** The stages in the order they run, with the words a reader sees. */
const STAGES: Array<[string, string]> = [
  ["engine", "Gửi yêu cầu"],
  ["load", "Đọc dữ liệu"],
  ["schema", "Khớp cột"],
  ["analyze", "Thống kê"],
  ["charts", "Biểu đồ"],
  ["ai", "Nhận xét"],
  ["pdf", "Tệp PDF"],
  ["save", "Lưu"],
];

type StageState = "pending" | "active" | "done" | "skipped" | "failed";

/** What a failure means for the person waiting, by the engine's code. */
const FAILURE_MEANING: Record<string, string> = {
  DATASET_NOT_FOUND: "Dữ liệu đã chuẩn bị không còn trên hệ thống. Bạn tải lại tệp rồi làm lại.",
  PROCESSING_TIMEOUT: "Việc xử lý vượt quá giới hạn thời gian và đã bị dừng. Bảng quá lớn hoặc quá nhiều biểu đồ; thử bớt biểu đồ.",
  ANALYSIS_SERVICE_UNAVAILABLE: "Không kết nối được tới bộ phân tích. Thử lại sau ít phút; nếu vẫn vậy báo quản trị viên.",
  ANALYSIS_SERVICE_TIMEOUT: "Bộ phân tích không trả lời kịp. Thử lại sau ít phút.",
  ANALYSIS_FAILED: "Bộ phân tích gặp lỗi khi xử lý bảng này.",
  PDF_GENERATION_FAILED: "Tính toán xong nhưng không tạo được tệp PDF.",
  SCHEMA_MISMATCH: "Cột trong bảng không khớp với cấu hình báo cáo.",
  INVALID_TEMPLATE_DEFINITION: "Cấu hình báo cáo không hợp lệ.",
};

interface StageView {
  key: string;
  label: string;
  state: StageState;
  message: string | null;
  done?: number;
  total?: number;
  durationMs?: number;
}

/** Folds the event list into one row per stage. Later events win. */
function foldStages(events: ProgressEvent[]): StageView[] {
  const byStage = new Map<string, StageView>();
  for (const [key, label] of STAGES) {
    byStage.set(key, { key, label, state: "pending", message: null });
  }

  const startedAt = new Map<string, number>();
  for (const event of events) {
    const row = byStage.get(event.stage);
    if (!row) continue;
    row.message = event.message;
    if (event.done !== undefined) row.done = event.done;
    if (event.total !== undefined) row.total = event.total;
    if (event.durationMs !== undefined) row.durationMs = event.durationMs;
    if (event.state === "started") startedAt.set(event.stage, event.at);
    if (event.state === "started" || event.state === "running") row.state = "active";
    else if (event.state === "done") {
      row.state = "done";
      // The web side's own steps report no duration; the timestamps give it.
      // For the engine step that is the whole round trip, which is the number
      // most worth seeing.
      if (row.durationMs === undefined && startedAt.has(event.stage)) {
        row.durationMs = Math.max(0, event.at - (startedAt.get(event.stage) ?? event.at));
      }
    }
    else if (event.state === "skipped") row.state = "skipped";
    else if (event.state === "failed") row.state = "failed";
  }

  // The engine's "done" arrives before the web's "save"; between the two the
  // engine row is finished and only one row should read as live. Once a
  // later stage has started, earlier active rows are finished.
  const rows = [...byStage.values()];
  const lastActive = rows.map((r) => r.state).lastIndexOf("active");
  const failedAt = rows.findIndex((r) => r.state === "failed");
  return rows.map((row, index) => {
    if (row.state === "active" && index < lastActive) return { ...row, state: "done" };
    if (failedAt >= 0 && row.state === "active" && index !== failedAt) return { ...row, state: "done" };
    return row;
  });
}

function formatDuration(ms: number): string {
  if (ms < 1000) return `${Math.round(ms)} ms`;
  return `${(ms / 1000).toFixed(1)} s`;
}

function formatClock(at: number): string {
  return new Date(at).toLocaleTimeString("vi-VN", { hour12: false });
}

export function RunProgress({
  events,
  running,
  failed,
  startedAt,
}: {
  events: ProgressEvent[];
  running: boolean;
  failed: boolean;
  startedAt: string | null;
}) {
  const stages = foldStages(events);
  const [now, setNow] = useState(() => Date.now());
  const [showLog, setShowLog] = useState(running);

  // A clock the reader can watch, so a slow stage is visibly slow rather than
  // visibly frozen. Polled at the same cadence as the events.
  useEffect(() => {
    if (!running) return;
    const timer = setInterval(() => setNow(Date.now()), 500);
    return () => clearInterval(timer);
  }, [running]);

  const origin = events[0]?.at ?? (startedAt ? Date.parse(startedAt) : null);
  const last = events.at(-1);
  const end = running ? now : (last?.at ?? now);
  const elapsed = origin ? Math.max(0, end - origin) : 0;
  const failure = [...events].reverse().find((event) => event.state === "failed");

  return (
    <section
      className={`overflow-hidden rounded-xl border ${
        failed ? "border-red-200 bg-red-50/40" : "border-brand-200 bg-brand-50/40"
      }`}
    >
      <header className="flex flex-wrap items-center justify-between gap-3 px-5 py-4">
        <div className="flex items-center gap-3.5">
          {running ? (
            <span
              aria-hidden
              className="h-5 w-5 shrink-0 animate-spin rounded-full border-2 border-brand-600 border-t-transparent"
            />
          ) : failed ? (
            <span aria-hidden className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-red-600">
              <span className="h-2 w-0.5 bg-white" />
            </span>
          ) : (
            <span aria-hidden className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-brand-600">
              <svg viewBox="0 0 20 20" className="h-3 w-3" fill="none">
                <path d="m4.5 10.5 3.5 3.5 7.5-8" stroke="white" strokeWidth="2.6" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
            </span>
          )}
          <div>
            <p className="font-semibold text-ink">
              {running ? "Đang lập báo cáo" : failed ? "Báo cáo không hoàn thành" : "Đã lập xong"}
            </p>
            <p className="text-sm text-ink-muted">
              {running && last ? toDisplayText(last.message, 120) : failure ? "Dừng ở bước được đánh dấu bên dưới." : "Mọi bước đã chạy."}
            </p>
          </div>
        </div>
        <span className="font-display text-2xl tabular-nums text-ink">{(elapsed / 1000).toFixed(1)}s</span>
      </header>

      <ol className="grid grid-cols-2 gap-px border-t border-black/5 bg-black/5 sm:grid-cols-4 lg:grid-cols-8">
        {stages.map((stage) => (
          <li
            key={stage.key}
            className={`px-3 py-3 text-[12px] ${
              stage.state === "failed"
                ? "bg-red-50 text-red-900"
                : stage.state === "active"
                  ? "bg-white text-ink"
                  : stage.state === "done"
                    ? "bg-white/70 text-ink-muted"
                    : stage.state === "skipped"
                      ? "bg-white/40 text-ink-subtle"
                      : "bg-white/30 text-ink-subtle"
            }`}
          >
            <div className="flex items-center gap-1.5">
              <StageMark state={stage.state} />
              <span className="font-semibold">{stage.label}</span>
            </div>
            <p className="mt-1 truncate text-[11px]" title={stage.message ?? ""}>
              {stage.state === "active" && stage.total
                ? `${stage.done ?? 0}/${stage.total}`
                : stage.state === "done"
                  ? stage.durationMs !== undefined
                    ? formatDuration(stage.durationMs)
                    : "xong"
                  : stage.state === "skipped"
                    ? "bỏ qua"
                    : stage.state === "failed"
                      ? "lỗi"
                      : stage.state === "active"
                        ? "đang chạy"
                        : "chờ"}
            </p>
            {stage.state === "active" && stage.total ? (
              <div className="mt-1.5 h-1 overflow-hidden rounded-full bg-black/10">
                <div
                  className="h-full bg-brand-600 transition-[width] duration-300"
                  style={{ width: `${Math.round(((stage.done ?? 0) / stage.total) * 100)}%` }}
                />
              </div>
            ) : null}
          </li>
        ))}
      </ol>

      {failure ? (
        <div className="border-t border-red-200 bg-red-50 px-5 py-3.5 text-sm text-red-900">
          <p className="font-semibold">
            Dừng ở bước: {STAGES.find(([key]) => key === failure.stage)?.[1] ?? failure.stage}
          </p>
          <p className="mt-0.5">
            {toDisplayText((failure.code && FAILURE_MEANING[failure.code]) || failure.message, 300)}
          </p>
          {failure.code ? (
            <p className="mt-1 font-mono text-[11px] opacity-70">
              {failure.code}
              {FAILURE_MEANING[failure.code] ? ` · ${toDisplayText(failure.message, 200)}` : ""}
            </p>
          ) : null}
        </div>
      ) : null}

      <div className="border-t border-black/5">
        <button
          type="button"
          onClick={() => setShowLog((value) => !value)}
          className="flex w-full items-center justify-between px-5 py-2.5 text-[12px] font-semibold uppercase tracking-[0.12em] text-ink-muted hover:text-ink"
        >
          <span>Nhật ký ({events.length})</span>
          <span aria-hidden>{showLog ? "−" : "+"}</span>
        </button>
        {showLog ? (
          <ol className="max-h-56 overflow-y-auto border-t border-black/5 bg-white/80 px-5 py-3 font-mono text-[11.5px] leading-relaxed">
            {events.length === 0 ? (
              <li className="text-ink-subtle">Chưa có sự kiện nào.</li>
            ) : (
              events.map((event, index) => (
                <li
                  key={index}
                  className={`flex gap-3 ${
                    event.state === "failed"
                      ? "text-red-800"
                      : event.state === "skipped"
                        ? "text-ink-subtle"
                        : "text-ink"
                  }`}
                >
                  <span className="shrink-0 tabular-nums text-ink-subtle">{formatClock(event.at)}</span>
                  <span className="w-14 shrink-0 uppercase text-ink-subtle">{event.stage}</span>
                  <span className="min-w-0 break-words">
                    {toDisplayText(event.message, 200)}
                    {event.durationMs !== undefined && event.state === "done"
                      ? ` (${formatDuration(event.durationMs)})`
                      : ""}
                  </span>
                </li>
              ))
            )}
          </ol>
        ) : null}
      </div>
    </section>
  );
}

function StageMark({ state }: { state: StageState }) {
  if (state === "active") {
    return (
      <span
        aria-hidden
        className="h-3 w-3 shrink-0 animate-spin rounded-full border-[1.5px] border-brand-600 border-t-transparent"
      />
    );
  }
  if (state === "done") {
    return (
      <svg viewBox="0 0 20 20" className="h-3 w-3 shrink-0 text-brand-700" fill="none" aria-hidden>
        <path d="m4.5 10.5 3.5 3.5 7.5-8" stroke="currentColor" strokeWidth="2.8" strokeLinecap="round" strokeLinejoin="round" />
      </svg>
    );
  }
  if (state === "failed") {
    return <span aria-hidden className="h-3 w-3 shrink-0 rounded-full bg-red-600" />;
  }
  if (state === "skipped") {
    return <span aria-hidden className="h-3 w-3 shrink-0 rounded-full border border-ink-subtle" />;
  }
  return <span aria-hidden className="h-3 w-3 shrink-0 rounded-full border border-black/15" />;
}
