import Link from "next/link";

export default function NotFound() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-[#f6f8f7] px-4">
      <div className="text-center">
        <h1 className="text-lg font-semibold text-ink">Không tìm thấy trang này</h1>
        <p className="mt-2 text-sm text-ink-muted">
          Trang bạn tìm có thể đã được chuyển đi hoặc không còn nữa.
        </p>
        <Link
          href="/"
          className="mt-4 inline-block rounded-lg bg-brand-600 px-5 py-2.5 text-sm font-medium text-white hover:bg-brand-700"
        >
          Về trang làm báo cáo
        </Link>
      </div>
    </div>
  );
}
