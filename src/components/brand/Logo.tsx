/**
 * The mark.
 *
 * Drawn here rather than taken from an icon set: a grid of cells with one
 * column rising out of it, which is what the product does to a spreadsheet.
 * Nothing in it is a generic glyph.
 */
export function LogoMark({ className = "h-8 w-8" }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 32 32"
      className={className}
      role="img"
      aria-label="Biểu trưng sản phẩm"
      fill="none"
    >
      <rect width="32" height="32" rx="8.5" fill="#0f9d58" />
      {/* The sheet grid. */}
      <rect x="7" y="7" width="18" height="18" rx="2.5" stroke="white" strokeOpacity="0.42" strokeWidth="1.4" />
      <path d="M7 12.6h18" stroke="white" strokeOpacity="0.42" strokeWidth="1.4" />
      <path d="M13.2 12.6V25" stroke="white" strokeOpacity="0.42" strokeWidth="1.4" />
      {/* Three columns growing out of the grid. */}
      <rect x="15.4" y="19" width="2.6" height="4.4" rx="1" fill="white" />
      <rect x="19.1" y="16.2" width="2.6" height="7.2" rx="1" fill="white" />
      <rect x="22.8" y="13.4" width="2.6" height="10" rx="1" fill="white" opacity="0.55" />
    </svg>
  );
}

export function LogoLockup({ compact = false }: { compact?: boolean }) {
  return (
    <span className="flex items-center gap-2.5">
      <LogoMark className={compact ? "h-7 w-7" : "h-9 w-9"} />
      <span className="flex flex-col leading-none">
        <span
          className={`font-semibold tracking-tight text-ink ${compact ? "text-[15px]" : "text-base"}`}
        >
          Trợ lý báo cáo
        </span>
        {!compact && (
          <span className="mt-0.5 text-[11px] font-medium uppercase tracking-[0.14em] text-ink-subtle">
            Dữ liệu thành tài liệu
          </span>
        )}
      </span>
    </span>
  );
}
