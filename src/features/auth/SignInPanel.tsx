"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { useState } from "react";
import { Button } from "@/components/ui/Button";
import { ApiError, apiPost } from "@/lib/api/client";

interface SignInTarget {
  url: string;
  provider: string;
}

const CALLBACK_MESSAGES: Record<string, string> = {
  missing_code: "Đăng nhập chưa hoàn tất. Bạn thử lại giúp mình.",
  sign_in_failed: "Không đăng nhập được. Bạn thử lại giúp mình.",
};

/** The Google mark, drawn here so the button looks like the one people expect. */
function GoogleMark() {
  return (
    <svg viewBox="0 0 48 48" className="h-5 w-5" aria-hidden>
      <path fill="#4285F4" d="M45.1 24.5c0-1.6-.1-3.1-.4-4.5H24v8.5h11.8c-.5 2.8-2 5.1-4.4 6.700v5.6h7.1c4.2-3.8 6.6-9.5 6.6-16.3z" />
      <path fill="#34A853" d="M24 46c6 0 11-2 14.6-5.4l-7.1-5.6c-2 1.3-4.5 2.1-7.5 2.1-5.8 0-10.7-3.9-12.4-9.1H4.3v5.8C7.9 41.1 15.4 46 24 46z" />
      <path fill="#FBBC05" d="M11.6 28c-.4-1.3-.7-2.6-.7-4s.3-2.7.7-4v-5.8H4.3C2.8 17.1 2 20.4 2 24s.8 6.9 2.3 9.8l7.3-5.8z" />
      <path fill="#EA4335" d="M24 10.9c3.3 0 6.2 1.1 8.5 3.3l6.3-6.3C35 4.4 30 2 24 2 15.4 2 7.9 6.9 4.3 14.2l7.3 5.8c1.7-5.2 6.6-9.1 12.4-9.1z" />
    </svg>
  );
}

export function SignInPanel({ providerName }: { providerName: string }) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(
    CALLBACK_MESSAGES[searchParams.get("error") ?? ""] ?? null,
  );

  const isGoogle = providerName === "supabase";

  async function signIn() {
    setPending(true);
    setError(null);
    try {
      const target = await apiPost<SignInTarget>("/api/auth/signin", { redirectTo: "/" });
      if (target.url.startsWith("/")) router.push(target.url);
      else window.location.assign(target.url);
    } catch (caught) {
      setError(
        caught instanceof ApiError ? caught.message : "Hiện chưa đăng nhập được. Bạn thử lại sau.",
      );
      setPending(false);
    }
  }

  return (
    <div className="w-full max-w-md">
      <h1 className="text-2xl font-semibold tracking-tight text-ink">Đăng nhập</h1>
      <p className="mt-2 text-ink-muted">Để lưu lại các báo cáo bạn đã làm.</p>

      {error && (
        <p className="mt-5 rounded-lg bg-red-50 px-4 py-3 text-sm text-red-800" role="alert">
          {error}
        </p>
      )}

      <button
        type="button"
        onClick={signIn}
        disabled={pending}
        className="mt-7 flex w-full items-center justify-center gap-3 rounded-lg border border-[#dfe6e2] bg-white px-6 py-3.5 text-base font-medium text-ink transition-colors hover:border-brand-300 hover:bg-brand-50 disabled:opacity-60"
      >
        {isGoogle ? <GoogleMark /> : null}
        {pending
          ? "Đang chuyển..."
          : isGoogle
            ? "Tiếp tục với Google"
            : "Vào thử trên máy này"}
      </button>

      {isGoogle ? (
        <p className="mt-5 text-sm leading-relaxed text-ink-muted">
          Đăng nhập chỉ để xác nhận bạn là ai. Ứng dụng không xin quyền truy cập Google Sheets hay
          Google Drive của bạn.
        </p>
      ) : (
        <div className="mt-5 rounded-lg border border-amber-200 bg-amber-50 px-4 py-3.5 text-sm leading-relaxed text-amber-900">
          <p className="font-medium">Đăng nhập Google chưa được bật</p>
          <p className="mt-1">
            Môi trường này đang dùng đăng nhập thử trên máy. Để bật đăng nhập bằng Google, đặt{" "}
            <code className="rounded bg-amber-100 px-1 py-0.5 text-[13px]">AUTH_PROVIDER=supabase</code>{" "}
            cùng khoá Supabase trong tệp cấu hình.
          </p>
        </div>
      )}

      <p className="mt-8 text-sm text-ink-subtle">
        <Button variant="quiet" size="sm" onClick={() => router.push("/gioi-thieu")}>
          Tìm hiểu thêm
        </Button>
      </p>
    </div>
  );
}
