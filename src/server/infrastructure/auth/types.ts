import type { User } from "@/types";

/**
 * Authentication abstraction.
 *
 * The application only needs a Google *login*. It never requests Google Sheets
 * or Drive scopes, and it never reuses the user's browser session to reach
 * Google APIs.
 */

export interface AuthenticatedUser {
  id: string;
  email: string;
  displayName: string | null;
  avatarUrl: string | null;
}

export interface SignInTarget {
  /** Where the browser should be sent to start the provider flow. */
  url: string;
  provider: string;
}

export interface AuthProvider {
  readonly name: string;
  /** True when the provider has everything it needs to authenticate a user. */
  isConfigured(): boolean;
  getSignInTarget(redirectTo: string): Promise<SignInTarget>;
  /** Exchanges a provider callback code for a session and sets the cookie. */
  completeSignIn(code: string): Promise<AuthenticatedUser>;
  getCurrentUser(): Promise<AuthenticatedUser | null>;
  signOut(): Promise<void>;
}

export type { User };
