"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useState } from "react";
import { LogoLockup } from "@/components/brand/Logo";
import { apiPost } from "@/lib/api/client";
import type { User } from "@/types";

/**
 * The frame.
 *
 * Two destinations: make a report, or open one made earlier. A person who wants
 * one thing should not be handed a list of six.
 */
export function AppShell({ user, children }: { user: User; children: React.ReactNode }) {
  const router = useRouter();
  const pathname = usePathname();
  const [signingOut, setSigningOut] = useState(false);

  async function signOut() {
    setSigningOut(true);
    try {
      await apiPost("/api/auth/signout");
      router.replace("/gioi-thieu");
      router.refresh();
    } finally {
      setSigningOut(false);
    }
  }

  const onReports = pathname.startsWith("/reports");
  const linkClass = (active: boolean) =>
    `rounded-lg px-3.5 py-2 text-sm font-medium transition-colors ${
      active ? "bg-brand-50 text-brand-800" : "text-ink-muted hover:bg-[#eef1ef] hover:text-ink"
    }`;

  return (
    <div className="min-h-screen">
      <header className="sticky top-0 z-20 border-b border-[#dfe6e2] bg-white/85 backdrop-blur">
        <div className="mx-auto flex h-16 max-w-5xl items-center justify-between gap-4 px-4">
          <Link href="/" aria-label="Trang làm báo cáo">
            <LogoLockup compact />
          </Link>

          <nav className="flex items-center gap-1" aria-label="Điều hướng chính">
            <Link href="/" aria-current={!onReports ? "page" : undefined} className={linkClass(!onReports)}>
              Làm báo cáo
            </Link>
            <Link
              href="/reports"
              aria-current={onReports ? "page" : undefined}
              className={linkClass(onReports)}
            >
              Báo cáo đã làm
            </Link>
            <span className="mx-1 hidden h-5 w-px bg-[#dfe6e2] sm:block" />
            <button
              type="button"
              onClick={signOut}
              disabled={signingOut}
              title={user.email}
              className="rounded-lg px-3.5 py-2 text-sm font-medium text-ink-subtle transition-colors hover:bg-[#eef1ef] hover:text-ink disabled:opacity-50"
            >
              Thoát
            </button>
          </nav>
        </div>
      </header>

      <main className="mx-auto max-w-5xl px-4 py-9">{children}</main>
    </div>
  );
}
