/**
 * What the product looks like on a phone once a report is finished.
 *
 * This is the real interface rather than a generic mock up: the same finished
 * state, the same green chart, the same wording. Everything is sized in em so
 * the whole screen scales from one font size on the frame around it.
 */

const BARS = [
  { label: "T3", height: 26 },
  { label: "T4", height: 34 },
  { label: "T5", height: 58 },
  { label: "T6", height: 67 },
  { label: "T7", height: 100 },
  { label: "T8", height: 77 },
];

export function PhoneScreen({ animate }: { animate: boolean }) {
  const step = (index: number) => ({
    opacity: animate ? 1 : 0,
    transform: animate ? "none" : "translateY(0.8em)",
    transition: `opacity 0.5s ease-out ${500 + index * 110}ms, transform 0.5s cubic-bezier(0.22, 1, 0.36, 1) ${500 + index * 110}ms`,
  });

  return (
    <div className="flex h-full w-full flex-col bg-[#f6f8f7] text-ink">
      {/* Status bar */}
      <div className="flex shrink-0 items-center justify-between px-[1.6em] pb-[0.4em] pt-[1.1em] text-[0.85em] font-semibold">
        <span>14:59</span>
        <span aria-hidden className="flex items-center gap-[0.35em]">
          <span className="flex items-end gap-[0.12em]">
            {[0.3, 0.45, 0.6, 0.75].map((height) => (
              <span
                key={height}
                className="w-[0.18em] rounded-[0.06em] bg-ink"
                style={{ height: `${height}em` }}
              />
            ))}
          </span>
          <span className="h-[0.62em] w-[1.15em] rounded-[0.2em] border border-ink px-[0.1em] py-[0.1em]">
            <span className="block h-full w-2/3 rounded-[0.08em] bg-ink" />
          </span>
        </span>
      </div>

      {/* Application bar */}
      <div className="flex shrink-0 items-center gap-[0.6em] border-b border-[#e2e8e5] bg-white px-[1.3em] py-[0.9em]">
        <span
          aria-hidden
          className="flex h-[1.9em] w-[1.9em] items-center justify-center rounded-[0.5em] bg-brand-600"
        >
          <span className="flex items-end gap-[0.14em]">
            <span className="h-[0.5em] w-[0.16em] rounded-[0.05em] bg-white" />
            <span className="h-[0.8em] w-[0.16em] rounded-[0.05em] bg-white" />
            <span className="h-[0.62em] w-[0.16em] rounded-[0.05em] bg-white" />
          </span>
        </span>
        <span className="text-[0.95em] font-semibold">Trợ lý báo cáo</span>
      </div>

      <div className="flex-1 space-y-[0.9em] overflow-hidden px-[1.1em] py-[1.1em]">
        {/* Finished */}
        <div style={step(0)} className="rounded-[0.9em] border border-[#dfe6e2] bg-white p-[1em]">
          <div className="flex items-center gap-[0.7em]">
            <span
              aria-hidden
              className="flex h-[1.9em] w-[1.9em] shrink-0 items-center justify-center rounded-full bg-brand-100"
            >
              <svg viewBox="0 0 20 20" className="h-[0.95em] w-[0.95em]" fill="none">
                <path
                  d="m4.5 10.5 3.5 3.5 7.5-8"
                  stroke="#0b8043"
                  strokeWidth="2.6"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
              </svg>
            </span>
            <span>
              <span className="block text-[0.92em] font-semibold leading-tight">
                Báo cáo đã xong
              </span>
              <span className="block text-[0.78em] leading-tight text-ink-muted">
                Thống kê phản ánh qua 6 tháng
              </span>
            </span>
          </div>
          <div className="mt-[0.9em] rounded-[0.6em] bg-brand-600 py-[0.62em] text-center text-[0.82em] font-semibold text-white">
            Xem và tải báo cáo
          </div>
        </div>

        {/* The chart the report was built around */}
        <div style={step(1)} className="rounded-[0.9em] border border-[#dfe6e2] bg-white p-[1em]">
          <p className="text-[0.86em] font-semibold leading-tight">
            Tổng số phản ánh qua 6 tháng
          </p>
          <div className="mt-[0.9em] flex h-[6.4em] gap-[0.45em]">
            {BARS.map((bar, index) => (
              <div key={bar.label} className="flex h-full flex-1 flex-col items-center gap-[0.35em]">
                <div className="flex h-0 w-full flex-1 items-end">
                  <span
                    className="w-full origin-bottom rounded-[0.14em] bg-brand-600"
                    style={{
                      height: `${bar.height}%`,
                      transform: animate ? "scaleY(1)" : "scaleY(0)",
                      transition: `transform 0.6s cubic-bezier(0.22, 1, 0.36, 1) ${900 + index * 85}ms`,
                    }}
                  />
                </div>
                <span className="text-[0.6em] font-semibold text-ink-subtle">{bar.label}</span>
              </div>
            ))}
          </div>
        </div>

        {/* The box the request was typed into */}
        <div style={step(2)} className="rounded-[0.9em] border border-[#dfe6e2] bg-white p-[0.75em]">
          <div className="flex items-center gap-[0.5em]">
            <span className="flex-1 rounded-[0.55em] bg-[#f1f4f2] px-[0.7em] py-[0.6em] text-[0.74em] text-ink-subtle">
              Bạn muốn sửa gì thêm?
            </span>
            <span className="rounded-[0.55em] bg-brand-600 px-[0.75em] py-[0.6em] text-[0.72em] font-semibold text-white">
              Gửi
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}
