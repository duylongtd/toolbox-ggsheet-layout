import type { User } from "@/types";

/** Identity persistence, independent of the authentication provider. */
export interface UserRepository {
  findById(id: string): Promise<User | null>;
  findByEmail(email: string): Promise<User | null>;
  /** Creates the local record on first sign in and refreshes the profile after. */
  upsertFromAuth(input: {
    id: string;
    email: string;
    displayName: string | null;
    avatarUrl: string | null;
  }): Promise<User>;
  recordLogin(id: string): Promise<void>;
}
