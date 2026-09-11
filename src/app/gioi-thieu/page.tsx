import Link from "next/link";
import type { Metadata } from "next";
import { Counter } from "@/features/landing/Counter";
import { DesktopMock } from "@/features/landing/DesktopMock";
import { Marquee } from "@/features/landing/Marquee";
import { PhoneMock } from "@/features/landing/PhoneMock";
import { PipelineDemo } from "@/features/landing/PipelineDemo";
import { ReportSheet } from "@/features/landing/ReportSheet";
import { Reveal } from "@/features/landing/Reveal";

export const metadata: Metadata = {
  title: "Từ bảng số liệu đến báo cáo",
  description:
    "Đưa bảng số liệu vào, nói bạn muốn thống kê gì, nhận lại báo cáo PDF có biểu đồ và nhận xét.",
};

/**
 * The landing page.
 *
 * Its motion comes from the content and not from decoration: the headline
 * wipes in, the report's figures count up and the sheet turns towards the
 * pointer, a ribbon of what the product does slides past, the four steps draw
 * their own line, and the product's real run panel plays itself. Nothing
 * pulses or drifts for its own sake, and every block carries one idea.
 */

const STEPS = [
  ["01", "Tải lên", "Excel, CSV hoặc dán liên kết Google Sheets"],
  ["02", "Yêu cầu", "Gõ điều bạn muốn thống kê, bằng tiếng Việt"],
  ["03", "Duyệt", "Xem phương án hệ thống đề xuất rồi mới chạy"],
  ["04", "Nhận", "Bản PDF kèm biểu đồ, số liệu và nhận xét"],
];

/** Facts about the product, not claims about the world. */
const FACTS: Array<{ value: number; suffix: string; label: string; note: string }> = [
  { value: 12, suffix: "", label: "biểu đồ mỗi báo cáo", note: "tự chọn kiểu, xem trước" },
  { value: 100, suffix: "%", label: "số liệu là số gốc", note: "mô hình không sinh ra con số nào" },
  { value: 1, suffix: "", label: "lần duyệt trước khi chạy", note: "không có thay đổi nào tự áp dụng" },
];

export default function LandingPage() {
  return (
    <main className="min-h-screen overflow-x-hidden bg-ground text-ink">
      <noscript>
        <style>{"[data-reveal]{opacity:1 !important;transform:none !important}"}</style>
      </noscript>

      <div className="mx-auto w-full max-w-[1180px] px-4 sm:px-6 lg:px-8">
        <header className="flex items-center justify-between gap-4 py-5 sm:py-6">
          <span className="flex items-center gap-2.5">
            <span
              aria-hidden
              className="flex h-7 w-7 items-center justify-center rounded-[8px] bg-brand-600"
            >
              <span className="flex items-end gap-[2px]">
                <span className="h-2 w-[3px] rounded-[1px] bg-white" />
                <span className="h-3.5 w-[3px] rounded-[1px] bg-white" />
                <span className="h-2.5 w-[3px] rounded-[1px] bg-white" />
              </span>
            </span>
            <span className="text-sm font-semibold tracking-tight">Trợ lý báo cáo</span>
          </span>
          <Link
            href="/login"
            className="rounded-full border border-ink/15 px-5 py-2 text-[13px] font-semibold transition-all hover:-translate-y-0.5 hover:border-ink hover:shadow-[0_8px_24px_-12px_rgba(0,0,0,0.35)]"
          >
            Đăng nhập
          </Link>
        </header>

        {/* The poster */}
        <section className="animate-poster-in relative overflow-hidden rounded-2xl bg-paper">
          {/* One quiet light behind the sheet, so the paper reads as lit rather than flat. */}
          <div
            aria-hidden
            className="pointer-events-none absolute -right-32 -top-32 h-[520px] w-[520px] rounded-full opacity-70"
            style={{
              background:
                "radial-gradient(circle, rgba(15,157,88,0.14) 0%, rgba(15,157,88,0) 62%)",
            }}
          />
          <div className="relative px-5 py-9 sm:px-9 sm:py-12 lg:px-14 lg:py-14">
            <div className="relative">
              <h1 className="font-display leading-[1.02] tracking-[-0.01em] text-[15vw] sm:text-[13.5vw] lg:pr-[45%] lg:text-[8.9vw] xl:text-[7.1rem]">
                <span className="block animate-wipe-in text-brand-600">BÁO CÁO</span>
                <span className="my-2.5 flex items-center gap-3 sm:my-3.5">
                  <span
                    className="h-px w-8 origin-left animate-draw-x bg-ink/25 sm:w-14"
                    style={{ animationDelay: "500ms" }}
                  />
                  <span
                    className="animate-fade-in font-sans text-[9px] font-semibold uppercase tracking-[0.3em] text-ink-subtle sm:text-[11px]"
                    style={{ animationDelay: "700ms" }}
                  >
                    Trong
                  </span>
                  <span
                    className="h-px flex-1 origin-left animate-draw-x bg-ink/12"
                    style={{ animationDelay: "600ms" }}
                  />
                </span>
                <span
                  className="block animate-wipe-in text-ink"
                  style={{ animationDelay: "260ms" }}
                >
                  MỘT BUỔI
                </span>
              </h1>

              <div className="mt-8 lg:absolute lg:right-0 lg:top-0 lg:mt-0 lg:w-[41%]">
                <ReportSheet />
              </div>

              <div className="mt-9 lg:mt-11 lg:pr-[45%]">
                <p
                  className="max-w-md animate-fade-up text-[15px] leading-relaxed text-ink-muted sm:text-base"
                  style={{ animationDelay: "900ms" }}
                >
                  Bạn đưa bảng số liệu và nói muốn thống kê gì. Hệ thống đề xuất phương án, bạn
                  duyệt, rồi nhận lại bản báo cáo hoàn chỉnh.
                </p>
                <Link
                  href="/login"
                  className="group relative mt-7 inline-flex animate-fade-up items-center gap-3 overflow-hidden rounded-full bg-ink px-8 py-4 text-sm font-semibold text-paper transition-transform hover:-translate-y-0.5"
                  style={{ animationDelay: "1050ms" }}
                >
                  {/* A light sweeps across on hover. */}
                  <span
                    aria-hidden
                    className="pointer-events-none absolute inset-y-0 left-0 w-1/3 bg-white/15 opacity-0 group-hover:animate-sheen group-hover:opacity-100"
                  />
                  <span className="relative">Bắt đầu miễn phí</span>
                  <span
                    aria-hidden
                    className="relative text-brand-400 transition-transform group-hover:translate-x-1"
                  >
                    &rarr;
                  </span>
                </Link>
              </div>
            </div>
          </div>
        </section>
      </div>

      {/* What it handles, sliding past */}
      <div className="mt-10 sm:mt-14">
        <Marquee />
      </div>

      {/* The product's own run panel, playing itself */}
      <section className="py-16 sm:py-24">
        <div className="mx-auto max-w-[1180px] px-4 sm:px-6 lg:px-8">
          <Reveal className="mx-auto max-w-2xl text-center">
            <p className="text-[10px] font-semibold uppercase tracking-[0.26em] text-brand-700">
              Xem nó làm việc
            </p>
            <h2 className="mt-3 font-display text-[11vw] leading-[1.03] sm:text-[7vw] lg:text-[3.6rem]">
              TỪNG BƯỚC, NGAY LÚC CHẠY
            </h2>
            <p className="mt-4 text-[15px] leading-relaxed text-ink-muted">
              Không phải vòng xoay chờ. Bạn thấy đang đến đoạn nào, đã vẽ mấy biểu đồ, và nếu dừng
              thì dừng ở đâu.
            </p>
          </Reveal>
          <Reveal delay={150} className="mx-auto mt-10 max-w-4xl">
            <PipelineDemo />
          </Reveal>
        </div>
      </section>

      {/* The four steps, joined by a line that draws itself */}
      <section className="bg-deep py-16 text-paper sm:py-24">
        <div className="mx-auto max-w-[1180px] px-4 sm:px-6 lg:px-8">
          <Reveal>
            <h2 className="font-display text-[10vw] leading-none sm:text-[6vw] lg:text-[3.4rem]">
              BỐN BƯỚC
            </h2>
          </Reveal>

          <div className="relative mt-10 sm:mt-14">
            <Reveal className="absolute left-0 right-0 top-6 hidden lg:block" distance={0}>
              <div
                className="h-px origin-left animate-draw-x bg-brand-400/60"
                style={{ animationDelay: "200ms" }}
              />
            </Reveal>
            <ol className="grid gap-6 sm:grid-cols-2 lg:grid-cols-4 lg:gap-8">
              {STEPS.map(([number, title, note], index) => (
                <Reveal key={number} delay={200 + index * 160} distance={22}>
                  <li className="group relative rounded-xl bg-deep-soft p-6 transition-transform duration-300 hover:-translate-y-1.5 sm:p-7">
                    <span
                      className="relative z-10 flex h-12 w-12 items-center justify-center rounded-full bg-brand-600 font-display text-xl text-white shadow-[0_10px_30px_-10px_rgba(15,157,88,0.8)] motion-safe:animate-pop-in"
                      style={{ animationDelay: `${500 + index * 160}ms` }}
                    >
                      {number}
                    </span>
                    <p className="mt-5 text-lg font-semibold">{title}</p>
                    <p className="mt-2 text-[14px] leading-relaxed text-paper/60">{note}</p>
                    <span
                      aria-hidden
                      className="absolute inset-x-6 bottom-0 h-px origin-left scale-x-0 bg-brand-400 transition-transform duration-500 group-hover:scale-x-100"
                    />
                  </li>
                </Reveal>
              ))}
            </ol>
          </div>
        </div>
      </section>

      {/* The report on a phone */}
      <section className="overflow-hidden py-16 sm:py-24">
        <div className="mx-auto grid max-w-[1180px] items-center gap-12 px-4 sm:px-6 lg:grid-cols-2 lg:gap-6 lg:px-8">
          <Reveal className="lg:pr-8">
            <p className="text-[10px] font-semibold uppercase tracking-[0.26em] text-brand-700">
              Trên điện thoại
            </p>
            <h2 className="mt-3 font-display text-[11vw] leading-[1.03] sm:text-[7vw] lg:text-[3.6rem]">
              MỞ RA LÀ THẤY
            </h2>
            <p className="mt-4 max-w-sm text-[15px] leading-relaxed text-ink-muted">
              Báo cáo dựng xong nằm sẵn trong máy. Xem biểu đồ, tải bản PDF, hoặc gõ thêm một
              yêu cầu ngay tại đó.
            </p>
          </Reveal>
          <div className="lg:pl-4">
            <PhoneMock />
          </div>
        </div>
      </section>

      {/* The same report on a computer */}
      <section className="overflow-hidden bg-paper py-16 sm:py-24">
        <div className="mx-auto grid max-w-[1180px] items-center gap-12 px-4 sm:px-6 lg:grid-cols-2 lg:gap-10 lg:px-8">
          <div className="lg:order-2 lg:pl-6">
            <Reveal className="lg:pl-4">
              <p className="text-[10px] font-semibold uppercase tracking-[0.26em] text-brand-700">
                Trên máy tính
              </p>
              <h2 className="mt-3 font-display text-[11vw] leading-[1.03] sm:text-[7vw] lg:text-[3.6rem]">
                XEM TRƯỚC KHI TẢI
              </h2>
              <p className="mt-4 max-w-sm text-[15px] leading-relaxed text-ink-muted">
                Bản PDF hiện ngay trong trình duyệt. Đọc hết từng trang, thấy đúng rồi mới tải
                về nộp.
              </p>
            </Reveal>
          </div>
          <div className="lg:order-1">
            <DesktopMock />
          </div>
        </div>
      </section>

      {/* Three things that are true of the product */}
      <section className="py-16 sm:py-20">
        <div className="mx-auto grid max-w-[1180px] gap-px overflow-hidden rounded-2xl border border-ink/10 bg-ink/10 px-0 sm:grid-cols-3">
          {FACTS.map((fact, index) => (
            <Reveal key={fact.label} delay={index * 120} className="bg-paper px-8 py-9 text-center">
              <p className="font-display text-[3.4rem] leading-none text-brand-600 sm:text-[4rem]">
                <Counter value={fact.value} duration={1200} />
                {fact.suffix}
              </p>
              <p className="mt-3 text-base font-semibold">{fact.label}</p>
              <p className="mt-1 text-[13px] text-ink-subtle">{fact.note}</p>
            </Reveal>
          ))}
        </div>
      </section>

      {/* Closing */}
      <section className="bg-deep py-20 text-paper sm:py-28">
        <Reveal className="mx-auto max-w-[1180px] px-4 text-center sm:px-6 lg:px-8">
          <h2 className="mx-auto max-w-[16ch] font-display text-[11vw] leading-[1.14] sm:text-[6.5vw] lg:text-[3.8rem]">
            ĐƯA BẢNG SỐ LIỆU CỦA BẠN VÀO
          </h2>
          <div className="relative mx-auto mt-9 w-fit">
            <Link
              href="/login"
              className="group relative inline-flex items-center gap-3 overflow-hidden rounded-full bg-brand-600 px-9 py-4 text-sm font-semibold text-white shadow-[0_18px_50px_-18px_rgba(63,177,118,0.9)] transition-all hover:-translate-y-0.5 hover:shadow-[0_22px_60px_-16px_rgba(63,177,118,1)]"
            >
              <span
                aria-hidden
                className="pointer-events-none absolute inset-y-0 left-0 w-1/3 bg-white/20 opacity-0 group-hover:animate-sheen group-hover:opacity-100"
              />
              <span className="relative">Làm báo cáo đầu tiên</span>
              <span aria-hidden className="relative transition-transform group-hover:translate-x-1">
                &rarr;
              </span>
            </Link>
          </div>
        </Reveal>
      </section>

      <footer className="mx-auto flex max-w-[1180px] flex-wrap items-center justify-between gap-3 px-4 py-8 text-[10px] font-semibold uppercase tracking-[0.2em] text-ink-subtle sm:px-6 lg:px-8">
        <span>Số liệu giữ nguyên trong hệ thống</span>
        <span>2026</span>
      </footer>
    </main>
  );
}
