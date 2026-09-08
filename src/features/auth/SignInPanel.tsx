"use client";

import { Database, LogIn } from "lucide-react";
import { useRouter, useSearchParams } from "next/navigation";
import { useState } from "react";
import { Alert } from "@/components/ui/Alert";
import { Button } from "@/components/ui/Button";
import { ApiError, apiPost } from "@/lib/api/client";
import { T } from "@/lib/format/vi";

interface SignInTarget {
  url: string;
  provider: string;
}

const CALLBACK_MESSAGES: Record<string, string> = {
  missing_code: "Đăng nhập chưa hoàn tất. Bạn thử lại giúp mình.",
  sign_in_failed: "Không đăng nhập được. Bạn thử lại giúp mình.",
};

/**
 * Sign in panel.
 *
 * The application asks Google only to confirm who the user is. It never
 * requests access to Google Sheets or Google Drive, which is stated here so the
 * user knows what they are approving.
 */
export function SignInPanel({ providerName }: { providerName: string }) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(
    CALLBACK_MESSAGES[searchParams.get("error") ?? ""] ?? null,
  );

  async function signIn() {
    setPending(true);
    setError(null);
    try {
      const target = await apiPost<SignInTarget>("/api/auth/signin", {
        redirectTo: "/",
      });
      if (target.url.startsWith("/")) {
        router.push(target.url);
      } else {
        window.location.assign(target.url);
      }
    } catch (caught) {
      setError(
        caught instanceof ApiError ? caught.message : "Hiện chưa đăng nhập được. Bạn thử lại sau giúp mình.",
      );
      setPending(false);
    }
  }

  return (
    <div className="w-full max-w-md">
      <div className="app-card p-8">
        <div className="mb-6 flex items-center gap-3">
          <span className="rounded-lg bg-blue-700 p-2 text-white">
            <Database className="h-5 w-5" aria-hidden />
          </span>
          <div>
            <h1 className="text-lg font-semibold text-slate-900">{T.appName}</h1>
            <p className="text-sm text-slate-500">{T.tagline}</p>
          </div>
        </div>

        {error && (
          <Alert level="danger" title="Chưa đăng nhập được" className="mb-4">
            {error}
          </Alert>
        )}

        <Button
          onClick={signIn}
          loading={pending}
          className="w-full"
          icon={<LogIn className="h-4 w-4" aria-hidden />}
        >
          {providerName === "dev" ? "Vào thử trên máy này" : "Đăng nhập bằng Google"}
        </Button>

        {providerName === "dev" ? (
          <p className="mt-4 rounded-lg bg-amber-50 p-3 text-xs text-amber-900">
            Môi trường này đang dùng đăng nhập thử. Cấu hình Supabase để bật đăng nhập bằng Google.
          </p>
        ) : (
          <p className="mt-4 text-xs leading-relaxed text-slate-500">
            Đăng nhập chỉ để xác nhận bạn là ai. Ứng dụng không xin quyền truy cập Google Sheets
            hay Google Drive của bạn. Muốn phân tích một bảng tính, bạn chia sẻ ở chế độ ai có
            đường dẫn đều xem được, hoặc tải thẳng tệp lên.
          </p>
        )}
      </div>
    </div>
  );
}
