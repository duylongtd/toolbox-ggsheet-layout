"use client";

import { AlertTriangle } from "lucide-react";
import { Button } from "@/components/ui/Button";

/** Client error boundary. The underlying message is never shown to the user. */
export default function GlobalError({ reset }: { error: Error; reset: () => void }) {
  return (
    <div className="flex min-h-screen items-center justify-center bg-slate-50 px-4">
      <div className="max-w-md text-center">
        <div className="mx-auto mb-3 w-fit rounded-full bg-red-50 p-3 text-red-700">
          <AlertTriangle className="h-6 w-6" aria-hidden />
        </div>
        <h1 className="text-lg font-semibold text-slate-900">Đã xảy ra lỗi</h1>
        <p className="mt-2 text-sm text-slate-500">
          Không hiển thị được trang này. Bạn thử lại giúp mình, nếu vẫn lỗi thì báo cho quản trị viên.
        </p>
        <Button className="mt-4" onClick={reset}>
          Thử lại
        </Button>
      </div>
    </div>
  );
}
