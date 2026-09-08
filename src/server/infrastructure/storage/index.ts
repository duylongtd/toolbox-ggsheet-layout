import "server-only";
import { serverEnv } from "@/server/infrastructure/config/env";
import { singleton } from "@/server/infrastructure/singleton";
import { LocalStorageProvider } from "./local";
import { SupabaseStorageProvider } from "./supabase";
import type { StorageProvider } from "./types";

/** Builds the configured storage provider once per process. */
export function getStorageProvider(): StorageProvider {
  return singleton<StorageProvider>("storageProvider", () => {
    if (serverEnv.STORAGE_DRIVER === "supabase") {
      if (!serverEnv.SUPABASE_URL || !serverEnv.SUPABASE_SERVICE_ROLE_KEY) {
        throw new Error(
          "STORAGE_DRIVER=supabase requires SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY",
        );
      }
      return new SupabaseStorageProvider(
        serverEnv.SUPABASE_URL,
        serverEnv.SUPABASE_SERVICE_ROLE_KEY,
        serverEnv.STORAGE_BUCKET,
      );
    }
    return new LocalStorageProvider(serverEnv.STORAGE_LOCAL_DIR);
  });
}

export type { StorageProvider, StoredObject } from "./types";
