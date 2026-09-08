import "server-only";
import { redirect } from "next/navigation";
import { getAuthProvider } from "@/server/infrastructure/auth";
import { getRepositories } from "@/server/infrastructure/database";
import type { User } from "@/types";

/**
 * Session helpers for server components.
 *
 * Pages call `requireUser`, so an unauthenticated visitor is redirected before
 * any data is fetched.
 */

export async function getCurrentUser(): Promise<User | null> {
  const authenticated = await getAuthProvider().getCurrentUser();
  if (!authenticated) return null;
  return getRepositories().users.upsertFromAuth(authenticated);
}

export async function requireUser(): Promise<User> {
  const user = await getCurrentUser();
  if (!user) redirect("/login");
  return user;
}
