import Link from "next/link";
import type { Metadata } from "next";
import { DesktopMock } from "@/features/landing/DesktopMock";
import { PhoneMock } from "@/features/landing/PhoneMock";
import { ReportSheet } from "@/features/landing/ReportSheet";
import { Reveal } from "@/features/landing/Reveal";

export const metadata: Metadata = {
  title: "Từ bảng số liệu đến báo cáo",
  description:
    "Đưa bảng số liệu vào, nói bạn muốn thống kê gì, nhận lại báo cáo PDF có biểu đồ và nhận xét.",
};

/**
 * The landing page runs as four blocks that never repeat each other: the
 * headline, the four steps, the report on a phone, the report on a computer.
 *
 * An earlier version said "báo cáo" in three different headings and printed the
 * same promise in the header, in the poster margin and again in the steps. Each
 * block now carries one idea and one heading, and the header is reduced to the
 * name and the way in.
 */

const STEPS = [
  ["01", "Tải lên", "Excel, CSV hoặc dán liên kết Google Sheets"],
  ["02", "Yêu cầu", "Gõ điều bạn muốn thống kê, bằng tiếng Việt"],
  ["03", "Duyệt", "Xem phương án hệ thống đề xuất rồi mới chạy"],
  ["04", "Nhận", "Bản PDF kèm biểu đồ, số liệu và nhận xét"],
];

export default function LandingPage() {
  return (
    <main className="min-h-screen overflow-x-hidden bg-ground text-ink">
      {/* Everything below the headline arrives on scroll, which needs scripts.
          Without them the page still has to be readable. */}
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
            className="rounded-full border border-ink/15 px-5 py-2 text-[13px] font-semibold transition-colors hover:border-ink"
          >
            Đăng nhập
          </Link>
        </header>

        {/* The poster */}
        <section className="animate-poster-in overflow-hidden rounded-2xl bg-paper">
          <div className="px-5 py-9 sm:px-9 sm:py-12 lg:px-14 lg:py-14">
            <div className="relative">
              <h1 className="font-display leading-[1.02] tracking-[-0.01em] text-[15vw] sm:text-[13.5vw] lg:pr-[45%] lg:text-[8.9vw] xl:text-[7.1rem]">
                <span className="block animate-wipe-in text-brand-600">BÁO CÁO</span>
                <span className="my-2.5 flex items-center gap-3 sm:my-3.5">
                  <span className="h-px w-8 shrink-0 bg-ink/20 sm:w-14" />
                  <span className="animate-fade-in font-sans text-[9px] font-semibold uppercase tracking-[0.3em] text-ink-subtle sm:text-[11px]">
                    Trong
                  </span>
                  <span className="h-px flex-1 bg-ink/12" />
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
                <p className="max-w-md text-[15px] leading-relaxed text-ink-muted sm:text-base">
                  Bạn đưa bảng số liệu và nói muốn thống kê gì. Hệ thống đề xuất phương án, bạn
                  duyệt, rồi nhận lại bản báo cáo hoàn chỉnh.
                </p>
                <Link
                  href="/login"
                  className="mt-7 inline-flex items-center gap-3 rounded-full bg-ink px-8 py-4 text-sm font-semibold text-paper transition-transform hover:-translate-y-0.5"
                >
                  Bắt đầu miễn phí
                  <span aria-hidden className="text-brand-400">
                    &rarr;
                  </span>
                </Link>
              </div>
            </div>
          </div>
        </section>
      </div>

      {/* The four steps, given a band of their own */}
      <section className="mt-14 bg-deep py-16 text-paper sm:mt-20 sm:py-20">
        <div className="mx-auto max-w-[1180px] px-4 sm:px-6 lg:px-8">
          <Reveal>
            <h2 className="font-display text-[10vw] leading-none sm:text-[6vw] lg:text-[3.4rem]">
              BỐN BƯỚC
            </h2>
          </Reveal>

          <div className="mt-9 grid gap-px overflow-hidden rounded-xl bg-deep-line sm:mt-12 sm:grid-cols-2 lg:grid-cols-4">
            {STEPS.map(([number, title, note], index) => (
              <Reveal
                key={number}
                delay={index * 90}
                distance={18}
                className="bg-deep-soft px-6 py-7 sm:px-7 sm:py-8"
              >
                <p className="font-display text-[2.4rem] leading-none text-brand-400 sm:text-[2.9rem]">
                  {number}
                </p>
                <p className="mt-4 text-lg font-semibold">{title}</p>
                <p className="mt-2 text-[14px] leading-relaxed text-paper/60">{note}</p>
              </Reveal>
            ))}
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

      {/* Closing */}
      <section className="bg-deep py-16 text-paper sm:py-20">
        <Reveal className="mx-auto max-w-[1180px] px-4 text-center sm:px-6 lg:px-8">
          <h2 className="mx-auto max-w-[16ch] font-display text-[11vw] leading-[1.14] sm:text-[6.5vw] lg:text-[3.8rem]">
            ĐƯA BẢNG SỐ LIỆU CỦA BẠN VÀO
          </h2>
          <Link
            href="/login"
            className="mt-8 inline-flex items-center gap-3 rounded-full bg-brand-600 px-8 py-4 text-sm font-semibold text-white transition-transform hover:-translate-y-0.5"
          >
            Làm báo cáo đầu tiên
            <span aria-hidden>&rarr;</span>
          </Link>
        </Reveal>
      </section>

      <footer className="mx-auto flex max-w-[1180px] flex-wrap items-center justify-between gap-3 px-4 py-8 text-[10px] font-semibold uppercase tracking-[0.2em] text-ink-subtle sm:px-6 lg:px-8">
        <span>Số liệu giữ nguyên trong hệ thống</span>
        <span>2026</span>
      </footer>
    </main>
  );
}
