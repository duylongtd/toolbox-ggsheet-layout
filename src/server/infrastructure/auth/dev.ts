import { createHmac, timingSafeEqual } from "node:crypto";
import { cookies } from "next/headers";
import { AppError } from "@/server/http/errors";
import type { AuthProvider, AuthenticatedUser, SignInTarget } from "./types";

const COOKIE_NAME = "datainsight_dev_session";
const MAX_AGE_SECONDS = 60 * 60 * 8;

/**
 * Development only authentication.
 *
 * It exists so the product is runnable without Supabase credentials. It issues
 * a signed local cookie for a fixed developer identity and refuses to run in
 * production. It is not a stand in for real authentication and never pretends
 * to be Google.
 */
export class DevAuthProvider implements AuthProvider {
  readonly name = "dev";

  constructor(
    private readonly secret: string,
    private readonly isProduction: boolean,
  ) {
    if (isProduction) {
      throw new Error("DevAuthProvider must never be used in production");
    }
  }

  isConfigured(): boolean {
    return !this.isProduction;
  }

  async getSignInTarget(redirectTo: string): Promise<SignInTarget> {
    return { url: `/auth/callback?code=dev&next=${encodeURIComponent(redirectTo)}`, provider: "dev" };
  }

  async completeSignIn(): Promise<AuthenticatedUser> {
    const user = developerIdentity();
    const cookieStore = await cookies();
    cookieStore.set(COOKIE_NAME, this.sign(user.id), {
      httpOnly: true,
      sameSite: "lax",
      secure: false,
      path: "/",
      maxAge: MAX_AGE_SECONDS,
    });
    return user;
  }

  async getCurrentUser(): Promise<AuthenticatedUser | null> {
    const cookieStore = await cookies();
    const raw = cookieStore.get(COOKIE_NAME)?.value;
    if (!raw) return null;

    const user = developerIdentity();
    return this.verify(raw, user.id) ? user : null;
  }

  async signOut(): Promise<void> {
    const cookieStore = await cookies();
    cookieStore.delete(COOKIE_NAME);
  }

  private sign(subject: string): string {
    const signature = createHmac("sha256", this.secret).update(subject).digest("hex");
    return `${subject}.${signature}`;
  }

  private verify(raw: string, expectedSubject: string): boolean {
    const separator = raw.lastIndexOf(".");
    if (separator < 0) return false;
    const subject = raw.slice(0, separator);
    const signature = raw.slice(separator + 1);
    if (subject !== expectedSubject) return false;

    const expected = createHmac("sha256", this.secret).update(subject).digest("hex");
    const provided = Buffer.from(signature, "utf8");
    const reference = Buffer.from(expected, "utf8");
    return provided.length === reference.length && timingSafeEqual(provided, reference);
  }
}

/** Fixed identity used by the development provider. */
export function developerIdentity(): AuthenticatedUser {
  return {
    id: "00000000-0000-4000-8000-000000000001",
    email: "developer@localhost",
    displayName: "Local developer",
    avatarUrl: null,
  };
}

export function assertDevProviderAllowed(isProduction: boolean): void {
  if (isProduction) {
    throw new AppError(
      "AUTH_NOT_CONFIGURED",
      "Authentication is not configured for this environment.",
      503,
    );
  }
}
