"use client";

import { Counter } from "./Counter";
import { Tilt } from "./Tilt";

/**
 * The subject of the poster.
 *
 * The reference layout puts a photograph over the headline so the two overlap
 * and the page gains depth. This product has no photograph; what it makes is a
 * document, so the document is the subject, drawn here rather than mocked up in
 * an image editor. Drawing it keeps it sharp at any size, lets the bars grow
 * and the figures count up as the page arrives, and lets the sheet answer the
 * pointer like a card held in the hand.
 */

const BARS = [
  { label: "Tháng 3", height: 22 },
  { label: "Tháng 4", height: 30 },
  { label: "Tháng 5", height: 55 },
  { label: "Tháng 6", height: 64 },
  { label: "Tháng 7", height: 100 },
  { label: "Tháng 8", height: 76 },
];

const FIGURES: Array<{ value: number; label: string; format: (n: number) => string }> = [
  { value: 8836, label: "Tổng số", format: (n) => n.toLocaleString("vi-VN") },
  { value: 3566, label: "Đã xử lý", format: (n) => n.toLocaleString("vi-VN") },
  { value: 634, label: "Hài lòng", format: (n) => `${(n / 10).toFixed(1).replace(".", ",")}%` },
];

export function ReportSheet() {
  return (
    <div aria-hidden className="relative motion-safe:animate-hover">
      {/* Sheets behind, fanned, so the stack reads as paper rather than a card. */}
      <div className="absolute -right-6 top-8 hidden h-full w-full rotate-[4deg] rounded-[3px] bg-white/35 shadow-[0_30px_60px_-30px_rgba(0,0,0,0.35)] sm:block" />
      <div className="absolute -right-3 top-4 hidden h-full w-full rotate-[2deg] rounded-[3px] bg-white/60 shadow-[0_30px_60px_-30px_rgba(0,0,0,0.4)] sm:block" />

      <Tilt max={6}>
        <div className="relative rounded-[3px] bg-white px-6 pb-6 pt-7 shadow-[0_40px_90px_-40px_rgba(0,0,0,0.6)] sm:px-8 sm:pb-8">
          <div className="flex items-start justify-between border-b-2 border-ink pb-3">
            <div>
              <p className="font-display text-[26px] leading-none tracking-tight text-ink sm:text-[32px]">
                BÁO CÁO QUÝ III
              </p>
              <p className="mt-1.5 text-[9px] font-semibold uppercase tracking-[0.18em] text-ink-subtle">
                Tổng hợp phản ánh, góp ý
              </p>
            </div>
            {/* A live mark: the report is fresh, not a print from last year. */}
            <span className="relative mt-1 flex h-6 w-6 shrink-0 items-center justify-center">
              <span className="absolute inset-0 rounded-full bg-brand-500/50 motion-safe:animate-pulse-ring" />
              <span className="h-6 w-6 rounded-full bg-brand-600" />
            </span>
          </div>

          <div className="mt-4 grid grid-cols-3 gap-2.5">
            {FIGURES.map((figure) => (
              <div key={figure.label} className="border-l-2 border-brand-600 pl-2.5">
                <p className="font-display text-[19px] leading-none text-ink sm:text-[23px]">
                  <Counter value={figure.value} format={figure.format} duration={1600} />
                </p>
                <p className="mt-1 text-[8px] font-semibold uppercase tracking-[0.14em] text-ink-subtle">
                  {figure.label}
                </p>
              </div>
            ))}
          </div>

          <div className="mt-5 flex h-24 gap-2 sm:h-32">
            {BARS.map((bar, index) => (
              <div key={bar.label} className="flex h-full flex-1 flex-col items-center gap-1.5">
                <div className="flex h-0 w-full flex-1 items-end">
                  <span
                    className="w-full origin-bottom animate-rise-bar rounded-[2px] bg-brand-600 transition-colors hover:bg-brand-700"
                    style={{
                      height: `${bar.height}%`,
                      animationDelay: `${600 + index * 90}ms`,
                    }}
                  />
                </div>
                <span className="whitespace-nowrap text-[7px] font-semibold uppercase text-ink-subtle">
                  {bar.label}
                </span>
              </div>
            ))}
          </div>

          <div className="mt-5 space-y-1.5 border-t border-[#e4e8e5] pt-4">
            <span className="block h-[3px] w-full rounded-full bg-[#e4e8e5]" />
            <span className="block h-[3px] w-11/12 rounded-full bg-[#e4e8e5]" />
            <span className="block h-[3px] w-4/5 rounded-full bg-[#e4e8e5]" />
          </div>
        </div>
      </Tilt>
    </div>
  );
}
