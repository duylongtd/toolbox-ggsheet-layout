/**
 * The report page on a computer: the document itself, previewed before it is
 * downloaded.
 *
 * As with the phone, this is the real screen rather than a generic mock up, so
 * the page shows a document that matches the PDF the service actually renders,
 * down to the serif face and the green chart.
 */

const BARS = [26, 34, 58, 67, 100, 77];
const MONTHS = ["Tháng 3", "Tháng 4", "Tháng 5", "Tháng 6", "Tháng 7", "Tháng 8"];
const ROWS: Array<[string, string]> = [
  ["Số dòng đã phân tích", "1"],
  ["Số cột đã phân tích", "7"],
  ["Mức độ đầy đủ", "100%"],
];

export function PdfScreen({ animate }: { animate: boolean }) {
  const step = (index: number) => ({
    opacity: animate ? 1 : 0,
    transform: animate ? "none" : "translateY(0.7em)",
    transition: `opacity 0.5s ease-out ${520 + index * 120}ms, transform 0.5s cubic-bezier(0.22, 1, 0.36, 1) ${520 + index * 120}ms`,
  });

  return (
    <div className="flex h-full w-full flex-col bg-[#f4f6f4] text-ink">
      {/* Browser chrome */}
      <div className="flex shrink-0 items-center gap-[0.8em] border-b border-[#dfe4e0] bg-[#e9ecea] px-[1em] py-[0.7em]">
        <span aria-hidden className="flex gap-[0.35em]">
          {["#e0655d", "#e3b04b", "#5bb974"].map((colour) => (
            <span
              key={colour}
              className="h-[0.62em] w-[0.62em] rounded-full"
              style={{ backgroundColor: colour }}
            />
          ))}
        </span>
        <span className="flex-1 rounded-full bg-white px-[0.9em] py-[0.3em] text-[0.62em] text-ink-subtle">
          trolybaocao.vn/reports
        </span>
      </div>

      {/* Application bar */}
      <div className="flex shrink-0 items-center justify-between border-b border-[#dfe4e0] bg-white px-[1.4em] py-[0.75em]">
        <span className="flex items-center gap-[0.55em]">
          <span
            aria-hidden
            className="flex h-[1.5em] w-[1.5em] items-center justify-center rounded-[0.4em] bg-brand-600"
          >
            <span className="flex items-end gap-[0.11em]">
              <span className="h-[0.38em] w-[0.13em] rounded-[0.04em] bg-white" />
              <span className="h-[0.62em] w-[0.13em] rounded-[0.04em] bg-white" />
              <span className="h-[0.48em] w-[0.13em] rounded-[0.04em] bg-white" />
            </span>
          </span>
          <span className="text-[0.72em] font-semibold">Trợ lý báo cáo</span>
        </span>
        <span className="rounded-[0.45em] bg-brand-600 px-[0.9em] py-[0.42em] text-[0.62em] font-semibold text-white">
          Tải PDF
        </span>
      </div>

      {/* The document, previewed on the grey backdrop a viewer puts behind it */}
      <div className="flex flex-1 justify-center overflow-hidden bg-[#5d6663] px-[1.4em] pt-[1em]">
        <div
          style={step(0)}
          className="w-full max-w-[24.5em] rounded-t-[0.2em] bg-white px-[1.9em] pb-[1em] pt-[1.6em] shadow-[0_1em_2em_-0.8em_rgba(0,0,0,0.6)]"
        >
          <p className="font-serif text-[1.05em] font-bold leading-tight">
            Thống kê tổng số phản ánh qua 6 tháng
          </p>
          <p className="mt-[0.35em] font-serif text-[0.6em] italic text-ink-muted">
            Nguồn dữ liệu: quy-3.xlsx | Lập lúc: 08/09/2026
          </p>
          <span className="mt-[0.7em] block h-[1.5px] w-full bg-ink" />

          <p className="mt-[1.1em] font-serif text-[0.78em] font-bold">Tổng quan dữ liệu</p>
          <div style={step(1)} className="mt-[0.5em]">
            {ROWS.map(([label, value]) => (
              <div
                key={label}
                className="flex items-center justify-between border-b border-[#e6eae7] py-[0.36em] font-serif text-[0.62em]"
              >
                <span>{label}</span>
                <span>{value}</span>
              </div>
            ))}
          </div>

          <p className="mt-[0.95em] font-serif text-[0.78em] font-bold">Biểu đồ</p>
          <div style={step(2)} className="mt-[0.55em] flex h-[4.4em] gap-[0.5em]">
            {BARS.map((height, index) => (
              <div key={MONTHS[index]} className="flex h-full flex-1 flex-col items-center gap-[0.3em]">
                <div className="flex h-0 w-full flex-1 items-end">
                  <span
                    className="w-full origin-bottom bg-brand-600"
                    style={{
                      height: `${height}%`,
                      transform: animate ? "scaleY(1)" : "scaleY(0)",
                      transition: `transform 0.55s cubic-bezier(0.22, 1, 0.36, 1) ${950 + index * 80}ms`,
                    }}
                  />
                </div>
                <span className="whitespace-nowrap font-serif text-[0.45em] text-ink-subtle">
                  {MONTHS[index]}
                </span>
              </div>
            ))}
          </div>

          <div style={step(3)} className="mt-[1.1em] space-y-[0.34em]">
            <span className="block h-[0.28em] w-full rounded-full bg-[#e6eae7]" />
            <span className="block h-[0.28em] w-11/12 rounded-full bg-[#e6eae7]" />
            <span className="block h-[0.28em] w-4/5 rounded-full bg-[#e6eae7]" />
          </div>
        </div>
      </div>
    </div>
  );
}
