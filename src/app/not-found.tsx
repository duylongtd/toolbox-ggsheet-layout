import Link from "next/link";

export default function NotFound() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-slate-50 px-4">
      <div className="text-center">
        <h1 className="text-lg font-semibold text-slate-900">Không tìm thấy trang này</h1>
        <p className="mt-2 text-sm text-slate-500">
          Trang bạn tìm có thể đã được chuyển đi hoặc không còn nữa.
        </p>
        <Link
          href="/"
          className="mt-4 inline-block rounded-lg bg-blue-700 px-5 py-2.5 text-sm font-medium text-white hover:bg-blue-800"
        >
          Về trang làm báo cáo
        </Link>
      </div>
    </div>
  );
}
