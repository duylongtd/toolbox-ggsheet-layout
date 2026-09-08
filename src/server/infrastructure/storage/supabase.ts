import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import type { StorageProvider, StoredObject } from "./types";

/**
 * Supabase Storage backed provider.
 *
 * It uses the service role key, so it must only ever be constructed on the
 * server. Access control is enforced by the application services above it.
 */
export class SupabaseStorageProvider implements StorageProvider {
  readonly name = "supabase";
  private readonly client: SupabaseClient;

  constructor(
    url: string,
    serviceRoleKey: string,
    private readonly bucket: string,
  ) {
    this.client = createClient(url, serviceRoleKey, {
      auth: { persistSession: false, autoRefreshToken: false },
    });
  }

  async put(key: string, data: Buffer, contentType: string): Promise<StoredObject> {
    const { error } = await this.client.storage
      .from(this.bucket)
      .upload(key, data, { contentType, upsert: true });
    if (error) throw new Error(`Storage upload failed: ${error.message}`);
    return { key, contentType, sizeBytes: data.byteLength };
  }

  async get(key: string): Promise<Buffer> {
    const { data, error } = await this.client.storage.from(this.bucket).download(key);
    if (error || !data) throw new Error(`Storage download failed: ${error?.message ?? "not found"}`);
    return Buffer.from(await data.arrayBuffer());
  }

  async remove(key: string): Promise<void> {
    const { error } = await this.client.storage.from(this.bucket).remove([key]);
    if (error) throw new Error(`Storage delete failed: ${error.message}`);
  }

  async exists(key: string): Promise<boolean> {
    const separator = key.lastIndexOf("/");
    const folder = separator >= 0 ? key.slice(0, separator) : "";
    const name = separator >= 0 ? key.slice(separator + 1) : key;
    const { data, error } = await this.client.storage.from(this.bucket).list(folder, {
      search: name,
    });
    if (error) return false;
    return (data ?? []).some((entry) => entry.name === name);
  }
}
