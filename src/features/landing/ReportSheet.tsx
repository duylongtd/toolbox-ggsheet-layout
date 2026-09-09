/**
 * The subject of the poster.
 *
 * The reference layout puts a photograph over the headline so the two overlap
 * and the page gains depth. This product has no photograph; what it makes is a
 * document, so the document is the subject, drawn here rather than mocked up in
 * an image editor. Drawing it keeps it sharp at any size and lets the bars grow
 * as the page arrives.
 */

const BARS = [
  { label: "Tháng 3", height: 22 },
  { label: "Tháng 4", height: 30 },
  { label: "Tháng 5", height: 55 },
  { label: "Tháng 6", height: 64 },
  { label: "Tháng 7", height: 100 },
  { label: "Tháng 8", height: 76 },
];

export function ReportSheet() {
  return (
    <div aria-hidden className="relative">
      {/* A second sheet behind, so the stack reads as paper rather than a card. */}
      <div className="absolute -right-5 top-6 hidden h-full w-full rotate-[2.5deg] rounded-[3px] bg-white/45 shadow-[0_30px_60px_-30px_rgba(0,0,0,0.45)] sm:block" />

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
          <span className="mt-1 h-6 w-6 shrink-0 rounded-full bg-brand-600" />
        </div>

        <div className="mt-4 grid grid-cols-3 gap-2.5">
          {[
            ["8.836", "Tổng số"],
            ["3.566", "Đã xử lý"],
            ["63,4%", "Hài lòng"],
          ].map(([value, label]) => (
            <div key={label} className="border-l-2 border-brand-600 pl-2.5">
              <p className="font-display text-[19px] leading-none text-ink sm:text-[23px]">{value}</p>
              <p className="mt-1 text-[8px] font-semibold uppercase tracking-[0.14em] text-ink-subtle">
                {label}
              </p>
            </div>
          ))}
        </div>

        <div className="mt-5 flex h-24 gap-2 sm:h-32">
          {BARS.map((bar, index) => (
            <div key={bar.label} className="flex h-full flex-1 flex-col items-center gap-1.5">
              <div className="flex h-0 w-full flex-1 items-end">
                <span
                  className="w-full origin-bottom animate-rise-bar rounded-[2px] bg-brand-600"
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
    </div>
  );
}
