"use client";

import { useEffect, useState } from "react";
import { useInView } from "./Reveal";

/**
 * The run panel, playing itself.
 *
 * This is the same thing a person sees while their report is being made,
 * scripted rather than fed by a real pipeline: each stage lights, the charts
 * count up, the clock runs, and the whole sequence restarts after a pause.
 * It is the most honest picture of the product on the page, because it shows
 * the product's own instrument rather than a stock illustration.
 *
 * Driven by a timer so it plays wherever the page is painted at all, and held
 * on the finished frame for anyone who asked for less motion.
 */

interface Step {
  stage: string;
  label: string;
  /** Milliseconds this stage takes in the script. */
  ms: number;
  /** For the chart stage: how many to count through. */
  charts?: number;
  note?: string;
}

const SCRIPT: Step[] = [
  { stage: "engine", label: "Gửi", ms: 400 },
  { stage: "load", label: "Đọc", ms: 500, note: "6 dòng, 5 cột" },
  { stage: "schema", label: "Khớp cột", ms: 450 },
  { stage: "analyze", label: "Thống kê", ms: 700 },
  { stage: "charts", label: "Biểu đồ", ms: 1800, charts: 4 },
  { stage: "ai", label: "Nhận xét", ms: 1600, note: "gemini" },
  { stage: "pdf", label: "PDF", ms: 700, note: "186 KB" },
  { stage: "save", label: "Lưu", ms: 350 },
];

const HOLD_MS = 2600;
const TOTAL = SCRIPT.reduce((sum, step) => sum + step.ms, 0);

interface Frame {
  index: number;
  /** 0..1 within the current stage. */
  within: number;
  elapsed: number;
  finished: boolean;
}

function frameAt(t: number): Frame {
  let acc = 0;
  for (let index = 0; index < SCRIPT.length; index += 1) {
    const step = SCRIPT[index]!;
    if (t < acc + step.ms) {
      return { index, within: (t - acc) / step.ms, elapsed: t, finished: false };
    }
    acc += step.ms;
  }
  return { index: SCRIPT.length - 1, within: 1, elapsed: TOTAL, finished: true };
}

export function PipelineDemo() {
  const { ref, inView } = useInView<HTMLDivElement>(0.2);
  const [frame, setFrame] = useState<Frame>(() => frameAt(TOTAL));
  const [still, setStill] = useState(false);

  useEffect(() => {
    if (!inView) return;
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
      setStill(true);
      setFrame(frameAt(TOTAL));
      return;
    }
    let started = Date.now();
    const timer = window.setInterval(() => {
      const t = Date.now() - started;
      if (t >= TOTAL + HOLD_MS) {
        started = Date.now();
        setFrame(frameAt(0));
        return;
      }
      setFrame(frameAt(Math.min(t, TOTAL)));
    }, 60);
    return () => window.clearInterval(timer);
  }, [inView]);

  const current = SCRIPT[frame.index] ?? SCRIPT[SCRIPT.length - 1]!;
  const chartsDone = current.charts
    ? frame.finished
      ? current.charts
      : Math.min(current.charts, Math.floor(frame.within * (current.charts + 1)))
    : 0;
  const headline = frame.finished
    ? "Đã lập xong"
    : current.stage === "charts"
      ? `Vẽ biểu đồ ${chartsDone}/${current.charts}`
      : current.label;

  return (
    <div
      ref={ref}
      aria-hidden
      className="overflow-hidden rounded-2xl border border-brand-200 bg-white shadow-[0_30px_80px_-40px_rgba(15,50,40,0.35)]"
    >
      <header className="flex items-center justify-between gap-4 px-5 py-4 sm:px-6">
        <div className="flex items-center gap-3.5">
          {frame.finished ? (
            <span className="flex h-6 w-6 items-center justify-center rounded-full bg-brand-600">
              <svg viewBox="0 0 20 20" className="h-3.5 w-3.5" fill="none">
                <path d="m4.5 10.5 3.5 3.5 7.5-8" stroke="white" strokeWidth="2.6" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
            </span>
          ) : (
            <span className="relative flex h-6 w-6 items-center justify-center">
              <span className="absolute inset-0 rounded-full bg-brand-400/40 motion-safe:animate-pulse-ring" />
              <span className="h-6 w-6 animate-spin rounded-full border-2 border-brand-600 border-t-transparent motion-reduce:animate-none" />
            </span>
          )}
          <div>
            <p className="font-semibold text-ink">
              {frame.finished ? "Đã lập xong" : "Đang lập báo cáo"}
            </p>
            <p className="text-sm text-ink-muted">{headline}</p>
          </div>
        </div>
        <span className="font-display text-3xl tabular-nums text-ink">
          {(frame.elapsed / 1000).toFixed(1)}s
        </span>
      </header>

      <ol className="grid grid-cols-4 gap-px border-t border-black/5 bg-black/5 sm:grid-cols-8">
        {SCRIPT.map((step, index) => {
          const state =
            frame.finished || index < frame.index
              ? "done"
              : index === frame.index
                ? "active"
                : "pending";
          return (
            <li
              key={step.stage}
              className={`px-2 py-3 text-[11px] transition-colors duration-300 sm:px-3 sm:text-[12px] ${
                state === "active"
                  ? "bg-white text-ink"
                  : state === "done"
                    ? "bg-white/80 text-ink-muted"
                    : "bg-white/40 text-ink-subtle"
              }`}
            >
              <div className="flex items-center gap-1.5">
                {/* The mark is dropped on a phone; the cell's colour carries the state. */}
                {state === "active" ? (
                  <span className="hidden h-3 w-3 shrink-0 animate-spin rounded-full border-[1.5px] border-brand-600 border-t-transparent motion-reduce:animate-none sm:block" />
                ) : state === "done" ? (
                  <svg viewBox="0 0 20 20" className="hidden h-3 w-3 shrink-0 text-brand-700 motion-safe:animate-pop-in sm:block" fill="none">
                    <path d="m4.5 10.5 3.5 3.5 7.5-8" stroke="currentColor" strokeWidth="2.8" strokeLinecap="round" strokeLinejoin="round" />
                  </svg>
                ) : (
                  <span className="hidden h-3 w-3 shrink-0 rounded-full border border-black/15 sm:block" />
                )}
                <span className={`truncate font-semibold ${state === "active" ? "text-brand-700" : ""}`}>{step.label}</span>
              </div>
              <p className="mt-1 truncate text-[11px]">
                {state === "active" && step.charts
                  ? `${chartsDone}/${step.charts}`
                  : state === "done"
                    ? step.note ?? `${step.ms} ms`
                    : state === "active"
                      ? "đang chạy"
                      : "chờ"}
              </p>
              {state === "active" && step.charts ? (
                <div className="mt-1.5 h-1 overflow-hidden rounded-full bg-black/10">
                  <div
                    className="h-full bg-brand-600 transition-[width] duration-200"
                    style={{ width: `${(chartsDone / step.charts) * 100}%` }}
                  />
                </div>
              ) : null}
            </li>
          );
        })}
      </ol>

      {still ? null : (
        <div className="border-t border-black/5 bg-[#f7f9f8] px-5 py-2 text-[11px] uppercase tracking-[0.16em] text-ink-subtle">
          Bảng tiến độ thật của sản phẩm, đang tự chạy lại
        </div>
      )}
    </div>
  );
}
