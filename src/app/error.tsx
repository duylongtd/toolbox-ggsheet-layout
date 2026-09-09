"use client";

import { Button } from "@/components/ui/Button";

/** Client error boundary. The underlying message is never shown to the user. */
export default function GlobalError({ reset }: { error: Error; reset: () => void }) {
  return (
    <div className="flex min-h-screen items-center justify-center bg-[#f6f8f7] px-4">
      <div className="max-w-md text-center">
        <div className="mx-auto mb-3 w-fit rounded-full bg-red-50 p-3 text-red-700">
          {/* Drawn here rather than pulled from an icon package: this was the
              only icon in the application, and the package came to about half a
              megabyte for it. */}
          <svg viewBox="0 0 24 24" className="h-6 w-6" fill="none" aria-hidden>
            <path
              d="M12 4.5 2.8 20h18.4L12 4.5Z"
              stroke="currentColor"
              strokeWidth="1.8"
              strokeLinejoin="round"
            />
            <path d="M12 10v4" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
            <circle cx="12" cy="17" r="1" fill="currentColor" />
          </svg>
        </div>
        <h1 className="text-lg font-semibold text-ink">Đã xảy ra lỗi</h1>
        <p className="mt-2 text-sm text-ink-muted">
          Không hiển thị được trang này. Bạn thử lại giúp mình, nếu vẫn lỗi thì báo cho quản trị viên.
        </p>
        <Button className="mt-4" onClick={reset}>
          Thử lại
        </Button>
      </div>
    </div>
  );
}
