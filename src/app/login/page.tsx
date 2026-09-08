import { redirect } from "next/navigation";
import { Suspense } from "react";
import { SignInPanel } from "@/features/auth/SignInPanel";
import { serverEnv } from "@/server/infrastructure/config/env";
import { getCurrentUser } from "@/server/session";

export const dynamic = "force-dynamic";

export default async function LoginPage() {
  const user = await getCurrentUser();
  if (user) redirect("/");

  return (
    <div className="flex min-h-screen items-center justify-center bg-slate-50 px-4">
      <Suspense fallback={null}>
        <SignInPanel providerName={serverEnv.AUTH_PROVIDER} />
      </Suspense>
    </div>
  );
}
