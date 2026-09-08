import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";
import { AppError } from "@/server/http/errors";
import type { AuthProvider, AuthenticatedUser, SignInTarget } from "./types";

/**
 * Google login through Supabase Auth.
 *
 * Only the `openid email profile` scopes are requested. Requesting a Sheets or
 * Drive scope here would be a product level mistake, so the scope list is fixed
 * in code rather than configurable.
 */
const LOGIN_SCOPES = "openid email profile";

export class SupabaseAuthProvider implements AuthProvider {
  readonly name = "supabase";

  constructor(
    private readonly url: string,
    private readonly anonKey: string,
    private readonly appUrl: string,
  ) {}

  isConfigured(): boolean {
    return Boolean(this.url && this.anonKey);
  }

  private async client() {
    const cookieStore = await cookies();
    return createServerClient(this.url, this.anonKey, {
      cookies: {
        getAll: () => cookieStore.getAll(),
        setAll: (items) => {
          // Route handlers may set cookies; server components may not.
          try {
            items.forEach(({ name, value, options }) => cookieStore.set(name, value, options));
          } catch {
            /* Called from a server component render, which cannot mutate cookies. */
          }
        },
      },
    });
  }

  async getSignInTarget(redirectTo: string): Promise<SignInTarget> {
    const supabase = await this.client();
    const { data, error } = await supabase.auth.signInWithOAuth({
      provider: "google",
      options: {
        redirectTo: `${this.appUrl}/auth/callback?next=${encodeURIComponent(redirectTo)}`,
        scopes: LOGIN_SCOPES,
        skipBrowserRedirect: true,
      },
    });
    if (error || !data?.url) {
      throw new AppError("SIGN_IN_UNAVAILABLE", "Sign in is not available right now.", 503);
    }
    return { url: data.url, provider: "google" };
  }

  async completeSignIn(code: string): Promise<AuthenticatedUser> {
    const supabase = await this.client();
    const { data, error } = await supabase.auth.exchangeCodeForSession(code);
    if (error || !data.user) {
      throw new AppError("SIGN_IN_FAILED", "Sign in could not be completed.", 401);
    }
    return toUser(data.user);
  }

  async getCurrentUser(): Promise<AuthenticatedUser | null> {
    const supabase = await this.client();
    const { data, error } = await supabase.auth.getUser();
    if (error || !data.user) return null;
    return toUser(data.user);
  }

  async signOut(): Promise<void> {
    const supabase = await this.client();
    await supabase.auth.signOut();
  }
}

function toUser(user: {
  id: string;
  email?: string | null;
  user_metadata?: Record<string, unknown>;
}): AuthenticatedUser {
  const metadata = user.user_metadata ?? {};
  return {
    id: user.id,
    email: user.email ?? "",
    displayName:
      (metadata.full_name as string | undefined) ?? (metadata.name as string | undefined) ?? null,
    avatarUrl: (metadata.avatar_url as string | undefined) ?? null,
  };
}
