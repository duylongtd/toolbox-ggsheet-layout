"use client";

import { FileText, LogOut, Plus, Sparkles } from "lucide-react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useState } from "react";
import { apiPost } from "@/lib/api/client";
import { T } from "@/lib/format/vi";
import type { User } from "@/types";

/**
 * The frame.
 *
 * Two destinations only: make a report, or find one made earlier. A navigation
 * list of six sections is a list of six decisions for someone who wants one
 * thing.
 */
export function AppShell({ user, children }: { user: User; children: React.ReactNode }) {
  const router = useRouter();
  const pathname = usePathname();
  const [signingOut, setSigningOut] = useState(false);

  async function signOut() {
    setSigningOut(true);
    try {
      await apiPost("/api/auth/signout");
      router.replace("/login");
      router.refresh();
    } finally {
      setSigningOut(false);
    }
  }

  const onReports = pathname.startsWith("/reports");

  return (
    <div className="min-h-screen bg-slate-50">
      <header className="border-b border-slate-200 bg-white">
        <div className="mx-auto flex h-16 max-w-5xl items-center justify-between gap-4 px-4">
          <Link href="/" className="flex items-center gap-2.5">
            <span className="rounded-lg bg-blue-700 p-2 text-white">
              <Sparkles className="h-4 w-4" aria-hidden />
            </span>
            <span className="text-base font-semibold text-slate-900">{T.appName}</span>
          </Link>

          <nav className="flex items-center gap-1" aria-label="Điều hướng chính">
            <Link
              href="/"
              aria-current={!onReports ? "page" : undefined}
              className={`flex items-center gap-2 rounded-lg px-3 py-2 text-sm font-medium ${
                !onReports ? "bg-blue-50 text-blue-800" : "text-slate-600 hover:bg-slate-100"
              }`}
            >
              <Plus className="h-4 w-4" aria-hidden />
              <span className="hidden sm:inline">Báo cáo mới</span>
            </Link>
            <Link
              href="/reports"
              aria-current={onReports ? "page" : undefined}
              className={`flex items-center gap-2 rounded-lg px-3 py-2 text-sm font-medium ${
                onReports ? "bg-blue-50 text-blue-800" : "text-slate-600 hover:bg-slate-100"
              }`}
            >
              <FileText className="h-4 w-4" aria-hidden />
              <span className="hidden sm:inline">Báo cáo đã làm</span>
            </Link>
            <button
              type="button"
              onClick={signOut}
              disabled={signingOut}
              title={user.email}
              className="ml-1 flex items-center gap-2 rounded-lg px-3 py-2 text-sm font-medium text-slate-500 hover:bg-slate-100 disabled:opacity-50"
            >
              <LogOut className="h-4 w-4" aria-hidden />
              <span className="hidden sm:inline">Thoát</span>
            </button>
          </nav>
        </div>
      </header>

      <main className="mx-auto max-w-5xl px-4 py-8">{children}</main>
    </div>
  );
}
