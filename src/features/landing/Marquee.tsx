/**
 * A ribbon of short phrases sliding across the page without end.
 *
 * Pure CSS: the list is rendered twice and the track slides by exactly half
 * its width, so the seam never shows. It pauses under the pointer so a phrase
 * can be read, and holds still for anyone who asked for less motion.
 */
const PHRASES = [
  "Excel",
  "Google Sheets",
  "Không cần công thức",
  "Biểu đồ tự chọn",
  "Duyệt trước khi chạy",
  "Nhận xét bằng tiếng Việt",
  "Tệp PDF sẵn nộp",
  "Số liệu giữ nguyên",
];

export function Marquee() {
  const items = [...PHRASES, ...PHRASES];
  return (
    <div
      aria-hidden
      className="group relative overflow-hidden border-y border-ink/10 bg-paper py-4"
      style={{
        maskImage: "linear-gradient(90deg, transparent, black 8%, black 92%, transparent)",
        WebkitMaskImage: "linear-gradient(90deg, transparent, black 8%, black 92%, transparent)",
      }}
    >
      <ul className="flex w-max animate-marquee gap-10 whitespace-nowrap px-5 motion-reduce:animate-none group-hover:[animation-play-state:paused]">
        {items.map((phrase, index) => (
          <li key={index} className="flex items-center gap-10">
            <span className="font-display text-[22px] uppercase tracking-wide text-ink sm:text-[26px]">
              {phrase}
            </span>
            <span className="h-2 w-2 rounded-full bg-brand-600" />
          </li>
        ))}
      </ul>
    </div>
  );
}
