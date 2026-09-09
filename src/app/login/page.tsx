import Link from "next/link";
import { redirect } from "next/navigation";
import { Suspense } from "react";
import { LogoLockup } from "@/components/brand/Logo";
import { SignInPanel } from "@/features/auth/SignInPanel";
import { serverEnv } from "@/server/infrastructure/config/env";
import { getCurrentUser } from "@/server/session";

export const dynamic = "force-dynamic";

export default async function LoginPage() {
  const user = await getCurrentUser();
  if (user) redirect("/");

  return (
    <div className="flex min-h-screen flex-col bg-white">
      <header className="border-b border-[#dfe6e2]">
        <div className="mx-auto flex h-16 max-w-6xl items-center justify-between px-5">
          <Link href="/gioi-thieu" aria-label="Trang giới thiệu">
            <LogoLockup />
          </Link>
        </div>
      </header>

      <main className="flex flex-1 items-center justify-center px-5 py-14">
        <Suspense fallback={null}>
          <SignInPanel providerName={serverEnv.AUTH_PROVIDER} />
        </Suspense>
      </main>
    </div>
  );
}
