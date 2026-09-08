import "server-only";
import { serverEnv } from "@/server/infrastructure/config/env";
import { singleton } from "@/server/infrastructure/singleton";
import { DevAuthProvider } from "./dev";
import { SupabaseAuthProvider } from "./supabase";
import type { AuthProvider } from "./types";

/** Builds the configured authentication provider once per process. */
export function getAuthProvider(): AuthProvider {
  return singleton<AuthProvider>("authProvider", () => {
    if (serverEnv.AUTH_PROVIDER === "supabase") {
      if (!serverEnv.SUPABASE_URL || !serverEnv.SUPABASE_ANON_KEY) {
        throw new Error("AUTH_PROVIDER=supabase requires SUPABASE_URL and SUPABASE_ANON_KEY");
      }
      return new SupabaseAuthProvider(
        serverEnv.SUPABASE_URL,
        serverEnv.SUPABASE_ANON_KEY,
        serverEnv.APP_URL,
      );
    }
    return new DevAuthProvider(serverEnv.AUTH_SESSION_SECRET, serverEnv.isProduction);
  });
}

export type { AuthProvider, AuthenticatedUser, SignInTarget } from "./types";
